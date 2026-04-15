<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Experiment;
use App\Models\ExperimentAttempt;
use App\Models\ExperimentAttemptAnswer;
use App\Models\ExperimentQuestion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LabAttemptController extends Controller
{
    // -----------------------
    // 1) Start attempt
    // -----------------------
    public function start(Request $request, Experiment $experiment)
    {
        if (!$experiment->is_public) {
            abort(403, "Expérience non publique.");
        }

        $token = bin2hex(random_bytes(32)); // 64 chars

        $attempt = ExperimentAttempt::create([
            'experiment_id' => $experiment->id,
            'user_id'       => Auth::id(), // null si public anonyme
            'public_token'  => Auth::id() ? null : $token, // token seulement si anonyme
            'mode'          => 'public',
            'started_at'    => now(),
            'state'         => [
                'progress' => ['section' => 'briefing'],
                'parameters' => [],
                'measurements' => [],
            ],
        ]);

        return response()->json([
            'attempt_id' => $attempt->id,
            // Pour anonyme: frontend doit stocker ce token
            'attempt_token' => $attempt->public_token,
        ], 201);
    }

    // -----------------------
    // 2) Get attempt (resume)
    // -----------------------
    public function show(Request $request, ExperimentAttempt $attempt)
    {
        $this->authorizeAttempt($request, $attempt);

        return $attempt->load([
            'experiment:id,slug,title,subject,briefing,synthese,simulation,runner_config',
            'experiment.questions:id,experiment_id,order,type,prompt,options,explanation,is_instant_feedback,tolerance',
        ]);
    }

    // -----------------------
    // 3) Save state (secure)
    // -----------------------
    public function updateState(Request $request, ExperimentAttempt $attempt)
    {
        $this->authorizeAttempt($request, $attempt);

        $data = $request->validate([
            'state' => ['required', 'array'],
        ]);

        // Anti-abus: limite de taille (50KB)
        $encoded = json_encode($data['state']);
        if ($encoded === false || strlen($encoded) > 50_000) {
            abort(422, "State trop volumineux.");
        }
	$attempt->loadMissing('experiment');
        // Validation structure minimale + whitelist par engine
        $this->validateStateByEngine($attempt->experiment->simulation ?? [], $data['state']);

        $attempt->state = $data['state'];
        $attempt->save();

        return response()->json(['ok' => true]);
    }

    // -----------------------
    // 4) Submit answer (instant correction)
    // -----------------------
    public function submitAnswer(Request $request, ExperimentAttempt $attempt)
    {
        $this->authorizeAttempt($request, $attempt);

        $payload = $request->validate([
            'question_id' => ['required', 'integer'],
            'user_answer' => ['nullable', 'array'],
        ]);

        $question = ExperimentQuestion::query()
            ->where('id', $payload['question_id'])
            ->where('experiment_id', $attempt->experiment_id)
            ->firstOrFail();

        $row = ExperimentAttemptAnswer::firstOrNew([
            'attempt_id'  => $attempt->id,
            'question_id' => $question->id,
        ]);

        // anti brute-force
        if ($row->exists && $row->tries >= 3) {
            abort(429, "Trop de tentatives sur cette question.");
        }

        $row->tries = $row->exists ? $row->tries + 1 : 1;
        $row->user_answer = $payload['user_answer'] ?? [];

        [$isCorrect, $feedback] = $this->grade($question, $row->user_answer);

        $row->is_correct = $isCorrect;
        $row->feedback = $feedback;
        $row->save();

        return response()->json([
            'is_correct' => $isCorrect,
            'feedback' => $feedback,
            'tries' => $row->tries,
            'explanation' => $question->is_instant_feedback ? $question->explanation : null,
        ]);
    }

    // =========================
    // SECURITY HELPERS
    // =========================

    private function authorizeAttempt(Request $request, ExperimentAttempt $attempt): void
    {
        // If attempt belongs to a user => must be same authenticated user
        if ($attempt->user_id !== null) {
            if (!Auth::check() || Auth::id() !== $attempt->user_id) {
                abort(403, "Accès refusé.");
            }
            return;
        }

        // Anonymous attempt => require token header
        $token = (string) $request->header('X-Attempt-Token', '');
        if ($token === '' || !hash_equals((string)$attempt->public_token, $token)) {
            abort(403, "Token de tentative invalide.");
        }
    }

    private function validateStateByEngine(array $simulation, array $state): void
    {
        $engine = $simulation['engine'] ?? null;

        // base structure
        if (!isset($state['progress']) || !is_array($state['progress'])) abort(422, "State invalide (progress).");
        if (!isset($state['parameters']) || !is_array($state['parameters'])) abort(422, "State invalide (parameters).");
        if (!isset($state['measurements']) || !is_array($state['measurements'])) abort(422, "State invalide (measurements).");

        // limits
        if (count($state['measurements']) > 40) abort(422, "Trop de mesures.");

        // Engine-specific whitelist (start with Ohm)
        if ($engine === 'ohm_law') {
            $allowed = ['R','U'];
            foreach ($state['parameters'] as $k => $v) {
                if (!in_array($k, $allowed, true)) abort(422, "Paramètre interdit: {$k}");
                if (!is_numeric($v)) abort(422, "Paramètre non numérique: {$k}");
            }

            foreach ($state['measurements'] as $row) {
                if (!is_array($row)) abort(422, "Mesure invalide.");
                if (!array_key_exists('U', $row) || !array_key_exists('I', $row)) abort(422, "Mesure doit contenir U et I.");
                if (!is_numeric($row['U']) || !is_numeric($row['I'])) abort(422, "U/I doivent être numériques.");
            }
        }

        // If engine not recognized yet => keep minimal validation only (safe)
    }

    // =========================
    // GRADING
    // =========================

    private function grade(ExperimentQuestion $q, array $userAnswer): array
    {
        if ($q->type === 'mcq') {
            $selected = $userAnswer['selectedIndex'] ?? null;
            $correct  = $q->answer['correctIndex'] ?? null;

            $ok = is_int($selected) && is_int($correct) && $selected === $correct;
            return [$ok, $ok ? "Bonne réponse ✅" : "Réponse incorrecte ❌. Réessaie."];
        }

        if ($q->type === 'numeric') {
            $val = $userAnswer['value'] ?? null;
            $expected = $q->answer['value'] ?? null;
            $tol = (float)($q->tolerance ?? 0);

            if (!is_numeric($val) || !is_numeric($expected)) {
                return [false, "Valeur invalide. Entre un nombre (ex: 2.5)."];
            }

            $ok = abs((float)$val - (float)$expected) <= $tol;
            return [$ok, $ok ? "Correct ✅" : "Pas tout à fait ❌. Indice: vérifie unités / arrondis."];
        }

        if ($q->type === 'short') {
            $text = mb_strtolower(trim((string)($userAnswer['text'] ?? '')));
            $keywords = array_map('mb_strtolower', $q->answer['keywords'] ?? []);

            if ($text === '' || empty($keywords)) {
                return [null, "Réponse enregistrée."];
            }

            $hits = 0;
            foreach ($keywords as $kw) {
                if ($kw !== '' && str_contains($text, $kw)) $hits++;
            }

            $ok = $hits >= max(1, (int)($q->answer['min_hits'] ?? 1));
            return [$ok, $ok ? "Bonne idée ✅" : "Incomplet ❌. Utilise les mots-clés du cours."];
        }

        return [null, "Réponse enregistrée."];
    }
}
