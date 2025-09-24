import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { axiosClient } from "../../api/axios";

// Degree dashboards
import College3emeDashboard from "./degrees/College3emeDashboard.jsx";
import TroncCommunDashboard from "./degrees/TroncCommunDashboard.jsx";
import Bac1SEDashboard      from "./degrees/Bac1SEDashboard.jsx";
import Bac1SMDashboard      from "./degrees/Bac1SMDashboard.jsx";
import Bac2Dashboard        from "./degrees/Bac2Dashboard.jsx";

/* ---------------- Canon + helpers ---------------- */

const CANON = new Set(["college-3eme", "tronc-commun", "bac1-se", "bac1-sm", "bac2"]);

const norm = (v) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const compact = (v) => norm(v).replace(/[^a-z0-9]/g, "");

function mapSynonymToCanon(s) {
  if (!s) return null;
  const n = norm(s);
  const c = compact(s);

  // direct canonical
  if (CANON.has(n)) return n;

  // Collège 3ème
  if (c.includes("college") || c.includes("colleg") || c.includes("troisieme") || n.includes("3eme") || n === "3e")
    return "college-3eme";

  // Tronc Commun
  if (n.includes("tronc") || n.includes("commun") || c === "tronccommun" || c === "tc")
    return "tronc-commun";

  // Bac 1 SE
  if ((n.includes("bac 1") || c.includes("bac1") || n.includes("premiere") || n.includes("1ere")) &&
      (n.includes("se") || n.includes("sciences experimentales") || c.includes("sciencesexperimentales")))
    return "bac1-se";

  // Bac 1 SM
  if ((n.includes("bac 1") || c.includes("bac1") || n.includes("premiere") || n.includes("1ere")) &&
      (n.includes("sm") || n.includes("math")))
    return "bac1-sm";

  // Bac 2
  if (n.includes("bac 2") || c.includes("bac2") || n.includes("terminale"))
    return "bac2";

  return null;
}

/* Try to find a degree hint in many shapes */
function resolveDegreeSlugFrom(anyObj) {
  if (!anyObj || typeof anyObj !== "object") return null;

  // 1) direct fields
  const direct =
    anyObj.degree_slug ??
    anyObj.degreeSlug ??
    anyObj.degree_code ??
    anyObj.degree_key ??
    anyObj.slug ??
    null;

  const directMapped = mapSynonymToCanon(direct);
  if (directMapped) return directMapped;

  // 2) nested degree object (common)
  const degObj = anyObj.degree ?? anyObj.current_degree ?? null;
  if (degObj) {
    const fromDeg =
      mapSynonymToCanon(degObj.slug) ||
      mapSynonymToCanon(degObj.code) ||
      mapSynonymToCanon(degObj.name) ||
      mapSynonymToCanon(degObj.label) ||
      mapSynonymToCanon(degObj.title);
    if (fromDeg) return fromDeg;
  }

  // 3) in known user subtrees
  const trees = [anyObj.student, anyObj.profile, anyObj.enrollment, anyObj.enrolment].filter(Boolean);
  for (const t of trees) {
    const s = resolveDegreeSlugFrom(t);
    if (s) return s;
  }

  // 4) arrays like enrollments/degrees (pick the most recent/first)
  for (const key of ["enrollments", "enrolments", "degrees"]) {
    const arr = anyObj[key];
    if (Array.isArray(arr) && arr.length) {
      for (const item of arr) {
        const s = resolveDegreeSlugFrom(item);
        if (s) return s;
      }
    }
  }

  // 5) last-resort: try degree_id if it exists (map if you have a known mapping)
  const id = anyObj.degree_id ?? anyObj.degreeId ?? anyObj?.degree?.id ?? null;
  if (id != null) {
    const idStr = String(id);
    return mapSynonymToCanon(idStr); // will match "bac2", "tc", etc if your IDs are named like that
  }

  return null;
}

function resolveDegreeSlug(user, profile) {
  return (
    resolveDegreeSlugFrom(user?.degree) ||
    resolveDegreeSlugFrom(user) ||
    resolveDegreeSlugFrom(profile?.degree) ||
    resolveDegreeSlugFrom(profile) ||
    null
  );
}

/* ---------------- Component ---------------- */

export default function StudentDashboard() {
  const { degree: routeToken } = useParams(); // optional :degree
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [profile, setProfile] = useState(null);
  const [pLoading, setPLoading] = useState(false);

  // If auth is loading
  if (loading) return <div className="p-4 text-center">Chargement…</div>;

  // Role check (defensive; layout should guard already)
  const hasStudentRole = Array.isArray(user?.roles)
    ? user.roles.includes("student")
    : user?.role === "student";

  if (!user || !hasStudentRole) {
    return <div className="p-4 text-center text-red-600">Non autorisé.</div>;
  }

  // 1st pass: try from auth user
  let allowedSlug = useMemo(() => resolveDegreeSlug(user, null), [user]);

  // If not found, fetch a richer profile once (common in APIs)
  useEffect(() => {
    let cancelled = false;
    async function fetchProfile() {
      if (allowedSlug) return; // nothing to do
      setPLoading(true);
      try {
        // Try a couple of common endpoints; first that succeeds wins
        const tryEndpoints = ["/user", "/me", "/student/me"];
        let data = null;

        for (const ep of tryEndpoints) {
          try {
            const r = await axiosClient.get(ep);
            data = r?.data?.data ?? r?.data ?? null;
            if (data) break;
          } catch {
            // keep trying next endpoint
          }
        }
        if (!cancelled) setProfile(data);
      } finally {
        if (!cancelled) setPLoading(false);
      }
    }
    fetchProfile();
    return () => { cancelled = true; };
  }, [allowedSlug]);

  // Recompute with profile (if we fetched one)
  allowedSlug = useMemo(() => resolveDegreeSlug(user, profile) ?? null, [user, profile]);

  // Still nothing? Tell the student (admin must attach a degree)
  if (!allowedSlug) {
    if (pLoading) return <div className="p-4 text-center">Chargement…</div>;
    return (
      <div className="p-6 text-center">
        <p className="font-semibold">Aucun niveau n’est encore associé à votre compte.</p>
        <p className="text-sm text-gray-500">Veuillez contacter l’administration.</p>
      </div>
    );
  }

  // Canonicalize URL once
  useEffect(() => {
    if (!routeToken || routeToken !== allowedSlug) {
      navigate(`/élève/tableau de bord/${encodeURIComponent(allowedSlug)}`, { replace: true });
    }
  }, [routeToken, allowedSlug, navigate]);

  if (routeToken !== allowedSlug) return null;

  // Render the matching degree dashboard
  switch (allowedSlug) {
    case "college-3eme": return <College3emeDashboard />;
    case "tronc-commun": return <TroncCommunDashboard />;
    case "bac1-se":      return <Bac1SEDashboard />;
    case "bac1-sm":      return <Bac1SMDashboard />;
    case "bac2":         return <Bac2Dashboard />;
    default:
      return <div className="text-center p-4">Degré inconnu.</div>;
  }
}
