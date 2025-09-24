// src/utils/degreeSlug.js
export function degreeToSlug(d) {
  if (!d) return null; // <- guard

  const { id, name, slug, value } = d;

  // Prefer explicit slug/value if present
  if (slug)  return String(slug).toLowerCase();
  if (value) return String(value).toLowerCase();

  // Map by id (adjust to your ids)
  if (typeof id === "number") {
    const byId = { 1: "first", 2: "second", 3: "third", 4: "fourth", 5: "final" };
    if (byId[id]) return byId[id];
  }

  // Infer from name
  const n = (name || "").toLowerCase();
  if (n.includes("first"))   return "first";
  if (n.includes("second"))  return "second";
  if (n.includes("third"))   return "third";
  if (n.includes("fourth") || n.includes("forth")) return "fourth";
  if (n.includes("final") || n.includes("fifth") || n.includes("last")) return "final";

  return null; // <- no valid mapping
}
