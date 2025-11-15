// Stats Table Modul
App.statsTable = {
  container: null,
  dragState: {
    isDragging: false,
    draggedRow: null,
    longPressTimer: null,
    startY: 0,
    startX: 0,
    placeholder: null,
    originalIndex: -1,
    isLongPress: false
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
    tbody.id = "stats-tbody"; // ID für Drag & Drop
    
    App.data.selectedPlayers.forEach((p, idx) => {
      const tr = document.createElement("tr");
      tr.className = (idx % 2 === 0 ? "even-row" : "odd-row");
      tr.dataset.player = p.name;
      tr.dataset.playerIndex = idx;
      tr.draggable = false; // Standardmäßig nicht draggable
      
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
      
      // Drag & Drop Handler
      this.attachDragHandlers(tr);
      
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
  
  attachDragHandlers(tr) {
    // Mouse Events
    tr.addEventListener('mousedown', (e) => this.handleStart(e, tr));
    tr.addEventListener('mousemove', (e) => this.handleMove(e));
    tr.addEventListener('mouseup', (e) => this.handleEnd(e));
    tr.addEventListener('mouseleave', (e) => this.handleEnd(e));
    
    // Touch Events
    tr.addEventListener('touchstart', (e) => this.handleStart(e, tr), { passive: false });
    tr.addEventListener('touchmove', (e) => this.handleMove(e), { passive: false });
    tr.addEventListener('touchend', (e) => this.handleEnd(e), { passive: false });
    tr.addEventListener('touchcancel', (e) => this.handleEnd(e), { passive: false });
    
    // Drag Events
    tr.addEventListener('dragstart', (e) => this.handleDragStart(e));
    tr.addEventListener('dragover', (e) => this.handleDragOver(e));
    tr.addEventListener('drop', (e) => this.handleDrop(e));
    tr.addEventListener('dragend', (e) => this.handleDragEnd(e));
  },
  
  handleStart(e, tr) {
    // Nur wenn nicht schon dragging oder auf total-row
    if (this.dragState.isDragging || tr.classList.contains('total-row')) return;
    
    // Position für Long Press Detection
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    
    this.dragState.startX = clientX;
    this.dragState.startY = clientY;
    this.dragState.isLongPress = false;
    
    // Long Press Timer
    this.dragState.longPressTimer = setTimeout(() => {
      this.dragState.isLongPress = true;
      this.startDrag(tr);
    }, 800); // 800ms für Long Press
    
    // Event delegation für Cleanup
    this.dragState.draggedRow = tr;
  },
  
  handleMove(e) {
    if (!this.dragState.longPressTimer && !this.dragState.isDragging) return;
    
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    
    // Movement Detection - bei Bewegung Long Press abbrechen
    const moveThreshold = 10;
    const deltaX = Math.abs(clientX - this.dragState.startX);
    const deltaY = Math.abs(clientY - this.dragState.startY);
    
    if ((deltaX > moveThreshold || deltaY > moveThreshold) && this.dragState.longPressTimer) {
      clearTimeout(this.dragState.longPressTimer);
      this.dragState.longPressTimer = null;
    }
    
    // Dragging Logic
    if (this.dragState.isDragging && this.dragState.draggedRow) {
      e.preventDefault();
      
      const tbody = document.getElementById('stats-tbody');
      if (!tbody) return;
      
      // Find target row
      const rows = Array.from(tbody.children).filter(r => !r.classList.contains('total-row'));
      const targetRow = this.getTargetRow(rows, clientY);
      
      if (targetRow && targetRow !== this.dragState.draggedRow && targetRow !== this.dragState.placeholder) {
        const targetIndex = Array.from(tbody.children).indexOf(targetRow);
        const placeholderIndex = Array.from(tbody.children).indexOf(this.dragState.placeholder);
        
        if (targetIndex < placeholderIndex) {
          tbody.insertBefore(this.dragState.placeholder, targetRow);
        } else {
          tbody.insertBefore(this.dragState.placeholder, targetRow.nextSibling);
        }
      }
    }
  },
  
  handleEnd(e) {
    // Clear Long Press Timer
    if (this.dragState.longPressTimer) {
      clearTimeout(this.dragState.longPressTimer);
      this.dragState.longPressTimer = null;
    }
    
    // Finish Drag if dragging
    if (this.dragState.isDragging) {
      this.endDrag();
    }
    
    this.dragState.draggedRow = null;
  },
  
  startDrag(tr) {
    this.dragState.isDragging = true;
    this.dragState.draggedRow = tr;
    this.dragState.originalIndex = parseInt(tr.dataset.playerIndex);
    
    // Visual feedback
    tr.style.opacity = '0.5';
    tr.style.transform = 'scale(1.02)';
    tr.style.zIndex = '1000';
    tr.style.transition = 'transform 0.2s ease';
    tr.classList.add('dragging');
    
    // Create placeholder
    this.dragState.placeholder = tr.cloneNode(true);
    this.dragState.placeholder.style.opacity = '0.3';
    this.dragState.placeholder.style.backgroundColor = '#44bb91';
    this.dragState.placeholder.classList.add('drag-placeholder');
    this.dragState.placeholder.innerHTML = tr.innerHTML.replace(/./g, '&nbsp;'); // Empty content but keep structure
    
    // Insert placeholder
    tr.parentNode.insertBefore(this.dragState.placeholder, tr.nextSibling);
    
    // Enable HTML5 drag
    tr.draggable = true;
    
    // Haptic feedback (if supported)
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    console.log('Drag started for:', tr.dataset.player);
  },
  
  endDrag() {
    if (!this.dragState.isDragging || !this.dragState.draggedRow) return;
    
    const tr = this.dragState.draggedRow;
    const placeholder = this.dragState.placeholder;
    
    // Get new position
    const tbody = document.getElementById('stats-tbody');
    const newIndex = Array.from(tbody.children).indexOf(placeholder);
    
    // Restore visual state
    tr.style.opacity = '';
    tr.style.transform = '';
    tr.style.zIndex = '';
    tr.style.transition = '';
    tr.draggable = false;
    tr.classList.remove('dragging');
    
    // Replace placeholder with original row
    if (placeholder && placeholder.parentNode) {
      placeholder.parentNode.replaceChild(tr, placeholder);
    }
    
    // Update player order if position changed
    if (newIndex !== -1 && newIndex !== this.dragState.originalIndex) {
      this.updatePlayerOrder(this.dragState.originalIndex, newIndex);
    }
    
    // Reset state
    this.dragState.isDragging = false;
    this.dragState.draggedRow = null;
    this.dragState.placeholder = null;
    this.dragState.originalIndex = -1;
    
    console.log('Drag ended');
  },
  
  getTargetRow(rows, clientY) {
    return rows.find(row => {
      const rect = row.getBoundingClientRect();
      return clientY >= rect.top && clientY <= rect.bottom;
    });
  },
  
  updatePlayerOrder(oldIndex, newIndex) {
    // Adjust for total row
    const totalRowCount = 1;
    const realNewIndex = newIndex >= App.data.selectedPlayers.length ? App.data.selectedPlayers.length - 1 : newIndex;
    
    if (realNewIndex < 0 || realNewIndex >= App.data.selectedPlayers.length) return;
    
    // Move player in array
    const player = App.data.selectedPlayers.splice(oldIndex, 1)[0];
    App.data.selectedPlayers.splice(realNewIndex, 0, player);
    
    // Save to localStorage
    App.storage.saveSelectedPlayers();
    
    // Re-render table with new order
    this.render();
    
    console.log(`Player moved from ${oldIndex} to ${realNewIndex}`);
  },
  
  // HTML5 Drag & Drop handlers (backup)
  handleDragStart(e) {
    if (!this.dragState.isLongPress) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
  },
  
  handleDragOver(e) {
    if (this.dragState.isDragging) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  },
  
  handleDrop(e) {
    if (this.dragState.isDragging) {
      e.preventDefault();
    }
  },
  
  handleDragEnd(e) {
    this.endDrag();
  },
  
  attachTimerToggle(nameTd, tr, timeTd, playerName) {
    nameTd.addEventListener("click", (e) => {
      // Prevent timer toggle during drag
      if (this.dragState.isDragging || this.dragState.isLongPress) return;
      
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
      td.addEventListener("click", (e) => {
        // Prevent value change during drag
        if (this.dragState.isDragging || this.dragState.isLongPress) {
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
        if (this.dragState.isDragging || this.dragState.isLongPress) return;
        
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
