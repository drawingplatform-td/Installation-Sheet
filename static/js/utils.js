export function formatFileSize(bytes) {
  if (!bytes) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/'/g, "&#39;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function getSeverityLabel(severity) {
  const labelMap = {
    "ต่ำ": "Low",
    "กลาง": "Medium",
    "สูง": "High",
  };
  return labelMap[severity] || severity || "-";
}

export function getSeverityBadge(severity) {
  const safeSeverity = escapeHtml(getSeverityLabel(severity));
  const styleMap = {
    "ต่ำ": "bg-emerald-100 text-emerald-700 border border-emerald-200",
    "กลาง": "bg-amber-100 text-amber-700 border border-amber-200",
    "สูง": "bg-rose-100 text-rose-700 border border-rose-200",
  };

  return `<span class="inline-flex rounded-full px-2 py-1 text-xs font-bold ${
    styleMap[severity] || "bg-slate-100 text-slate-600 border border-slate-200"
  }">${safeSeverity}</span>`;
}

export function severityRank(severity) {
  const rankMap = {
    "ต่ำ": 1,
    "กลาง": 2,
    "สูง": 3,
  };
  return rankMap[severity] || 0;
}

export function normalizeUrlList(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseImageLinks(linksString) {
  try {
    const parsed = JSON.parse(linksString);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return normalizeUrlList(linksString);
  }
}
