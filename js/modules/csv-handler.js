// CSV Export/Import Handler mit teamspezifischer Datenspeicherung
App.csvHandler = {
  fileInput: null,
  
  init() {
    this.createFileInput();
    this.createImportButtons();
  },
  
  createFileInput() {
    this.fileInput = document.createElement("input");
    this.fileInput.type = "file";
    this.fileInput.accept = ".csv";
    this.fileInput.style.display = "none";
    document.body.appendChild(this.fileInput);
    
    this.fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const target = this.fileInput.dataset.target;
        if (target === "stats") {
          this.importStats(file);
        } else if (target === "season") {
          this.importSeason(file);
        }
      }
      this.fileInput.value = "";
    });
  },
  
  createImportButtons() {
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
    }
  },
  
  // Aktuelle Team-ID ermitteln
  getCurrentTeamId() {
    return App.data.currentTeam || "team1";
  },
  
  // Teamspezifische Storage Keys
  getTeamStorageKey(key) {
    return `${key}_${this.getCurrentTeamId()}`;
  },
  
  // Verbesserte Export-Funktion mit korrekter Tabellenformatierung
  exportStats() {
    const data = [];
    
    // Header exakt wie in der Season-Tabelle
    const headers = ["#", "Spieler", ...App.data.categories, "Time"];
    data.push(headers);
    
    // Spieler Daten - exakte Formatierung wie in der Tabelle
    App.data.selectedPlayers.forEach(player => {
      const row = [
        player.num || "",
        player.name,
        ...App.data.categories.map(cat => {
          const value = App.data.statsData[player.name]?.[cat] || 0;
          return value;
        }),
        App.helpers.formatTimeMMSS(App.data.playerTimes[player.name] || 0)
      ];
      data.push(row);
    });
    
    // Totals Row - exakt wie in der Tabelle berechnet
    const totals = ["", `Total (${App.data.selectedPlayers.length})`];
    
    App.data.categories.forEach(cat => {
      if (cat === "+/-") {
        // Durchschnitt berechnen
        const vals = App.data.selectedPlayers.map(p => Number(App.data.statsData[p.name]?.[cat] || 0));
        const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
        totals.push(`Ø ${avg}`);
      } else if (cat === "FaceOffs Won") {
        // FaceOff Prozentsatz
        const totalFace = App.data.selectedPlayers.reduce((sum, p) => sum + (App.data.statsData[p.name]?.["FaceOffs"] || 0), 0);
        const totalWon = App.data.selectedPlayers.reduce((sum, p) => sum + (App.data.statsData[p.name]?.["FaceOffs Won"] || 0), 0);
        const pct = totalFace ? Math.round((totalWon / totalFace) * 100) : 0;
        totals.push(`${totalWon} (${pct}%)`);
      } else if (cat === "Shot") {
        // Shot vs Opponent
        const own = App.data.selectedPlayers.reduce((sum, p) => sum + (App.data.statsData[p.name]?.["Shot"] || 0), 0);
        const opp = this.getOpponentShots();
        totals.push(`${own} vs ${opp}`);
      } else {
        // Standard Summe
        const total = App.data.selectedPlayers.reduce((sum, p) => sum + (App.data.statsData[p.name]?.[cat] || 0), 0);
        totals.push(total);
      }
    });
    
    // Time Total
    const totalTime = App.data.selectedPlayers.reduce((sum, p) => sum + (App.data.playerTimes[p.name] || 0), 0);
    totals.push(App.helpers.formatTimeMMSS(totalTime));
    
    data.push(totals);
    
    // Teamspezifischer Filename
    const teamId = this.getCurrentTeamId();
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const filename = `game_data_${teamId}_${timestamp}.csv`;
    
    this.downloadCSV(data, filename);
  },
  
  exportSeason() {
    const data = [];
    
    // Header exakt wie Season-Tabelle
    const headers = ["#", "Spieler", ...App.data.categories, "MVP Points"];
    data.push(headers);
    
    App.data.selectedPlayers.forEach(player => {
      const seasonStats = App.data.seasonData[player.name] || {};
      const mvpPoints = this.calculateMVPPoints(seasonStats);
      
      const row = [
        player.num || "",
        player.name,
        ...App.data.categories.map(cat => seasonStats[cat] || 0),
        mvpPoints
      ];
      data.push(row);
    });
    
    // Season Totals
    const totals = ["", `Total (${App.data.selectedPlayers.length})`];
    App.data.categories.forEach(cat => {
      const total = App.data.selectedPlayers.reduce((sum, p) => {
        return sum + ((App.data.seasonData[p.name] || {})[cat] || 0);
      }, 0);
      totals.push(total);
    });
    
    const totalMVP = App.data.selectedPlayers.reduce((sum, p) => {
      const seasonStats = App.data.seasonData[p.name] || {};
      return sum + this.calculateMVPPoints(seasonStats);
    }, 0);
    totals.push(totalMVP);
    
    data.push(totals);
    
    // Teamspezifischer Filename
    const teamId = this.getCurrentTeamId();
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const filename = `season_data_${teamId}_${timestamp}.csv`;
    
    this.downloadCSV(data, filename);
  },
  
  getOpponentShots() {
    const shotCell = document.querySelector('.total-cell[data-cat="Shot"]');
    return shotCell ? (Number(shotCell.dataset.opp) || 0) : 0;
  },
  
  calculateMVPPoints(stats) {
    const weights = {
      "Goal": 3,
      "Assist": 2,
      "Shot": 0.1,
      "+/-": 1,
      "FaceOffs Won": 0.1,
      "Hit": 0.1,
      "Blocked Shot": 0.2,
      "Takeaway": 0.3,
      "Giveaway": -0.2,
      "Penalty": -0.5
    };
    
    return Math.round(
      Object.keys(weights).reduce((total, cat) => {
        return total + (stats[cat] || 0) * weights[cat];
      }, 0)
    );
  },
  
  // Korrigierte CSV Download mit sauberer Tabellenformatierung (Tab-getrennt für beste Excel-Darstellung)
  downloadCSV(data, filename) {
    // BOM für UTF-8 Erkennung in Excel
    const BOM = '\uFEFF';
    
    // TSV (Tab-Separated Values) für beste Excel-Formatierung mit Zentrierung
    const csvLines = data.map(row => {
      return row.map(cell => {
        let cellValue = String(cell || "");
        
        // Escape Anführungszeichen
        if (cellValue.includes('"')) {
          cellValue = cellValue.replace(/"/g, '""');
        }
        
        // Setze in Anführungszeichen wenn Sonderzeichen enthalten (außer Tab)
        if (cellValue.includes('\t') || cellValue.includes('"') || 
            cellValue.includes('\n') || cellValue.includes('\r')) {
          cellValue = `"${cellValue}"`;
        }
        
        return cellValue;
      }).join('\t'); // Tab als Trenner für optimale Excel-Formatierung
    });
    
    // CSV Content erstellen
    const csvContent = BOM + csvLines.join('\r\n');
    
    // Blob erstellen und Download
    const blob = new Blob([csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    
    console.log('CSV Export completed:', filename);
  },
  
  importStats(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split(/\r?\n/).filter(line => line.trim());
        
        if (lines.length < 2) {
          alert("CSV Datei ist leer oder ungültig.");
          return;
        }
        
        const headers = this.parseCSVLine(lines[0]);
        const expectedHeaders = ["#", "Spieler", ...App.data.categories, "Time"];
        
        // Header Validation
        let isValidFormat = true;
        for (let i = 0; i < Math.min(headers.length, expectedHeaders.length); i++) {
          if (headers[i].trim() !== expectedHeaders[i]) {
            isValidFormat = false;
            break;
          }
        }
        
        if (!isValidFormat) {
          alert("CSV Format ist ungültig. Erwartete Spalten: " + expectedHeaders.join(", "));
          return;
        }
        
        // Import Data - teamspezifisch
        const newStatsData = {};
        const newPlayerTimes = {};
        const newSelectedPlayers = [];
        
        for (let i = 1; i < lines.length; i++) {
          const row = this.parseCSVLine(lines[i]);
          if (row.length < headers.length) continue;
          
          const num = row[0] === "-" ? "" : row[0].trim();
          const name = row[1].trim();
          
          if (!name || name.toLowerCase().includes("total")) continue;
          
          newSelectedPlayers.push({ name, num });
          newStatsData[name] = {};
          
          App.data.categories.forEach((cat, idx) => {
            newStatsData[name][cat] = parseInt(row[idx + 2]) || 0;
          });
          
          const timeStr = row[row.length - 1];
          newPlayerTimes[name] = this.parseTimeToSeconds(timeStr);
        }
        
        // Teamspezifisch speichern
        App.data.selectedPlayers = newSelectedPlayers;
        App.data.statsData = newStatsData;
        App.data.playerTimes = newPlayerTimes;
        
        App.storage.saveAll();
        App.statsTable.render();
        
        alert(`Import erfolgreich! ${newSelectedPlayers.length} Spieler importiert.`);
        
      } catch (error) {
        console.error("Import Error:", error);
        alert("Fehler beim Importieren: " + error.message);
      }
    };
    
    reader.readAsText(file);
  },
  
  importSeason(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split(/\r?\n/).filter(line => line.trim());
        
        if (lines.length < 2) {
          alert("CSV Datei ist leer oder ungültig.");
          return;
        }
        
        const headers = this.parseCSVLine(lines[0]);
        const newSeasonData = {};
        
        for (let i = 1; i < lines.length; i++) {
          const row = this.parseCSVLine(lines[i]);
          if (row.length < headers.length) continue;
          
          const name = row[1].trim();
          if (!name || name.toLowerCase().includes("total")) continue;
          
          newSeasonData[name] = {};
          App.data.categories.forEach((cat, idx) => {
            if (idx + 2 < row.length) {
              newSeasonData[name][cat] = parseInt(row[idx + 2]) || 0;
            }
          });
        }
        
        // Teamspezifisch speichern
        App.data.seasonData = newSeasonData;
        App.storage.saveSeasonData();
        
        if (App.seasonTable) {
          App.seasonTable.render();
        }
        
        alert("Season Import erfolgreich!");
        
      } catch (error) {
        console.error("Season Import Error:", error);
        alert("Fehler beim Season Import: " + error.message);
      }
    };
    
    reader.readAsText(file);
  },
  
  parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;
    let i = 0;
    
    // BOM entfernen
    if (line.charCodeAt(0) === 0xFEFF) {
      line = line.slice(1);
    }
    
    while (i < line.length) {
      const char = line[i];
      
      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
      i++;
    }
    
    result.push(current);
    return result;
  },
  
  parseTimeToSeconds(timeStr) {
    if (!timeStr) return 0;
    
    const parts = timeStr.split(":");
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      return minutes * 60 + seconds;
    }
    
    return 0;
  }
};
