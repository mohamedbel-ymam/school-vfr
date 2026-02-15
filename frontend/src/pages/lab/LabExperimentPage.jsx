import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { labGetExperiment, labStartAttempt } from "../../services/api/Experiments/labApi";

export default function LabExperimentPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [exp, setExp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    labGetExperiment(slug)
      .then((data) => mounted && setExp(data))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [slug]);

  async function handleStart() {
    if (!exp?.id) return;
    setStarting(true);
    try {
      const { attempt_id } = await labStartAttempt(exp.id);
      navigate(`/lab/attempt/${attempt_id}`);
    } finally {
      setStarting(false);
    }
  }

  if (loading) return <div className="p-4">Chargement...</div>;
  if (!exp) return <div className="p-4">Expérience introuvable.</div>;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{exp.title}</h1>
          <div className="text-xs opacity-70 mt-1">{exp.slug}</div>
          <div className="text-xs mt-2 opacity-80">
            Niveaux: {Array.isArray(exp.level_tags) ? exp.level_tags.join(", ") : "—"}
          </div>
        </div>

        <button
          className="border rounded px-4 py-2"
          disabled={starting}
          onClick={handleStart}
        >
          {starting ? "Démarrage..." : "Commencer"}
        </button>
      </div>

      {/* Briefing */}
      <div className="mt-6 border rounded-lg p-4">
        <h2 className="font-semibold">Briefing</h2>
        <div className="mt-3">
          <div className="font-medium text-sm">Objectifs</div>
          <ul className="list-disc ml-5 text-sm">
            {(exp.briefing?.objectifs || []).map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </div>

        <div className="mt-3">
          <div className="font-medium text-sm">Pré-requis</div>
          <ul className="list-disc ml-5 text-sm">
            {(exp.briefing?.prerequis || []).map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </div>

        <div className="mt-3">
          <div className="font-medium text-sm">Consignes</div>
          <ul className="list-disc ml-5 text-sm">
            {(exp.briefing?.consignes || []).map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </div>
      </div>

      {/* Simulation meta */}
      <div className="mt-4 border rounded-lg p-4">
        <h2 className="font-semibold">Simulation</h2>
        <div className="text-sm mt-2">
          Type: <b>{exp?.simulation?.type}</b> — Engine: <b>{exp?.simulation?.engine}</b>
        </div>
        <div className="text-sm mt-2">
          Paramètres: {Object.keys(exp?.simulation?.parameters || {}).join(", ") || "—"}
        </div>
      </div>
    </div>
  );
}
