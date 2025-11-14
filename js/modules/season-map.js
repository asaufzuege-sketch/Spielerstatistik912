// Season Map Modul
App.seasonMap = {
  timeTrackingBox: null,
  
  init() {
    this.timeTrackingBox = document.getElementById("seasonMapTimeTrackingBox");
    
    // Event Listeners
    document.getElementById("exportSeasonMapBtn")?.addEventListener("click", () => {
      this.exportFromGoalMap();
    });
    
    document.getElementById("resetSeasonMapBtn")?.addEventListener("click", () => {
      this.reset();
    });
    
    // Time Tracking (Read-Only)
    this.initTimeTracking();
  },
  
  render() {
    const boxes = Array.from(document.querySelectorAll(App.selectors.seasonMapBoxes));
    boxes.forEach(box => box.querySelectorAll(".marker-dot").forEach(d => d.remove()));
    
    // Bild-Eigenschaften von Goal Map übernehmen
    try {
      const torBoxes = Array.from(document.querySelectorAll(App.selectors.torbildBoxes));
      boxes.forEach((seasonBox, idx) => {
        const seasonImg = seasonBox.querySelector('img');
        const torBox = torBoxes[idx];
        
        if (seasonImg && torBox) {
          const torImg = torBox.querySelector('img');
          if (torImg) {
            try {
              const torCS = getComputedStyle(torImg);
              const torObjectFit = torCS.getPropertyValue('object-fit') || 'contain';
              seasonImg.style.objectFit = torObjectFit;
              
              const torRect = torImg.getBoundingClientRect();
              if (torRect && torRect.width && torRect.height) {
                seasonImg.style.width = `${Math.round(torRect.width)}px`;
                seasonImg.style.height = `${Math.round(torRect.height)}px`;
                seasonBox.style.width = `${Math.round(torRect.width)}px`;
                seasonBox.style.height = `${Math.round(torRect.height)}px`;
                seasonBox.style.overflow = 'hidden';
              }
            } catch (e) {
              seasonImg.style.objectFit = 'contain';
            }
          }
        }
      });
    } catch (e) {
      console.warn("Layout copy failed:", e);
    }
    
    // Marker laden
    const raw = localStorage.getItem("seasonMapMarkers");
    if (raw) {
      try {
        const allMarkers = JSON.parse(raw);
        allMarkers.forEach((markersForBox, idx) => {
          const box = boxes[idx];
          if (!box || !Array.isArray(markersForBox)) return;
          
          markersForBox.forEach(m => {
            App.markerHandler.createMarkerPercent(m.xPct, m.yPct, m.color || "#444", box, false);
          });
        });
      } catch (e) {
        console.warn("Invalid seasonMapMarkers", e);
      }
    }
    
    // Time Data laden
    const rawTime = localStorage.getItem("seasonMapTimeData");
    if (rawTime) {
      try {
        const tdata = JSON.parse(rawTime);
        this.writeTimeTrackingToBox(tdata);
      } catch (e) {
        console.warn("Invalid seasonMapTimeData", e);
      }
    }
    
    // Goal Area Stats rendern
    this.renderGoalAreaStats();
  },
  
  exportFromGoalMap() {
    if (!confirm("In Season Map exportieren?")) return;
    
    const boxes = Array.from(document.querySelectorAll(App.selectors.torbildBoxes));
    const allMarkers = boxes.map(box => {
      const markers = [];
      box.querySelectorAll(".marker-dot").forEach(dot => {
        const left = dot.style.left || "";
        const top = dot.style.top || "";
        const bg = dot.style.backgroundColor || "";
        const xPct = parseFloat(left.replace("%", "")) || 0;
        const yPct = parseFloat(top.replace("%", "")) || 0;
        markers.push({ xPct, yPct, color: bg });
      });
      return markers;
    });
    
    localStorage.setItem("seasonMapMarkers", JSON.stringify(allMarkers));
    
    const timeData = this.readTimeTrackingFromBox();
    localStorage.setItem("seasonMapTimeData", JSON.stringify(timeData));
    
    const keep = confirm("Spiel wurde in Season Map exportiert. Daten in Goal Map beibehalten? (OK = Ja)");
    if (!keep) {
      document.querySelectorAll("#torbildPage .marker-dot").forEach(d => d.remove());
      document.querySelectorAll("#torbildPage .time-btn").forEach(btn => btn.textContent = "0");
      localStorage.removeItem("timeData");
    }
    
    App.showPage("seasonMap");
    this.render();
  },
  
  readTimeTrackingFromBox() {
    const result = {};
    const box = document.getElementById("timeTrackingBox");
    if (!box) return result;
    
    box.querySelectorAll(".period").forEach((period, pIdx) => {
      const key = period.dataset.period || (`p${pIdx}`);
      result[key] = [];
      period.querySelectorAll(".time-btn").forEach(btn => {
        result[key].push(Number(btn.textContent) || 0);
      });
    });
    return result;
  },
  
  writeTimeTrackingToBox(data) {
    if (!this.timeTrackingBox || !data) return;
    
    const periods = Array.from(this.timeTrackingBox.querySelectorAll(".period"));
    periods.forEach((period, pIdx) => {
      const key = period.dataset.period || (`p${pIdx}`);
      const arr = data[key] || data[Object.keys(data)[pIdx]] || [];
      period.querySelectorAll(".time-btn").forEach((btn, idx) => {
        btn.textContent = (typeof arr[idx] !== "undefined") ? arr[idx] : btn.textContent;
      });
    });
  },
  
  initTimeTracking() {
    if (!this.timeTrackingBox) return;
    
    this.timeTrackingBox.querySelectorAll(".time-btn").forEach(btn => {
      btn.disabled = true;
      btn.classList.add("disabled-readonly");
    });
  },
  
  renderGoalAreaStats() {
    const seasonMapRoot = document.getElementById("seasonMapPage");
    if (!seasonMapRoot) return;
    
    const goalBoxIds = ["goalGreenBox", "goalRedBox"];
    goalBoxIds.forEach(id => {
      const box = seasonMapRoot.querySelector(`#${id}`);
      if (!box) return;
      
      box.querySelectorAll(".goal-area-label").forEach(el => el.remove());
      
      const markers = Array.from(box.querySelectorAll(".marker-dot"));
      const total = markers.length;
      
      const counts = { tl: 0, tr: 0, bl: 0, bm: 0, br: 0 };
      markers.forEach(m => {
        const left = parseFloat(m.style.left) || 0;
        const top = parseFloat(m.style.top) || 0;
        if (top < 50) {
          if (left < 50) counts.tl++;
          else counts.tr++;
        } else {
          if (left < 33.3333) counts.bl++;
          else if (left < 66.6667) counts.bm++;
          else counts.br++;
        }
      });
      
      const areas = [
        { key: "tl", x: 25, y: 22 },
        { key: "tr", x: 75, y: 22 },
        { key: "bl", x: 16, y: 75 },
        { key: "bm", x: 50, y: 75 },
        { key: "br", x: 84, y: 75 }
      ];
      
      areas.forEach(a => {
        const cnt = counts[a.key] || 0;
        const pct = total ? Math.round((cnt / total) * 100) : 0;
        const div = document.createElement("div");
        div.className = "goal-area-label";
        div.style.cssText = `
          position: absolute;
          left: ${a.x}%;
          top: ${a.y}%;
          transform: translate(-50%,-50%);
          pointer-events: none;
          font-weight: 800;
          opacity: 0.45;
          font-size: 36px;
          color: #000000;
          text-shadow: 0 1px 2px rgba(255,255,255,0.06);
          line-height: 1;
          user-select: none;
          white-space: nowrap;
        `;
        div.textContent = `${cnt} (${pct}%)`;
        box.appendChild(div);
      });
    });
    
    // Unnamed Goal Boxes
    const unnamedGoalBoxes = Array.from(seasonMapRoot.querySelectorAll(".goal-img-box"))
      .filter(b => !["goalGreenBox", "goalRedBox"].includes(b.id));
    
    unnamedGoalBoxes.forEach(box => {
      box.querySelectorAll(".goal-area-label").forEach(el => el.remove());
      
      const markers = Array.from(box.querySelectorAll(".marker-dot"));
      const total = markers.length;
      const counts = { tl: 0, tr: 0, bl: 0, bm: 0, br: 0 };
      
      markers.forEach(m => {
        const left = parseFloat(m.style.left) || 0;
        const top = parseFloat(m.style.top) || 0;
        if (top < 50) {
          if (left < 50) counts.tl++;
          else counts.tr++;
        } else {
          if (left < 33.3333) counts.bl++;
          else if (left < 66.6667) counts.bm++;
          else counts.br++;
        }
      });
      
      const areas = [
        { key: "tl", x: 25, y: 22 },
        { key: "tr", x: 75, y: 22 },
        { key: "bl", x: 16, y: 75 },
        { key: "bm", x: 50, y: 75 },
        { key: "br", x: 84, y: 75 }
      ];
      
      areas.forEach(a => {
        const cnt = counts[a.key] || 0;
        const pct = total ? Math.round((cnt / total) * 100) : 0;
        const div = document.createElement("div");
        div.className = "goal-area-label";
        div.style.cssText = `
          position: absolute;
          left: ${a.x}%;
          top: ${a.y}%;
          transform: translate(-50%,-50%);
          pointer-events: none;
          font-weight: 800;
          opacity: 0.45;
          font-size: 36px;
          color: #000000;
          line-height: 1;
          user-select: none;
          white-space: nowrap;
        `;
        div.textContent = `${cnt} (${pct}%)`;
        box.appendChild(div);
      });
    });
  },
  
  reset() {
    if (!confirm("⚠️ Season Map zurücksetzen (Marker + Timeboxen)?")) return;
    
    document.querySelectorAll("#seasonMapPage .marker-dot").forEach(d => d.remove());
    document.querySelectorAll("#seasonMapPage .time-btn").forEach(btn => btn.textContent = "0");
    localStorage.removeItem("seasonMapMarkers");
    localStorage.removeItem("seasonMapTimeData");
    
    alert("Season Map zurückgesetzt.");
  }
};
