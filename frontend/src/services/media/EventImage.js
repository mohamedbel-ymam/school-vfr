// src/services/media/EventImage.js
/**
 * Tiny theming by template name -> colors & emoji
 */
const THEMES = {
  default: { a: "#4f46e5", b: "#22c55e", emoji: "📅" },
  exam:    { a: "#e11d48", b: "#f59e0b", emoji: "📝" },
  sport:   { a: "#16a34a", b: "#0ea5e9", emoji: "🏆" },
  trip:    { a: "#0ea5e9", b: "#8b5cf6", emoji: "🚌" },
  alert:   { a: "#dc2626", b: "#f97316", emoji: "⚠️" },
};

const W = 1200, H = 630, PAD = 64;

function pickTheme(template) {
  if (!template) return THEMES.default;
  const key = String(template).toLowerCase();
  return THEMES[key] || THEMES.default;
}

function wrapText(ctx, text, maxWidth, lineHeight) {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    const m = ctx.measureText(test).width;
    if (m > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4); // limit lines
}

function formatDateTime(s) {
  try {
    const d = new Date(s);
    return d.toLocaleString();
  } catch { return ""; }
}

function keyOf(ev) {
  const u = ev.updated_at || ev.updatedAt || ev.starts_at || "";
  return `event_img_${ev.id}_${u}`;
}

/**
 * Generate a PNG dataURL for an event
 * @param {Object} ev {id,title,starts_at,location,template,description}
 * @param {Object} opts {force?:boolean}
 * @returns {Promise<string>} dataURL
 */
export async function renderEventImage(ev, opts = {}) {
  if (!ev?.id) return null;

  // localStorage cache
  const cacheKey = keyOf(ev);
  if (!opts.force && typeof window !== "undefined") {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;
  }

  const cnv = document.createElement("canvas");
  cnv.width = W; cnv.height = H;
  const ctx = cnv.getContext("2d");

  const theme = pickTheme(ev.template);

  // Background gradient
  const grd = ctx.createLinearGradient(0, 0, W, H);
  grd.addColorStop(0, theme.a);
  grd.addColorStop(1, theme.b);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  // soft glass card
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  const radius = 32;
  roundRect(ctx, PAD, PAD, W - PAD * 2, H - PAD * 2, radius);
  ctx.fill();

  // Emoji badge
  ctx.font = "bold 96px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fillText(theme.emoji, PAD + 24, PAD + 16);

  const innerX = PAD + 24 + 120;
  const innerW = W - innerX - PAD;

  // Title
  ctx.font = "700 58px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillStyle = "#ffffff";
  const titleLines = wrapText(ctx, ev.title || "Événement", innerW, 64);
  titleLines.forEach((line, i) => {
    ctx.fillText(line, innerX, PAD + 12 + i * 64);
  });

  // Date/location
  ctx.font = "500 30px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  const when = formatDateTime(ev.starts_at);
  if (when) ctx.fillText("📅 " + when, innerX, PAD + 12 + titleLines.length * 64 + 24);
  if (ev.location) ctx.fillText("📍 " + ev.location, innerX, PAD + 12 + titleLines.length * 64 + 24 + 44);

  // Footer (template)
  ctx.font = "600 26px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  const tmpl = String(ev.template || "default").toUpperCase();
  ctx.fillText(`TEMPLATE: ${tmpl}`, innerX, H - PAD - 40);

  const dataUrl = cnv.toDataURL("image/png");
  if (typeof window !== "undefined") {
    try { localStorage.setItem(cacheKey, dataUrl); } catch {}
  }
  return dataUrl;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
