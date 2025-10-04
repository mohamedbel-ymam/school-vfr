// src/components/student/StudentDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { axiosClient } from "../../api/axios";
import { STUDENT_DASHBOARD_ROUTE } from "../../router/index.jsx";

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

  if (CANON.has(n)) return n;                         // direct canonical

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

function resolveDegreeSlugFrom(anyObj) {
  if (!anyObj || typeof anyObj !== "object") return null;

  // 1) direct fields
  const direct =
    anyObj.degree_slug ?? anyObj.degreeSlug ?? anyObj.degree_code ??
    anyObj.degree_key ?? anyObj.slug ?? null;
  const directMapped = mapSynonymToCanon(direct);
  if (directMapped) return directMapped;

  // 2) nested degree object
  const degObj = anyObj.degree ?? anyObj.current_degree ?? null;
  if (degObj) {
    const fromDeg =
      mapSynonymToCanon(degObj.slug)  ||
      mapSynonymToCanon(degObj.code)  ||
      mapSynonymToCanon(degObj.name)  ||
      mapSynonymToCanon(degObj.label) ||
      mapSynonymToCanon(degObj.title);
    if (fromDeg) return fromDeg;
  }

  // 3) user subtrees
  const trees = [anyObj.student, anyObj.profile, anyObj.enrollment, anyObj.enrolment].filter(Boolean);
  for (const t of trees) {
    const s = resolveDegreeSlugFrom(t);
    if (s) return s;
  }

  // 4) arrays like enrollments/degrees
  for (const key of ["enrollments", "enrolments", "degrees"]) {
    const arr = anyObj[key];
    if (Array.isArray(arr) && arr.length) {
      for (const item of arr) {
        const s = resolveDegreeSlugFrom(item);
        if (s) return s;
      }
    }
  }

  // 5) last resort: degree_id heuristics
  const id = anyObj.degree_id ?? anyObj.degreeId ?? anyObj?.degree?.id ?? null;
  if (id != null) return mapSynonymToCanon(String(id));

  return null;
}

function resolveDegreeSlug(user, profile) {
  return (
    resolveDegreeSlugFrom(user?.degree) ||
    resolveDegreeSlugFrom(user)         ||
    resolveDegreeSlugFrom(profile?.degree) ||
    resolveDegreeSlugFrom(profile)      ||
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

  if (loading) return <div className="p-4 text-center">Chargement…</div>;

  // defensive role check (layout should guard already)
  const hasStudentRole = Array.isArray(user?.roles)
    ? user.roles.includes("student")
    : user?.role === "student";

  if (!user || !hasStudentRole) {
    return <div className="p-4 text-center text-red-600">Non autorisé.</div>;
  }

  // Compute allowedSlug (user first, then profile when available)
  const allowedSlug = useMemo(() => resolveDegreeSlug(user, profile) ?? null, [user, profile]);

  // If we don't have a slug yet, try to fetch a richer profile ONCE
  useEffect(() => {
    let cancelled = false;
    if (allowedSlug) return; // already know

    (async () => {
      setPLoading(true);
      try {
        const tryEndpoints = ["/user", "/me", "/student/me"];
        for (const ep of tryEndpoints) {
          try {
            const r = await axiosClient.get(ep);
            const data = r?.data?.data ?? r?.data ?? null;
            if (data) {
              if (!cancelled) setProfile(data);
              break;
            }
          } catch {
            // keep trying
          }
        }
      } finally {
        if (!cancelled) setPLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [allowedSlug]);

  // Still nothing? Inform the student instead of blank page
  if (!allowedSlug) {
    if (pLoading) return <div className="p-4 text-center">Chargement…</div>;
    return (
      <div className="p-6 text-center">
        <p className="font-semibold">Aucun niveau n’est encore associé à votre compte.</p>
        <p className="text-sm text-gray-500">Veuillez contacter l’administration.</p>
      </div>
    );
  }

  // Canonicalize URL once we know the slug (prevents /…/null)
  useEffect(() => {
    const target = `${STUDENT_DASHBOARD_ROUTE}/${encodeURIComponent(allowedSlug)}`;
    if (!routeToken || routeToken !== allowedSlug) {
      navigate(target, { replace: true });
    }
  }, [routeToken, allowedSlug, navigate]);

  // While the router catches up, render nothing (no flicker)
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
