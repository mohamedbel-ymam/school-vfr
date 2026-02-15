import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { labListExperiments } from "../../services/api/Experiments/labApi";

export default function LabCatalogPage() {
  const [loading, setLoading] = useState(true);
  const [pageData, setPageData] = useState(null);
  const [filters, setFilters] = useState({
    subject: "pc",
    level: "",
    search: "",
    page: 1,
  });

  async function load() {
    setLoading(true);
    try {
      const data = await labListExperiments({
        subject: filters.subject || undefined,
        level: filters.level || undefined,
        search: filters.search || undefined,
        page: filters.page || 1,
      });
      setPageData(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filters.page]);

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold">E-Lab — Physique & Chimie</h1>
      <p className="text-sm opacity-80 mt-1">
        Choisis une expérience, manipule la simulation, puis réponds au quiz (correction instantanée).
      </p>

      {/* Filters */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-2">
        <select
          className="border rounded p-2"
          value={filters.subject}
          onChange={(e) => setFilters((f) => ({ ...f, subject: e.target.value, page: 1 }))}
        >
          <option value="pc">Physique & Chimie</option>
          <option value="math">Math</option>
          <option value="bio_geo">Biologie & Géologie</option>
        </select>

        <select
          className="border rounded p-2"
          value={filters.level}
          onChange={(e) => setFilters((f) => ({ ...f, level: e.target.value, page: 1 }))}
        >
          <option value="">Tous niveaux</option>
          <option value="college">Collège</option>
          <option value="tronc_commun">Tronc Commun</option>
          <option value="bac1_sm">Bac1 SM</option>
          <option value="bac1_se">Bac1 SE</option>
        </select>

        <input
          className="border rounded p-2"
          placeholder="Rechercher (ex: ohm, dilution...)"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Enter") setFilters((f) => ({ ...f, page: 1 }));
          }}
        />

        <button
          className="border rounded p-2"
          onClick={() => setFilters((f) => ({ ...f, page: 1 }))}
        >
          Rechercher
        </button>
      </div>

      {/* List */}
      <div className="mt-4">
        {loading && <div>Chargement...</div>}

        {!loading && pageData?.data?.length === 0 && (
          <div className="opacity-80">Aucune expérience trouvée.</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {pageData?.data?.map((exp) => (
            <Link
              to={`/lab/${exp.slug}`}
              key={exp.id}
              className="border rounded-lg p-3 hover:shadow"
            >
              <div className="font-semibold">{exp.title}</div>
              <div className="text-xs opacity-70 mt-1">{exp.slug}</div>
              <div className="text-xs mt-2">
                Niveaux: {Array.isArray(exp.level_tags) ? exp.level_tags.join(", ") : "—"}
              </div>
              <div className="text-xs mt-1 opacity-80">
                Engine: {exp?.simulation?.engine || "—"}
              </div>
            </Link>
          ))}
        </div>

        {/* Pagination minimal */}
        {!loading && pageData && (
          <div className="flex gap-2 items-center justify-center mt-6">
            <button
              className="border rounded px-3 py-1"
              disabled={!pageData?.prev_page_url}
              onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, (f.page || 1) - 1) }))}
            >
              Précédent
            </button>
            <div className="text-sm">
              Page {pageData.current_page} / {pageData.last_page}
            </div>
            <button
              className="border rounded px-3 py-1"
              disabled={!pageData?.next_page_url}
              onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))}
            >
              Suivant
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
