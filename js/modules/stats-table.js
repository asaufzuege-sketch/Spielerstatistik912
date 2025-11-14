// Stats Table Modul
App.statsTable = {
  container: null,
  
  init() {
    this.container = document.getElementById("statsContainer");
    
    // Event Listener für Buttons
    document.getElementById("exportBtn")?.addEventListener("click", () => {
      App.csvHandler.exportStats();
    });
    
    document.getElementById("resetBtn")?.addEventListener("click", () => {
      this.reset();
    });
  },
  
  render() {
    if (!this.container) return;
    
    this.container.innerHTML = "";
    
    const table = document.createElement("table");
    table.className = "stats-table";
    
    // Header
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    headerRow.innerHTML = "<th>#</th><th>Spieler</th>" + 
      App.data.categories.map(c => `<th>${App.helpers.escapeHtml(c)}</th>`).join("") + 
      "<th>Time</th>";
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Body
    const tbody = document.createElement("tbody");
    
    App.data.selectedPlayers.forEach((p, idx) => {
      const tr = document.createElement("tr");
      tr.className = (idx % 2 === 0 ? "even-row" : "odd-row");
      tr.dataset.player = p.name;
      
      // Nummer
      const numTd = document.createElement("td");
      numTd.innerHTML = `<strong>${App.helpers.escapeHtml(p.num || "-")}</strong>`;
      tr.appendChild(numTd);
      
      // Name (clickbar für Timer)
      const nameTd = document.createElement("td");
      nameTd.style.cssText = "text-align:left;padding-left:12px;cursor:pointer;white-space:nowrap;";
      nameTd.innerHTML = `<strong>${App.helpers.escapeHtml(p.name)}</strong>`;
      tr.appendChild(nameTd);
      
      // Kategorien
      App.data.categories.forEach(c => {
        const td = document.createElement("td");
        const val = App.data.statsData[p.name]?.[c] || 0;
        const colors = App.helpers.getColorStyles();
        
        td.textContent = val;
        td.dataset.player = p.name;
        td.dataset.cat = c;
        td.style.color = val > 0 ? colors.pos : val < 0 ? colors.neg : colors.zero;
        tr.appendChild(td);
      });
      
      // Ice Time
      const timeTd = document.createElement("td");
      timeTd.className = "ice-time-cell";
      const sec = App.data.playerTimes[p.name] || 0;
      timeTd.textContent = App.helpers.formatTimeMMSS(sec);
      timeTd.dataset.player = p.name;
      tr.appendChild(timeTd);
      
      // Timer Toggle auf Name-Click
      this.attachTimerToggle(nameTd, tr, timeTd, p.name);
      
      tbody.appendChild(tr);
    });
    
    // Totals Row
    const totalTr = document.createElement("tr");
    totalTr.className = "total-row";
    
    const emptyTd = document.createElement("td");
    emptyTd.textContent = "";
    totalTr.appendChild(emptyTd);
    
    const labelTd = document.createElement("td");
    labelTd.textContent = `Total (${App.data.selectedPlayers.length})`;
    labelTd.style.textAlign = "left";
    labelTd.style.fontWeight = "700";
    totalTr.appendChild(labelTd);
    
    App.data.categories.forEach(c => {
      const td = document.createElement("td");
      td.className = "total-cell";
      td.dataset.cat = c;
      td.textContent = "0";
      totalTr.appendChild(td);
    });
    
    const timeTotal = document.createElement("td");
    timeTotal.className = "total-cell";
    timeTotal.dataset.cat = "Time";
    totalTr.appendChild(timeTotal);
    
    tbody.appendChild(totalTr);
    table.appendChild(tbody);
    this.container.appendChild(table);
    
    // Click handlers für Werte
    this.attachValueClickHandlers();
    
    // Update Totals & Colors
    this.updateTotals();
    this.updateIceTimeColors();
  },
  
  attachTimerToggle(nameTd, tr, timeTd, playerName) {
    nameTd.addEventListener("click", () => {
      if (App.data.activeTimers[playerName]) {
        // Timer stoppen
        clearInterval(App.data.activeTimers[playerName]);
        delete App.data.activeTimers[playerName];
        tr.style.background = "";
        nameTd.style.background = "";
      } else {
        // Timer starten
        App.data.activeTimers[playerName] = setInterval(() => {
          App.data.playerTimes[playerName] = (App.data.playerTimes[playerName] || 0) + 1;
          App.storage.savePlayerTimes();
          
          const sec = App.data.playerTimes[playerName];
          timeTd.textContent = App.helpers.formatTimeMMSS(sec);
          this.updateIceTimeColors();
        }, 1000);
        
        tr.style.background = "#005c2f";
        nameTd.style.background = "#005c2f";
      }
    });
  },
  
  attachValueClickHandlers() {
    this.container.querySelectorAll("td[data-player][data-cat]").forEach(td => {
      let clickTimeout = null;
      
      // Single Click: +1
      td.addEventListener("click", () => {
        if (clickTimeout) clearTimeout(clickTimeout);
        clickTimeout = setTimeout(() => {
          this.changeValue(td, 1);
          clickTimeout = null;
        }, 200);
      });
      
      // Double Click: -1
      td.addEventListener("dblclick", (e) => {
        e.preventDefault();
        if (clickTimeout) {
          clearTimeout(clickTimeout);
          clickTimeout = null;
        }
        this.changeValue(td, -1);
      });
    });
  },
  
  changeValue(td, delta) {
    const player = td.dataset.player;
    const cat = td.dataset.cat;
    
    if (!App.data.statsData[player]) {
      App.data.statsData[player] = {};
    }
    
    App.data.statsData[player][cat] = (App.data.statsData[player][cat] || 0) + delta;
    App.data.statsData[player][cat] = Math.trunc(App.data.statsData[player][cat]);
    
    App.storage.saveStatsData();
    
    td.textContent = App.data.statsData[player][cat];
    
    const val = App.data.statsData[player][cat];
    const colors = App.helpers.getColorStyles();
    td.style.color = val > 0 ? colors.pos : val < 0 ? colors.neg : colors.zero;
    
    this.updateTotals();
  },
  
  updateTotals() {
    const totals = {};
    App.data.categories.forEach(c => totals[c] = 0);
    let timeSum = 0;
    
    App.data.selectedPlayers.forEach(p => {
      App.data.categories.forEach(c => {
        totals[c] += Number(App.data.statsData[p.name]?.[c] || 0);
      });
      timeSum += App.data.playerTimes[p.name] || 0;
    });
    
    document.querySelectorAll(".total-cell").forEach(tc => {
      const cat = tc.dataset.cat;
      
      if (cat === "+/-") {
        const vals = App.data.selectedPlayers.map(p => Number(App.data.statsData[p.name]?.[cat] || 0));
        const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
        tc.textContent = `Ø ${avg}`;
        tc.style.color = "#ffffff";
      } else if (cat === "FaceOffs Won") {
        const totalFace = totals["FaceOffs"] || 0;
        const pct = totalFace ? Math.round((totals["FaceOffs Won"] / totalFace) * 100) : 0;
        const color = pct > 50 ? "#00ff80" : pct < 50 ? "#ff4c4c" : "#ffffff";
        tc.innerHTML = `<span style="color:white">${totals["FaceOffs Won"]}</span> (<span style="color:${color}">${pct}%</span>)`;
      } else if (cat === "Time") {
        tc.textContent = App.helpers.formatTimeMMSS(timeSum);
      } else if (cat === "Shot") {
        if (!tc.dataset.opp) tc.dataset.opp = "0";
        const own = totals["Shot"] || 0;
        const opp = Number(tc.dataset.opp) || 0;
        const ownC = own > opp ? "#00ff80" : opp > own ? "#ff4c4c" : "#ffffff";
        const oppC = opp > own ? "#00ff80" : own > opp ? "#ff4c4c" : "#ffffff";
        tc.innerHTML = `<span style="color:${ownC}">${own}</span> <span style="color:white">vs</span> <span style="color:${oppC}">${opp}</span>`;
        tc.onclick = () => {
          tc.dataset.opp = String(Number(tc.dataset.opp || 0) + 1);
          this.updateTotals();
        };
      } else {
        const val = totals[cat] || 0;
        const colors = App.helpers.getColorStyles();
        tc.textContent = val;
        tc.style.color = val > 0 ? colors.pos : val < 0 ? colors.neg : colors.zero;
      }
    });
  },
  
  updateIceTimeColors() {
    const list = App.data.selectedPlayers.map(p => ({
      name: p.name,
      seconds: App.data.playerTimes[p.name] || 0
    }));
    
    const top5 = new Set(list.slice().sort((a, b) => b.seconds - a.seconds).slice(0, 5).map(x => x.name));
    const bottom5 = new Set(list.slice().sort((a, b) => a.seconds - b.seconds).slice(0, 5).map(x => x.name));
    
    this.container?.querySelectorAll(".ice-time-cell").forEach(cell => {
      const nm = cell.dataset.player;
      if (top5.has(nm)) {
        cell.style.color = getComputedStyle(document.documentElement).getPropertyValue('--ice-top') || "#00c06f";
      } else if (bottom5.has(nm)) {
        cell.style.color = getComputedStyle(document.documentElement).getPropertyValue('--ice-bottom') || "#ff4c4c";
      } else {
        cell.style.color = getComputedStyle(document.documentElement).getPropertyValue('--cell-zero-color') || "#ffffff";
      }
    });
  },
  
  reset() {
    if (!confirm("Spieldaten zurücksetzen?")) return;
    
    App.data.statsData = {};
    App.data.playerTimes = {};
    localStorage.removeItem("statsData");
    localStorage.removeItem("playerTimes");
    
    this.render();
    alert("Spieldaten zurückgesetzt.");
  }
};
