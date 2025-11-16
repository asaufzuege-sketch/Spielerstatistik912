// Stats Table Module mit teamspezifischer Datenverwaltung
App.statsTable = {
  container: null,
  dragState: {
    isDragging: false,
    draggedRow: null,
    longPressTimer: null,
    startY: 0,
    currentY: 0,
    initialMouseY: 0,
    yOffset: 0,
    draggedElement: null
  },
  
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
    tbody.id = "stats-tbody";
    
    App.data.selectedPlayers.forEach((p, idx) => {
      const tr = document.createElement("tr");
      tr.className = (idx % 2 === 0 ? "even-row" : "odd-row");
      tr.dataset.player = p.name;
      tr.dataset.playerIndex = idx;
      
      // Nummer
      const numTd = document.createElement("td");
      numTd.innerHTML = `<strong>${App.helpers.escapeHtml(p.num || "-")}</strong>`;
      tr.appendChild(numTd);
      
      // Name (clickbar für Timer + Drag Handle)
      const nameTd = document.createElement("td");
      nameTd.style.cssText = "text-align:left;padding-left:12px;cursor:pointer;white-space:nowrap;position:relative;";
      nameTd.innerHTML = `<span class="drag-handle" style="color:#44bb91;margin-right:8px;cursor:grab;">⋮⋮</span><strong>${App.helpers.escapeHtml(p.name)}</strong>`;
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
      
      // Timer Toggle auf Name-Click (aber nicht auf drag handle)
      this.attachTimerToggle(nameTd, tr, timeTd, p.name);
      
      // Drag Handlers nur auf das Drag Handle
      const dragHandle = nameTd.querySelector('.drag-handle');
      this.attachDragHandlers(tr, dragHandle);
      
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
      
      // Teamspezifische Gegner-Schüsse aus LocalStorage wiederherstellen
      if (c === "Shot") {
        const teamId = App.teamSelection.getCurrentTeamInfo().id;
        const savedOppShots = localStorage.getItem(`opponentShots_${teamId}`);
        if (savedOppShots) {
          td.dataset.opp = savedOppShots;
        } else {
          td.dataset.opp = "0";
        }
      }
      
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
    
    // Timer visuals wiederherstellen
    App.updateTimerVisuals();
  },
  
  attachDragHandlers(row, dragHandle) {
    if (!dragHandle) return;
    
    let longPressTimer = null;
    let isDragging = false;
    let startY = 0;
    let hasMoved = false;
    
    const startDrag = (e) => {
      if (isDragging) return;
      
      const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
      startY = clientY;
      hasMoved = false;
      
      longPressTimer = setTimeout(() => {
        if (!hasMoved && !isDragging) {
          this.startDragging(row);
          isDragging = true;
          dragHandle.style.cursor = 'grabbing';
          
          // Haptic feedback
          if (navigator.vibrate) {
            navigator.vibrate(100);
          }
          
          console.log('Long press detected - drag started for:', row.dataset.player);
        }
      }, 600); // 600ms für Long Press
    };
    
    const moveDrag = (e) => {
      const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
      const deltaY = Math.abs(clientY - startY);
      
      if (deltaY > 10) {
        hasMoved = true;
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      }
      
      if (isDragging) {
        e.preventDefault();
        this.handleDragMove(clientY);
      }
    };
    
    const endDrag = (e) => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      
      if (isDragging) {
        this.endDragging();
        isDragging = false;
        dragHandle.style.cursor = 'grab';
      }
      
      hasMoved = false;
    };
    
    // Mouse events
    dragHandle.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', moveDrag);
    document.addEventListener('mouseup', endDrag);
    
    // Touch events
    dragHandle.addEventListener('touchstart', startDrag, { passive: false });
    document.addEventListener('touchmove', moveDrag, { passive: false });
    document.addEventListener('touchend', endDrag, { passive: false });
    dragHandle.addEventListener('touchcancel', endDrag, { passive: false });
  },
  
  startDragging(row) {
    this.dragState.isDragging = true;
    this.dragState.draggedRow = row;
    
    // Visual feedback
    row.style.backgroundColor = 'rgba(68, 187, 145, 0.3)';
    row.style.transform = 'scale(1.02)';
    row.style.zIndex = '1000';
    row.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
    row.style.transition = 'transform 0.2s ease';
    
    console.log('Dragging started for player:', row.dataset.player);
  },
  
  handleDragMove(clientY) {
    if (!this.dragState.isDragging) return;
    
    const tbody = document.getElementById('stats-tbody');
    if (!tbody) return;
    
    const rows = Array.from(tbody.children).filter(r => 
      !r.classList.contains('total-row') && r !== this.dragState.draggedRow
    );
    
    let targetRow = null;
    let targetIndex = -1;
    
    for (let i = 0; i < rows.length; i++) {
      const rect = rows[i].getBoundingClientRect();
      const rowCenter = rect.top + rect.height / 2;
      
      if (clientY < rowCenter) {
        targetRow = rows[i];
        targetIndex = i;
        break;
      }
    }
    
    if (targetRow) {
      tbody.insertBefore(this.dragState.draggedRow, targetRow);
    } else {
      // Insert at end (before total row)
      const totalRow = tbody.querySelector('.total-row');
      tbody.insertBefore(this.dragState.draggedRow, totalRow);
    }
  },
  
  endDragging() {
    if (!this.dragState.isDragging || !this.dragState.draggedRow) return;
    
    const row = this.dragState.draggedRow;
    
    // Remove visual feedback
    row.style.backgroundColor = '';
    row.style.transform = '';
    row.style.zIndex = '';
    row.style.boxShadow = '';
    row.style.transition = '';
    
    // Get new position
    const tbody = document.getElementById('stats-tbody');
    const allRows = Array.from(tbody.children);
    const newIndex = allRows.indexOf(row);
    const oldIndex = parseInt(row.dataset.playerIndex);
    
    // Update player order
    if (newIndex !== -1 && newIndex !== oldIndex) {
      this.updatePlayerOrder(oldIndex, newIndex);
    }
    
    // Reset state
    this.dragState.isDragging = false;
    this.dragState.draggedRow = null;
    
    console.log('Dragging ended');
  },
  
  updatePlayerOrder(oldIndex, newIndex) {
    if (oldIndex < 0 || oldIndex >= App.data.selectedPlayers.length) return;
    if (newIndex < 0 || newIndex >= App.data.selectedPlayers.length) return;
    
    // Move player in array
    const player = App.data.selectedPlayers.splice(oldIndex, 1)[0];
    App.data.selectedPlayers.splice(newIndex, 0, player);
    
    console.log(`Player "${player.name}" moved from position ${oldIndex} to ${newIndex}`);
    
    // Teamspezifisch speichern
    this.saveToStorage();
    
    // Re-render to update indices and alternating row colors
    this.render();
  },
  
  attachTimerToggle(nameTd, tr, timeTd, playerName) {
    nameTd.addEventListener("click", (e) => {
      // Ignore clicks on drag handle
      if (e.target.classList.contains('drag-handle')) return;
      
      // Prevent timer toggle during drag
      if (this.dragState.isDragging) return;
      
      if (App.data.activeTimers[playerName]) {
        // Timer stoppen
        clearInterval(App.data.activeTimers[playerName]);
        delete App.data.activeTimers[playerName];
        tr.style.background = "";
        nameTd.style.background = "";
        
        // Timer State teamspezifisch speichern
        this.saveActiveTimersState();
      } else {
        // Timer über App-Funktion starten (für Persistenz)
        App.startPlayerTimer(playerName);
        tr.style.background = "#005c2f";
        nameTd.style.background = "#005c2f";
        
        // Timer State teamspezifisch speichern
        this.saveActiveTimersState();
      }
    });
  },
  
  attachValueClickHandlers() {
    this.container.querySelectorAll("td[data-player][data-cat]").forEach(td => {
      let clickTimeout = null;
      
      // Single Click: +1
      td.addEventListener("click", (e) => {
        // Prevent value change during drag
        if (this.dragState.isDragging) {
          e.preventDefault();
          return;
        }
        
        if (clickTimeout) clearTimeout(clickTimeout);
        clickTimeout = setTimeout(() => {
          this.changeValue(td, 1);
          clickTimeout = null;
        }, 200);
      });
      
      // Double Click: -1
      td.addEventListener("dblclick", (e) => {
        e.preventDefault();
        
        // Prevent value change during drag
        if (this.dragState.isDragging) return;
        
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
    
    // Teamspezifisch speichern
    this.saveToStorage();
    
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
          
          // Gegner-Schüsse teamspezifisch in LocalStorage speichern
          const teamId = App.teamSelection.getCurrentTeamInfo().id;
          localStorage.setItem(`opponentShots_${teamId}`, tc.dataset.opp);
          
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
  
  // Funktion um Gegner-Schüsse für Export zu erhalten
  getOpponentShots() {
    const shotCell = document.querySelector('.total-cell[data-cat="Shot"]');
    return shotCell ? (Number(shotCell.dataset.opp) || 0) : 0;
  },
  
  // Funktion um Shot Total String für Export zu erhalten
  getShotTotalString() {
    const totals = {};
    App.data.categories.forEach(c => totals[c] = 0);
    
    App.data.selectedPlayers.forEach(p => {
      App.data.categories.forEach(c => {
        totals[c] += Number(App.data.statsData[p.name]?.[c] || 0);
      });
    });
    
    const own = totals["Shot"] || 0;
    const opp = this.getOpponentShots();
    return `${own} vs ${opp}`;
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
  
  // Teamspezifische Speicherfunktionen
  saveToStorage() {
    const teamId = App.teamSelection.getCurrentTeamInfo().id;
    localStorage.setItem(`selectedPlayers_${teamId}`, JSON.stringify(App.data.selectedPlayers));
    localStorage.setItem(`statsData_${teamId}`, JSON.stringify(App.data.statsData));
    localStorage.setItem(`playerTimes_${teamId}`, JSON.stringify(App.data.playerTimes));
  },
  
  saveActiveTimersState() {
    const teamId = App.teamSelection.getCurrentTeamInfo().id;
    const activeTimerPlayers = Object.keys(App.data.activeTimers);
    localStorage.setItem(`activeTimerPlayers_${teamId}`, JSON.stringify(activeTimerPlayers));
  },
  
  // Reset nur für aktuelles Team
  reset() {
    if (!App.teamSelection || !App.teamSelection.resetCurrentTeam()) {
      // Fallback für direkten Reset
      if (!confirm("Spieldaten zurücksetzen?")) return;
      
      App.data.statsData = {};
      App.data.playerTimes = {};
      
      // Timer stoppen und aus LocalStorage entfernen
      Object.values(App.data.activeTimers).forEach(timer => {
        if (timer) clearInterval(timer);
      });
      App.data.activeTimers = {};
      
      // Teamspezifisch löschen
      const teamId = App.teamSelection ? App.teamSelection.getCurrentTeamInfo().id : 'team1';
      localStorage.removeItem(`statsData_${teamId}`);
      localStorage.removeItem(`playerTimes_${teamId}`);
      localStorage.removeItem(`activeTimerPlayers_${teamId}`);
      localStorage.removeItem(`opponentShots_${teamId}`);
      
      this.render();
      alert("Spieldaten zurückgesetzt.");
    }
  }
};
