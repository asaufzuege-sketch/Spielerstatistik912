// CSV Import/Export Handler
App.csvHandler = {
  fileInput: null,
  
  init() {
    this.createFileInput();
    this.ensureImportButtons();
  },
  
  createFileInput() {
    this.fileInput = document.createElement("input");
    this.fileInput.type = "file";
    this.fileInput.accept = ".csv,text/csv";
    this.fileInput.style.display = "none";
    document.body.appendChild(this.fileInput);
    
    this.fileInput.addEventListener("change", () => {
      const file = this.fileInput.files?.[0];
      if (!file) return;
      
      const target = this.fileInput.dataset.target || "";
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const txt = String(e.target.result || "");
        if (target === "stats") this.importStats(txt);
        else if (target === "season") this.importSeason(txt);
        this.fileInput.value = "";
        delete this.fileInput.dataset.target;
      };
      
      reader.readAsText(file, "utf-8");
    });
  },
  
  ensureImportButtons() {
    // Stats Import Button
    const exportBtn = document.getElementById("exportBtn");
    const resetBtn = document.getElementById("resetBtn");
    
    if (exportBtn && resetBtn && !document.getElementById("importCsvStatsBtn")) {
      const btn = document.createElement("button");
      btn.id = "importCsvStatsBtn";
      btn.type = "button";
      btn.textContent = "Import CSV";
      btn.className = "top-btn import-csv-btn";
      btn.addEventListener("click", () => {
        this.fileInput.dataset.target = "stats";
        this.fileInput.click();
      });
      resetBtn.parentNode?.insertBefore(btn, resetBtn);
    }
    
    // Season Import Button - prüfe ob Button im HTML existiert
    const existingImportBtn = document.getElementById("importCsvSeasonBtn");
    if (existingImportBtn) {
      // Button existiert bereits im HTML, nur Event Listener hinzufügen
      existingImportBtn.addEventListener("click", () => {
        this.fileInput.dataset.target = "season";
        this.fileInput.click();
      });
    } else {
      // Fallback: Button dynamisch erstellen
      const exportSeasonBtn = document.getElementById("exportSeasonBtn");
      const resetSeasonBtn = document.getElementById("resetSeasonBtn");
      if (exportSeasonBtn && resetSeasonBtn) {
        const btn = document.createElement("button");
        btn.id = "importCsvSeasonBtn";
        btn.type = "button";
        btn.textContent = "Import CSV";
        btn.className = "top-btn import-csv-btn";
        btn.addEventListener("click", () => {
          this.fileInput.dataset.target = "season";
          this.fileInput.click();
        });
        resetSeasonBtn.parentNode?.insertBefore(btn, resetSeasonBtn);
      }
    }
  },
  
  importStats(txt) {
    try {
      const lines = App.helpers.splitCsvLines(txt);
      if (lines.length === 0) {
        alert("Leere CSV");
        return;
      }
      
      const header = App.helpers.parseCsvLine(lines[0]);
      const nameIdx = header.findIndex(h => /spieler/i.test(h) || h.toLowerCase() === "spieler");
      const timeIdx = header.findIndex(h => /time|zeit/i.test(h));
      
      const categoryIdxMap = {};
      App.data.categories.forEach(cat => {
        const idx = header.findIndex(h => h.toLowerCase() === cat.toLowerCase());
        if (idx !== -1) categoryIdxMap[cat] = idx;
      });
      
      for (let i = 1; i < lines.length; i++) {
        const cols = App.helpers.parseCsvLine(lines[i]);
        const name = (cols[nameIdx] || "").trim();
        if (!name) continue;
        
        if (!App.data.statsData[name]) App.data.statsData[name] = {};
        
        Object.keys(categoryIdxMap).forEach(cat => {
          App.data.statsData[name][cat] = Number(cols[categoryIdxMap[cat]] || 0) || 0;
        });
        
        if (timeIdx !== -1) {
          App.data.playerTimes[name] = App.helpers.parseTimeToSeconds(cols[timeIdx]);
        }
      }
      
      App.storage.saveStatsData();
      App.storage.savePlayerTimes();
      App.statsTable?.render();
      alert("Stats-CSV importiert.");
    } catch (e) {
      console.error("Import Stats CSV failed:", e);
      alert("Fehler beim Importieren (siehe Konsole).");
    }
  },
  
  importSeason(txt) {
    try {
      const lines = App.helpers.splitCsvLines(txt);
      if (lines.length === 0) {
        alert("Leere CSV");
        return;
      }
      
      const header = App.helpers.parseCsvLine(lines[0]);
      const idx = (key) => header.findIndex(h => new RegExp(key, "i").test(h));
      
      const idxNr = idx("^nr\\.?$|nr");
      const idxName = idx("spieler|player");
      const idxGames = idx("^games$|games");
      const idxGoals = idx("^goals$|goals");
      const idxAssists = idx("^assists$|assists");
      const idxPlusMinus = header.findIndex(h => /\+\/-|plus.?minus/i.test(h));
      const idxShots = idx("^shots$|shots");
      const idxPenalty = idx("penalty|penaltys");
      const idxFaceOffs = idx("faceoffs");
      const idxFaceOffsWon = header.findIndex(h => /faceoffs won|faceoffswon/i.test(h));
      const idxGoalValue = idx("goal value|gv");
      const idxTime = idx("time|zeit");
      
      const parseTimeLocal = (s) => {
        if (!s) return 0;
        s = String(s).trim();
        if (/^\d+:\d{2}$/.test(s)) {
          const [mm, ss] = s.split(":").map(Number);
          return mm * 60 + ss;
        }
        const n = Number(s.replace(/[^0-9.-]/g, ""));
        return isNaN(n) ? 0 : n;
      };
      
      for (let i = 1; i < lines.length; i++) {
        const cols = App.helpers.parseCsvLine(lines[i]);
        const name = (idxName !== -1 ? (cols[idxName] || "").trim() : "");
        if (!name) continue;
        
        const parsed = {
          num: idxNr !== -1 ? (cols[idxNr] || "").trim() : "",
          games: idxGames !== -1 ? (Number(cols[idxGames]) || 0) : 0,
          goals: idxGoals !== -1 ? (Number(cols[idxGoals]) || 0) : 0,
          assists: idxAssists !== -1 ? (Number(cols[idxAssists]) || 0) : 0,
          plusMinus: idxPlusMinus !== -1 ? (Number(cols[idxPlusMinus]) || 0) : 0,
          shots: idxShots !== -1 ? (Number(cols[idxShots]) || 0) : 0,
          penaltys: idxPenalty !== -1 ? (Number(cols[idxPenalty]) || 0) : 0,
          faceOffs: idxFaceOffs !== -1 ? (Number(cols[idxFaceOffs]) || 0) : 0,
          faceOffsWon: idxFaceOffsWon !== -1 ? (Number(cols[idxFaceOffsWon]) || 0) : 0,
          timeSeconds: idxTime !== -1 ? parseTimeLocal(cols[idxTime]) : 0,
          goalValue: idxGoalValue !== -1 ? (Number(cols[idxGoalValue]) || 0) : 0
        };
        
        if (!App.data.seasonData[name]) {
          App.data.seasonData[name] = {
            num: parsed.num || "",
            name,
            games: parsed.games || 0,
            goals: parsed.goals,
            assists: parsed.assists,
            plusMinus: parsed.plusMinus,
            shots: parsed.shots,
            penaltys: parsed.penaltys,
            faceOffs: parsed.faceOffs,
            faceOffsWon: parsed.faceOffsWon,
            timeSeconds: parsed.timeSeconds,
            goalValue: parsed.goalValue
          };
        } else {
          const existing = App.data.seasonData[name];
          existing.num = existing.num || parsed.num || "";
          existing.games += parsed.games || 0;
          existing.goals += parsed.goals;
          existing.assists += parsed.assists;
          existing.plusMinus += parsed.plusMinus;
          existing.shots += parsed.shots;
          existing.penaltys += parsed.penaltys;
          existing.faceOffs += parsed.faceOffs;
          existing.faceOffsWon += parsed.faceOffsWon;
          existing.timeSeconds += parsed.timeSeconds;
          existing.goalValue += parsed.goalValue;
        }
      }
      
      App.storage.saveSeasonData();
      App.seasonTable?.render();
      alert("Season-CSV importiert (additiv).");
    } catch (e) {
      console.error("Import Season CSV failed:", e);
      alert("Fehler beim Season-Import (siehe Konsole).");
    }
  },
  
  exportStats() {
    try {
      if (!App.data.selectedPlayers.length) {
        alert("Keine Spieler ausgewählt.");
        return;
      }
      
      const header = ["Nr", "Spieler", ...App.data.categories, "Time"];
      const rows = [header];
      
      App.data.selectedPlayers.forEach(p => {
        const row = [p.num || "", p.name];
        App.data.categories.forEach(cat => {
          row.push(String(Number(App.data.statsData[p.name]?.[cat] || 0)));
        });
        row.push(App.helpers.formatTimeMMSS(Number(App.data.playerTimes[p.name] || 0)));
        rows.push(row);
      });
      
      // Total Row
      const totals = {};
      App.data.categories.forEach(c => totals[c] = 0);
      let totalSeconds = 0;
      
      App.data.selectedPlayers.forEach(p => {
        App.data.categories.forEach(c => {
          totals[c] += Number(App.data.statsData[p.name]?.[c] || 0);
        });
        totalSeconds += App.data.playerTimes[p.name] || 0;
      });
      
      const totalRow = new Array(header.length).fill("");
      totalRow[1] = `Total (${App.data.selectedPlayers.length})`;
      App.data.categories.forEach((c, idx) => {
        const colIndex = 2 + idx;
        if (c === "+/-") {
          const vals = App.data.selectedPlayers.map(p => Number(App.data.statsData[p.name]?.[c] || 0));
          const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
          totalRow[colIndex] = `Ø ${avg}`;
        } else if (c === "FaceOffs Won") {
          const totalFace = totals["FaceOffs"] || 0;
          const percent = totalFace ? Math.round((totals["FaceOffs Won"] / totalFace) * 100) : 0;
          totalRow[colIndex] = `${totals["FaceOffs Won"]} (${percent}%)`;
        } else {
          totalRow[colIndex] = String(totals[c] || 0);
        }
      });
      totalRow[header.length - 1] = App.helpers.formatTimeMMSS(totalSeconds);
      rows.push(totalRow);
      
      // Timer Row
      const timerRow = new Array(header.length).fill("");
      timerRow[1] = "TIMER";
      timerRow[header.length - 1] = App.helpers.formatTimeMMSS(App.timer.seconds || 0);
      rows.push(timerRow);
      
      const csv = rows.map(r => r.join(";")).join("\n");
      this.downloadCSV(csv, "stats.csv");
      
    } catch (e) {
      console.error("Export Stats CSV failed:", e);
      alert("Fehler beim Exportieren.");
    }
  },
  
  downloadCSV(content, filename) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
};
