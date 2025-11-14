// Goal Value Modul - MIT SCROLLING aus Repo 909
App.goalValue = {
  container: null,
  clickTimers: {},
  
  init() {
    this.container = document.getElementById("goalValueContainer");
    
    document.getElementById("resetGoalValueBtn")?.addEventListener("click", () => {
      this.reset();
    });
  },
  
  getOpponents() {
    try {
      const raw = localStorage.getItem("goalValueOpponents");
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return Array.from({ length: 19 }, (_, i) => `Gegner ${i + 1}`);
  },
  
  setOpponents(arr) {
    localStorage.setItem("goalValueOpponents", JSON.stringify(arr));
  },
  
  getData() {
    try {
      const raw = localStorage.getItem("goalValueData");
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {};
  },
  
  setData(obj) {
    localStorage.setItem("goalValueData", JSON.stringify(obj));
  },
  
  getBottom() {
    try {
      const raw = localStorage.getItem("goalValueBottom");
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return this.getOpponents().map(() => 0);
  },
  
  setBottom(arr) {
    localStorage.setItem("goalValueBottom", JSON.stringify(arr));
  },
  
  computeValueForPlayer(name) {
    const data = this.getData();
    const bottom = this.getBottom();
    const vals = Array.isArray(data[name]) ? data[name] : [];
    return bottom.reduce((sum, w, i) => sum + (Number(vals[i] || 0) * Number(w || 0)), 0);
  },
  
  formatValueNumber(v) {
    return Math.abs(v - Math.round(v)) < 1e-4 ? String(Math.round(v)) : String(Number(v.toFixed(1)));
  },
  
  ensureDataForSeason() {
    const opponents = this.getOpponents();
    const all = this.getData();
    
    Object.keys(App.data.seasonData).forEach(name => {
      if (!all[name] || !Array.isArray(all[name])) {
        all[name] = opponents.map(() => 0);
      } else {
        while (all[name].length < opponents.length) all[name].push(0);
        if (all[name].length > opponents.length) all[name] = all[name].slice(0, opponents.length);
      }
    });
    
    this.setData(all);
  },
  
  render() {
    if (!this.container) return;
    
    this.container.innerHTML = "";
    
    const opponents = this.getOpponents();
    this.ensureDataForSeason();
    const gData = this.getData();
    const bottom = this.getBottom();
    
    const playersList = Object.keys(App.data.seasonData).length 
      ? Object.keys(App.data.seasonData).sort() 
      : App.data.selectedPlayers.map(p => p.name);
    
    const table = document.createElement("table");
    table.className = "goalvalue-table gv-no-patch";
    table.style.width = "auto";
    table.style.margin = "0";
    table.style.borderCollapse = "collapse";
    table.style.borderRadius = "8px";
    table.style.overflow = "hidden";
    table.style.tableLayout = "auto";
    
    // Header
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    
    const thPlayer = document.createElement("th");
    thPlayer.textContent = "Spieler";
    thPlayer.style.textAlign = "center";
    thPlayer.style.padding = "8px 6px";
    thPlayer.style.borderBottom = "2px solid #333";
    thPlayer.style.minWidth = "160px";
    thPlayer.style.whiteSpace = "nowrap";
    headerRow.appendChild(thPlayer);
    
    opponents.forEach((op, idx) => {
      const th = document.createElement("th");
      th.style.padding = "6px";
      th.style.borderBottom = "2px solid #333";
      th.style.textAlign = "center";
      const input = document.createElement("input");
      input.type = "text";
      input.value = op || `Gegner ${idx+1}`;
      input.className = "goalvalue-title-input";
      input.style.width = "100%";
      input.style.boxSizing = "border-box";
      input.style.textAlign = "center";
      input.addEventListener("change", () => {
        const arr = this.getOpponents();
        arr[idx] = input.value || `Gegner ${idx+1}`;
        this.setOpponents(arr);
        this.ensureDataForSeason();
        this.render();
      });
      th.appendChild(input);
      headerRow.appendChild(th);
    });
    
    const thValue = document.createElement("th");
    thValue.textContent = "Value";
    thValue.style.padding = "6px";
    thValue.style.borderBottom = "2px solid #333";
    thValue.style.textAlign = "center";
    headerRow.appendChild(thValue);
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Body
    const tbody = document.createElement("tbody");
    const valueCellMap = {};
    const colors = App.helpers.getColorStyles();
    
    playersList.forEach((name, rowIdx) => {
      const row = document.createElement("tr");
      row.className = (rowIdx % 2 === 0 ? "even-row" : "odd-row");
      row.style.borderBottom = "1px solid #333";
      
      const tdName = document.createElement("td");
      tdName.textContent = name;
      tdName.style.textAlign = "left";
      tdName.style.padding = "6px";
      tdName.style.fontWeight = "700";
      tdName.style.minWidth = "160px";
      tdName.style.whiteSpace = "nowrap";
      tdName.style.overflow = "visible";
      tdName.style.textOverflow = "clip";
      row.appendChild(tdName);
      
      const vals = (gData[name] && Array.isArray(gData[name])) ? gData[name].slice() : opponents.map(() => 0);
      while (vals.length < opponents.length) vals.push(0);
      
      opponents.forEach((_, i) => {
        const td = document.createElement("td");
        td.style.padding = "6px";
        td.style.textAlign = "center";
        td.style.cursor = "pointer";
        td.dataset.player = name;
        td.dataset.oppIdx = String(i);
        td.className = "gv-data-cell";
        
        const v = Number(vals[i] || 0);
        td.textContent = String(v);
        td.style.color = v > 0 ? colors.pos : v < 0 ? colors.neg : colors.zero;
        td.style.fontWeight = v !== 0 ? "700" : "400";
        
        td.addEventListener("click", (e) => {
          e.preventDefault();
          
          const cellId = `${name}-${i}`;
          const playerName = td.dataset.player;
          const oppIdx = Number(td.dataset.oppIdx);
          
          if (this.clickTimers[cellId]) {
            clearTimeout(this.clickTimers[cellId]);
            delete this.clickTimers[cellId];
            
            // DOPPELKLICK: -1
            const d = this.getData();
            if (!d[playerName]) d[playerName] = opponents.map(() => 0);
            d[playerName][oppIdx] = Math.max(0, Number(d[playerName][oppIdx] || 0) - 1);
            this.setData(d);
            
            const nv = d[playerName][oppIdx];
            td.textContent = String(nv);
            td.style.color = nv > 0 ? colors.pos : nv < 0 ? colors.neg : colors.zero;
            td.style.fontWeight = nv !== 0 ? "700" : "400";
            
            this.updateValueCell(playerName, valueCellMap);
            
          } else {
            this.clickTimers[cellId] = setTimeout(() => {
              delete this.clickTimers[cellId];
              
              // EINZELKLICK: +1
              const d = this.getData();
              if (!d[playerName]) d[playerName] = opponents.map(() => 0);
              d[playerName][oppIdx] = Number(d[playerName][oppIdx] || 0) + 1;
              this.setData(d);
              
              const nv = d[playerName][oppIdx];
              td.textContent = String(nv);
              td.style.color = nv > 0 ? colors.pos : nv < 0 ? colors.neg : colors.zero;
              td.style.fontWeight = nv !== 0 ? "700" : "400";
              
              this.updateValueCell(playerName, valueCellMap);
            }, 300);
          }
        });
        
        row.appendChild(td);
      });
      
      const valueTd = document.createElement("td");
      valueTd.style.padding = "6px";
      valueTd.style.textAlign = "center";
      const val = this.computeValueForPlayer(name);
      valueTd.textContent = this.formatValueNumber(val);
      valueTd.style.color = val > 0 ? colors.pos : val < 0 ? colors.neg : colors.zero;
      valueTd.style.fontWeight = val !== 0 ? "700" : "400";
      row.appendChild(valueTd);
      
      valueCellMap[name] = valueTd;
      tbody.appendChild(row);
    });
    
    // Bottom Scale Row
    const bottomRow = document.createElement("tr");
    bottomRow.className = (playersList.length % 2 === 0 ? "even-row" : "odd-row");
    bottomRow.style.background = "rgba(0,0,0,0.03)";
    
    const labelTd = document.createElement("td");
    labelTd.textContent = "";
    labelTd.style.padding = "6px";
    labelTd.style.fontWeight = "700";
    labelTd.style.textAlign = "center";
    bottomRow.appendChild(labelTd);
    
    const scaleOptions = [];
    for (let v = 0; v <= 10; v++) scaleOptions.push((v * 0.5).toFixed(1));
    
    const storedBottom = this.getBottom();
    while (storedBottom.length < opponents.length) storedBottom.push(0);
    if (storedBottom.length > opponents.length) storedBottom.length = opponents.length;
    this.setBottom(storedBottom);
    
    opponents.forEach((_, i) => {
      const td = document.createElement("td");
      td.style.padding = "6px";
      td.style.textAlign = "center";
      
      const select = document.createElement("select");
      select.className = "gv-scale-dropdown";
      select.style.width = "80px";
      
      scaleOptions.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
      });
      
      const b = this.getBottom();
      if (b && typeof b[i] !== "undefined") select.value = String(b[i]);
      
      select.addEventListener("change", () => {
        const arr = this.getBottom();
        arr[i] = Number(select.value);
        this.setBottom(arr);
        
        Object.keys(valueCellMap).forEach(pn => {
          this.updateValueCell(pn, valueCellMap);
        });
      });
      
      td.appendChild(select);
      bottomRow.appendChild(td);
    });
    
    const emptyTd = document.createElement("td");
    emptyTd.textContent = "";
    emptyTd.style.padding = "6px";
    bottomRow.appendChild(emptyTd);
    
    tbody.appendChild(bottomRow);
    table.appendChild(tbody);
    
    // KRITISCH: Wrap table in scroll wrapper (aus Repo 909)
    const wrapper = document.createElement('div');
    wrapper.className = 'table-scroll';
    wrapper.style.width = '100%';
    wrapper.style.boxSizing = 'border-box';
    wrapper.style.overflowX = 'auto';
    wrapper.style.overflowY = 'hidden';
    wrapper.style.WebkitOverflowScrolling = 'touch';
    wrapper.appendChild(table);
    
    this.container.appendChild(wrapper);
    
    console.log('Goal Value Table rendered with scroll wrapper');
  },
  
  updateValueCell(playerName, valueCellMap) {
    const vc = valueCellMap[playerName];
    if (!vc) return;
    
    const colors = App.helpers.getColorStyles();
    const val = this.computeValueForPlayer(playerName);
    vc.textContent = this.formatValueNumber(val);
    vc.style.color = val > 0 ? colors.pos : val < 0 ? colors.neg : colors.zero;
    vc.style.fontWeight = val !== 0 ? "700" : "400";
  },
  
  reset() {
    if (!confirm("Goal Value zurücksetzen?")) return;
    
    const opponents = this.getOpponents();
    const playersList = Object.keys(App.data.seasonData).length 
      ? Object.keys(App.data.seasonData) 
      : App.data.selectedPlayers.map(p => p.name);
    
    const newData = {};
    playersList.forEach(n => newData[n] = opponents.map(() => 0));
    this.setData(newData);
    this.setBottom(opponents.map(() => 0));
    
    this.render();
    alert("Goal Value zurückgesetzt.");
  }
};
