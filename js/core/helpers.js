// Helper-Funktionen
App.helpers = {
  escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, c => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":"&#39;"
    })[c]);
  },
  
  formatTimeMMSS(sec) {
    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  },
  
  parseTimeToSeconds(str) {
    if (!str) return 0;
    const parts = str.split(":");
    if (parts.length >= 2) {
      const mm = Number(parts[0]) || 0;
      const ss = Number(parts[1]) || 0;
      return mm * 60 + ss;
    }
    return Number(str) || 0;
  },
  
  splitCsvLines(text) {
    return text.split(/\r?\n/).map(r => r.trim()).filter(r => r.length > 0);
  },
  
  parseCsvLine(line) {
    return line.split(";").map(s => s.trim());
  },
  
  parseForSort(val) {
    if (val === null || val === undefined) return "";
    const v = String(val).trim();
    if (v === "") return "";
    if (/^\d{1,2}:\d{2}$/.test(v)) {
      const [mm, ss] = v.split(":").map(Number);
      return mm * 60 + ss;
    }
    if (/%$/.test(v)) {
      return Number(v.replace("%", "")) || 0;
    }
    const n = Number(v.toString().replace(/[^0-9.-]/g, ""));
    if (!isNaN(n) && v.match(/[0-9]/)) return n;
    return v.toLowerCase();
  },
  
  getColorStyles() {
    return {
      pos: getComputedStyle(document.documentElement).getPropertyValue('--cell-pos-color')?.trim() || "#00ff80",
      neg: getComputedStyle(document.documentElement).getPropertyValue('--cell-neg-color')?.trim() || "#ff4c4c",
      zero: getComputedStyle(document.documentElement).getPropertyValue('--cell-zero-color')?.trim() || "#ffffff",
      headerBg: getComputedStyle(document.documentElement).getPropertyValue('--header-bg') || "#1E1E1E",
      headerText: getComputedStyle(document.documentElement).getPropertyValue('--text-color') || "#fff"
    };
  }
};
