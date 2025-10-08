<?php

// app/Http/Controllers/HomeworkController.php
namespace App\Http\Controllers;

use App\Models\Homework;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use App\Notifications\HomeworkAssigned;
use Carbon\Carbon;

class HomeworkController extends Controller
{
    /** Convert "YYYY-MM-DDTHH:MM" -> "YYYY-MM-DD HH:MM:SS" for reliable validation */
    private function normalizeDate(?string $v): ?string
    {
        if ($v === null || $v === '') return $v;
        $v = trim($v);
        if (preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/', $v)) {
            return str_replace('T', ' ', $v) . ':00';
        }
        return $v;
    }

    // ... adminIndex/teacherIndex/studentIndex/parentIndex unchanged ...

    public function store(Request $r)
    {
        // normalize before validating
        $r->merge([
            'due_at' => $this->normalizeDate($r->input('due_at')),
        ]);

        $data = $r->validate([
            'title'       => ['required','string','max:200'],
            'description' => ['nullable','string'],
            'degree_id'   => ['required','integer','exists:degrees,id'],
            'due_at'      => ['nullable','date'],
            'file'        => ['required','file','max:51200'], // 50MB
        ]);

        $t = $r->user();

        try {
            // store file
            $file = $r->file('file');
            $path = $file->store("homeworks/{$data['degree_id']}/".date('Y/m'), 'public');

            // subject is optional; guard relation existence
            $subject = method_exists($t, 'subject') ? $t->subject : null;

            $hw = Homework::create([
                'title'         => $data['title'],
                'description'   => $data['description'] ?? null,
                'due_at'        => $data['due_at'] ? Carbon::parse($data['due_at']) : null,
                'file_path'     => $path,
                'original_name' => $file->getClientOriginalName(),
                'mime_type'     => $file->getClientMimeType(),
                'size'          => $file->getSize(),
                'teacher_id'    => $t->id,
                'teacher_name'  => trim("{$t->firstname} {$t->lastname}"),
                'subject_id'    => $subject?->id,
                'subject_name'  => $subject?->name,
                'degree_id'     => (int)$data['degree_id'],
            ]);

            // notify admins (best-effort)
            try {
                $admins = User::where('role','admin')->get();
                foreach ($admins as $admin) {
                    $admin->notify(new HomeworkAssigned([
                        'title'   => 'Nouveau devoir',
                        'message' => "{$hw->teacher_name} a donné « {$hw->title} »"
                                   .($hw->due_at ? " (échéance: ".$hw->due_at->format('Y-m-d H:i').")" : "")
                                   ." pour le niveau sélectionné.",
                        'meta'    => [
                            'homework_id' => $hw->id,
                            'degree_id'   => $hw->degree_id,
                            'subject'     => $hw->subject_name,
                            'teacher'     => $hw->teacher_name,
                            'due_at'      => $hw->due_at?->toIso8601String(),
                        ],
                    ]));
                }
            } catch (\Throwable $e) {
                Log::warning('Homework admin notifications failed', ['error' => $e->getMessage()]);
            }

            // notify students (best-effort, chunked)
            try {
                User::where('role', 'student')
                    ->where('degree_id', $hw->degree_id)
                    ->orderBy('id')
                    ->chunkById(200, function ($students) use ($hw) {
                        foreach ($students as $student) {
                            $student->notify(new HomeworkAssigned([
                                'title'   => 'Nouveau devoir',
                                'message' => "{$hw->teacher_name} a donné « {$hw->title} »"
                                            .($hw->subject_name ? " (".$hw->subject_name.")" : "")
                                            .($hw->due_at ? " · Échéance: ".$hw->due_at->format('Y-m-d H:i') : "")
                                            ." pour votre niveau.",
                                'meta'    => [
                                    'homework_id' => $hw->id,
                                    'degree_id'   => $hw->degree_id,
                                    'subject'     => $hw->subject_name,
                                    'teacher'     => $hw->teacher_name,
                                    'due_at'      => $hw->due_at?->toIso8601String(),
                                    'file_url'    => $hw->file_url,
                                ],
                            ]));
                        }
                    });
            } catch (\Throwable $e) {
                Log::warning('Homework student notifications failed', ['error' => $e->getMessage()]);
            }

            return response()->json(['data' => $hw], 201);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['message' => 'Upload failed.'], 500);
        }
    }

    // Delete — admin or owner teacher
    public function destroy(Request $r, Homework $homework)
    {
        $user = $r->user();
        if (!($user->role === 'admin' || $user->id === $homework->teacher_id)) {
            abort(403);
        }

        Storage::disk('public')->delete($homework->file_path);
        $homework->delete();

        return response()->json(['message' => 'Devoir supprimé']);
    }
}
