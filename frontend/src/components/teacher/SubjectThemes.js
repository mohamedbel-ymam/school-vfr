// src/components/teacher/subjectThemes.js

// ---------- Thèmes visuels par matière ----------
export const SUBJECT_THEMES = {
  math: {
    key: "math",
    label: "Mathématiques",
    from: "from-sky-500/25",
    to: "to-indigo-500/10",
    ring: "ring-sky-400/30",
    chip: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200",
    motifs: ["×", "π", "∑", "√", "≈", "∞", "f(x)"],
  },

  // Physique & Chimie (ou Physique seule / Chimie seule)
  physchem: {
    key: "physchem",
    label: "Physique & Chimie",
    from: "from-amber-500/25",
    to: "to-rose-500/10",
    ring: "ring-amber-400/30",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
    motifs: ["Δ", "λ", "Ω", "→", "H₂O", "NaCl", "e⁻"],
  },

  // Biologie & Géologie (SVT)
  biogeo: {
    key: "biogeo",
    label: "Science de la vie & terre",
    from: "from-emerald-500/25",
    to: "to-cyan-500/10",
    ring: "ring-emerald-400/30",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
    motifs: ["A", "A=T", "G", "C", "ADN","🧬","🌋"],
  },

  french: {
    key: "french",
    label: "Français",
    from: "from-blue-500/25",
    to: "to-slate-500/10",
    ring: "ring-blue-400/30",
    chip: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
    motifs: ["é", "è", "à", "œ", "ç", "Ê"],
  },

  english: {
    key: "english",
    label: "Anglais",
    from: "from-indigo-500/25",
    to: "to-sky-500/10",
    ring: "ring-indigo-400/30",
    chip: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200",
    motifs: ["A", "B", "C", "?", "!", ";"],
  },

  // Histoire & Géographie
  histgeo: {
    key: "histgeo",
    label: "Histoire & Géographie",
    from: "from-orange-500/25",
    to: "to-yellow-500/10",
    ring: "ring-orange-400/30",
    chip: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200",
    motifs: ["⌛", "✎", "△", "المغرب","🗺️", "📍" ,"الحماية"],
  },

  islamic: {
    key: "islamic",
    label: "Études islamiques",
    from: "from-teal-500/25",
    to: "to-emerald-500/10",
    ring: "ring-teal-400/30",
    chip: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-200",
    motifs: ["ا", "ب", "ت", "ث", "حديث", "📖", "فقه","۞","☪︎",],
  },

  arabic: {
    key: "arabic",
    label: "Arabe",
    from: "from-cyan-500/25",
    to: "to-emerald-500/10",
    ring: "ring-cyan-400/30",
    chip: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200",
    motifs: ["ا","الشعر", "ت", "فعل", "ج", "النحو"],
  },

  // (Bonus) Informatique
  cs: {
    key: "cs",
    label: "Informatique",
    from: "from-fuchsia-500/25",
    to: "to-purple-500/10",
    ring: "ring-fuchsia-400/30",
    chip: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-200",
    motifs: ["{ }", "< />", "0", "1", "SQL", "λ"],
  },

  default: {
    key: "default",
    label: "Matière",
    from: "from-slate-500/20",
    to: "to-slate-800/10",
    ring: "ring-slate-400/30",
    chip: "bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200",
    motifs: ["●", "▲", "◆", "■", "✦", "✧"],
  },
};

// ---------- Helpers de normalisation ----------
const normalize = (s) =>
  (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();

const normCode = (c) => (c || "").toString().toUpperCase().replace(/[^A-Z]/g, "");

// ---------- Mapping d'abord par CODE (solide face aux variantes de nom) ----------
const CODE_TO_KEY = {
  // Seeder:
  // MATH, PC, SVT, ANG, HIS-GEO, ARAB, Educ-Isl, FR, INFO
  MATH: "math",
  PC: "physchem",
  SVT: "biogeo",
  ANG: "english",
  HISGEO: "histgeo",      // "HIS-GEO" -> "HISGEO" après normalisation
  ARAB: "arabic",
  EDUCISL: "islamic",     // "Educ-Isl" -> "EDUCISL"
  FR: "french",
  INFO: "cs",
};

// ---------- Déduction par NOM (tolérant aux fautes/séparateurs) ----------
export function guessSubjectKey(name, code) {
  // 1) Prefer the backend code (from your seeder)
  const byCode = CODE_TO_KEY[normCode(code)];
  if (byCode) return byCode;

  // 2) Fallback to name heuristics (very tolerant, includes your exact seeder strings)
  const s = normalize(name)
    .replace(/[-_/]+/g, " ")      // "Histoire-Geographie" -> "Histoire Geographie"
    .replace(/\s+/g, " ")         // collapse spaces
    .trim();

  // --- Combined teachers ---
  // Physique & Chimie
  if (/(physique|physics|phys)\s*(et|&)?\s*(chimie|chem)/.test(s) ||
      /(chimie|chem)\s*(et|&)?\s*(physique|physics|phys)/.test(s) ||
      /\bpc\b/.test(s)) {
    return "physchem";
  }

  // Biologie & Géologie (SVT) — super tolerant, including your "Sciene de la vie et terre"
  // Accepts: "svt", "s.v.t", "science(s) de la vie et (de la) terre", typos like "sciene"
  if (/\bs\.?v\.?t\.?\b/.test(s) ||
      /(scien[a-z]*)\s+(de|d)?\s*(la|l)?\s*vie\s*(et|&)\s*(de|d)?\s*(la|l)?\s*terre/.test(s) ||
      /(biologie|biology|bio).*(geologie|geology|geolog)/.test(s) ||
      /(geologie|geology|geolog).*(biologie|biology|bio)/.test(s)) {
    return "biogeo";
  }

  // Histoire & Géographie (HG)
  if (/(histoire|history).*(geographie|geography|geo)/.test(s) ||
      /(geographie|geography|geo).*(histoire|history)/.test(s) ||
      /\bhg\b/.test(s)) {
    return "histgeo";
  }

  // --- Single subjects ---
  if (/math/.test(s)) return "math";
  if (/physique|physics|phys\b/.test(s)) return "physchem";
  if (/chimie|chem/.test(s)) return "physchem";
  if (/biologie|biology|bio\b/.test(s)) return "biogeo";
  if (/geologie|geology|geolog/.test(s)) return "biogeo";
  if (/(francais|français|french|^fr\b)/.test(s)) return "french";
  if (/(anglais|english)/.test(s)) return "english";
  if (/(islam|etudes islamiques|education islamique|islamic)/.test(s)) return "islamic";
  if (/(arabe|arabic)/.test(s)) return "arabic";
  if (/(informatique|computer|coding|programmation|^info\b|cs\b)/.test(s)) return "cs";

  return "default";
}