// src/constants/degrees.js
export const DEGREES = [
  { label: "3ème année collège", slug: "college-3eme", order: 1 },
  { label: "Tronc Commun",       slug: "tronc-commun", order: 2 },
  { label: "1er année Bac (SE)", slug: "bac1-se",      order: 3 },
  { label: "1er année Bac (SM)", slug: "bac1-sm",      order: 4 },
  { label: "2ème année Bac",     slug: "bac2",         order: 5 },
];

export const DEGREE_ROUTE_BY_SLUG = {
  "college-3eme": "/etudiant/college-3eme",
  "tronc-commun": "/etudiant/tronc-commun",
  "bac1-se":      "/etudiant/bac1-se",
  "bac1-sm":      "/etudiant/bac1-sm",
  "bac2":         "/etudiant/bac2",
};
