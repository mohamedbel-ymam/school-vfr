import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { labGetAttempt, labSaveState, labSubmitAnswer } from "../../services/api/Experiments/labApi";

export default function LabAttemptPage() {
  const { attemptId } = useParams();
  const id = Number(attemptId);

  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(null);

  // local state (editable)
  const [state, setState] = useState({
    progress: { section: "simulation" },
    parameters: {},
    measurements: [],
  });

  const savingRef = useRef(false);
  const dirtyRef = useRef(false);

  // Load attempt
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    labGetAttempt(id)
      .then((data) => {
        if (!mounted) return;
        setAttempt(data);
        const st = data?.state || state;
        setState({
          progress: st.progress || { section: "simulation" },
          parameters: st.parameters || {},
          measurements: st.measurements || [],
        });
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
    // eslint-disable-next-line
  }, [id]);

  const exp = attempt?.experiment;

  // Init default parameters if empty
  useEffect(() => {
    if (!exp?.simulation?.parameters) return;
    if (Object.keys(state.parameters || {}).length > 0) return;

    const defaults = {};
    for (const [k, cfg] of Object.entries(exp.simulation.parameters)) {
      defaults[k] = cfg?.default ?? 0;
    }
    setState((s) => ({ ...s, parameters: defaults }));
    dirtyRef.current = true;
    // eslint-disable-next-line
  }, [exp?.id]);

  // Autosave every 8 seconds if dirty
  useEffect(() => {
    const timer = setInterval(async () => {
      if (!dirtyRef.current) return;
      if (savingRef.current) return;
      savingRef.current = true;
      try {
        await labSaveState(id, state);
        dirtyRef.current = false;
      } catch (e) {
        // handle 429 or 403
      } finally {
        savingRef.current = false;
      }
    }, 8000);

    return () => clearInterval(timer);
  }, [id, state]);

  function updateParam(key, value) {
    setState((s) => ({
      ...s,
      parameters: { ...(s.parameters || {}), [key]: value },
    }));
    dirtyRef.current = true;
  }

  function addMeasurementRow() {
    setState((s) => ({
      ...s,
      measurements: [...(s.measurements || []), { U: "", I: "" }],
    }));
    dirtyRef.current = true;
  }

  function updateMeasurementRow(index, field, value) {
    setState((s) => {
      const rows = [...(s.measurements || [])];
      rows[index] = { ...rows[index], [field]: value };
      return { ...s, measurements: rows };
    });
    dirtyRef.current = true;
  }

  const questions = useMemo(() => exp?.questions || [], [exp?.questions]);

  // Quiz local feedback
  const [quizFeedback, setQuizFeedback] = useState({}); // questionId -> result

  async function answerMCQ(questionId, selectedIndex) {
    const res = await labSubmitAnswer(id, questionId, { selectedIndex });
    setQuizFeedback((m) => ({ ...m, [questionId]: res }));
  }

  async function answerNumeric(questionId, value) {
    const res = await labSubmitAnswer(id, questionId, { value: Number(value) });
    setQuizFeedback((m) => ({ ...m, [questionId]: res }));
  }

  async function answerShort(questionId, text) {
    const res = await labSubmitAnswer(id, questionId, { text });
    setQuizFeedback((m) => ({ ...m, [questionId]: res }));
  }

  if (loading) return <div className="p-4">Chargement...</div>;
  if (!attempt) return <div className="p-4">Tentative introuvable / accès refusé.</div>;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-xl font-bold">{exp?.title}</h1>
      <div className="text-xs opacity-70">Attempt #{attempt.id}</div>

      {/* Briefing quick */}
      <div className="mt-4 border rounded-lg p-4">
        <div className="font-semibold">Briefing</div>
        <ul className="list-disc ml-5 text-sm mt-2">
          {(exp?.briefing?.objectifs || []).map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </div>

      {/* Simulation (V1 UI minimal) */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border rounded-lg p-4">
          <div className="font-semibold">Paramètres</div>

          <div className="mt-3 space-y-3">
            {Object.entries(exp?.simulation?.parameters || {}).map(([key, cfg]) => (
              <div key={key}>
                <div className="text-sm font-medium">
                  {key} : <span className="opacity-80">{state.parameters?.[key]}</span> {cfg?.unit || ""}
                </div>
                <input
                  className="w-full"
                  type="range"
                  min={cfg.min}
                  max={cfg.max}
                  step={cfg.step}
                  value={state.parameters?.[key] ?? cfg.default ?? 0}
                  onChange={(e) => updateParam(key, Number(e.target.value))}
                />
              </div>
            ))}
          </div>

          {/* Tasks */}
          <div className="mt-4">
            <div className="font-semibold text-sm">Missions</div>
            <ul className="list-disc ml-5 text-sm mt-2">
              {(exp?.simulation?.tasks || []).map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="font-semibold">Tableau de mesures</div>
          <button className="border rounded px-3 py-1 text-sm mt-2" onClick={addMeasurementRow}>
            + Ajouter une mesure
          </button>

          <div className="mt-3 space-y-2">
            {(state.measurements || []).map((row, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-2">
                <input
                  className="border rounded p-2"
                  placeholder="U (V)"
                  value={row.U}
                  onChange={(e) => updateMeasurementRow(idx, "U", e.target.value)}
                />
                <input
                  className="border rounded p-2"
                  placeholder="I (A)"
                  value={row.I}
                  onChange={(e) => updateMeasurementRow(idx, "I", e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="text-xs opacity-70 mt-3">
            Auto-sauvegarde toutes les 8 secondes.
          </div>
        </div>
      </div>

      {/* Synthèse */}
      <div className="mt-4 border rounded-lg p-4">
        <div className="font-semibold">Synthèse</div>
        <ul className="list-disc ml-5 text-sm mt-2">
          {(exp?.synthese?.a_retenir || []).map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </div>

      {/* Quiz */}
      <div className="mt-4 border rounded-lg p-4">
        <div className="font-semibold">Questions (correction instantanée)</div>

        <div className="mt-3 space-y-4">
          {questions.map((q) => {
            const fb = quizFeedback[q.id];

            return (
              <div key={q.id} className="border rounded p-3">
                <div className="text-sm font-medium">{q.order}. {q.prompt}</div>

                {q.type === "mcq" && (
                  <div className="mt-2 space-y-2">
                    {(q.options || []).map((opt, idx) => (
                      <button
                        key={idx}
                        className="block w-full text-left border rounded p-2"
                        onClick={() => answerMCQ(q.id, idx)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {q.type === "numeric" && (
                  <div className="mt-2 flex gap-2">
                    <input className="border rounded p-2 w-40" placeholder="Valeur" type="number"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") answerNumeric(q.id, e.currentTarget.value);
                      }}
                    />
                    <button className="border rounded px-3" onClick={(e) => {
                      const input = e.currentTarget.parentElement.querySelector("input");
                      answerNumeric(q.id, input.value);
                    }}>
                      Valider
                    </button>
                  </div>
                )}

                {q.type === "short" && (
                  <div className="mt-2">
                    <textarea className="border rounded p-2 w-full" rows={2} placeholder="Ta réponse..."
                      onBlur={(e) => answerShort(q.id, e.target.value)}
                    />
                    <div className="text-xs opacity-70 mt-1">Astuce: la correction automatique est limitée.</div>
                  </div>
                )}

                {fb && (
                  <div className="mt-3 text-sm">
                    <div><b>Résultat:</b> {fb.is_correct === true ? "✅ Correct" : fb.is_correct === false ? "❌ Faux" : "📝 Enregistré"}</div>
                    {fb.feedback && <div className="opacity-90">{fb.feedback}</div>}
                    {fb.explanation && <div className="opacity-80 mt-1"><i>{fb.explanation}</i></div>}
                    {typeof fb.tries !== "undefined" && <div className="text-xs opacity-70 mt-1">Tentatives: {fb.tries}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
