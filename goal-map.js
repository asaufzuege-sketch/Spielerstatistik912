// Goal Map Modul
App.goalMap = {
  timeTrackingBox: null,
  
  init() {
    this.timeTrackingBox = document.getElementById("timeTrackingBox");
    
    // Marker Handler für Goal Map Boxen
    this.attachMarkerHandlers();
    
    // Time Tracking initialisieren
    this.initTimeTracking();
    
    // Reset Button
    document.getElementById("resetTorbildBtn")?.addEventListener("click", () => {
      this.reset();
    });
  },
  
  attachMarkerHandlers() {
    const boxes = document.querySelectorAll(App.selectors.torbildBoxes);
    
    boxes.forEach(box => {
      const img = box.querySelector("img");
      if (!img) return;
      
      box.style.position = box.style.position || "relative";
      App.markerHandler.createImageSampler(img);
      
      let mouseHoldTimer = null;
      let isLong = false;
      let lastMouseUp = 0;
      let lastTouchEnd = 0;
      
      const getPosFromEvent = (e) => {
        const boxRect = img.getBoundingClientRect();
        const clientX = e.clientX !== undefined ? e.clientX : (e.touches?.[0]?.clientX);
        const clientY = e.clientY !== undefined ? e.clientY : (e.touches?.[0]?.clientY);
        
        const xPctContainer = Math.max(0, Math.min(1, (clientX - boxRect.left) / (boxRect.width || 1))) * 100;
        const yPctContainer = Math.max(0, Math.min(1, (clientY - boxRect.top) / (boxRect.height || 1))) * 100;
        
        const rendered = App.markerHandler.computeRenderedImageRect(img);
        let insideImage = false;
        let xPctImage = 0;
        let yPctImage = 0;
        
        if (rendered) {
          insideImage = (clientX >= rendered.x && clientX <= rendered.x + rendered.width && 
                        clientY >= rendered.y && clientY <= rendered.y + rendered.height);
          if (insideImage) {
            xPctImage = Math.max(0, Math.min(1, (clientX - rendered.x) / (rendered.width || 1))) * 100;
            yPctImage = Math.max(0, Math.min(1, (clientY - rendered.y) / (rendered.height || 1))) * 100;
          }
        } else {
          insideImage = true;
          xPctImage = xPctContainer;
          yPctImage = yPctContainer;
        }
        
        return { xPctContainer, yPctContainer, xPctImage, yPctImage, insideImage };
      };
      
      const placeMarker = (pos, long, forceGrey = false) => {
        if (box.classList.contains("field-box")) {
          if (!pos.insideImage) return;
          
          const sampler = App.markerHandler.createImageSampler(img);
          
          if (long || forceGrey) {
            App.markerHandler.createMarkerPercent(pos.xPctContainer, pos.yPctContainer, "#444", box, true);
            return;
          }
          
          if (sampler && sampler.valid) {
            const isGreen = sampler.isGreenAt(pos.xPctImage, pos.yPctImage, 110, 30);
            const isRed = sampler.isRedAt(pos.xPctImage, pos.yPctImage, 95, 22);
            
            if (isGreen) {
              App.markerHandler.createMarkerPercent(pos.xPctContainer, pos.yPctContainer, "#00ff66", box, true);
              return;
            }
            if (isRed) {
              App.markerHandler.createMarkerPercent(pos.xPctContainer, pos.yPctContainer, "#ff0000", box, true);
              return;
            }
            return;
          } else {
            const color = pos.yPctImage > 50 ? "#ff0000" : "#00ff66";
            App.markerHandler.createMarkerPercent(pos.xPctContainer, pos.yPctContainer, color, box, true);
          }
        } else if (box.classList.contains("goal-img-box") || box.id === "goalGreenBox" || box.id === "goalRedBox") {
          const sampler = App.markerHandler.createImageSampler(img);
          if (!sampler || !sampler.valid) return;
          
          if (box.id === "goalGreenBox") {
            if (!sampler.isWhiteAt(pos.xPctContainer, pos.yPctContainer, 220)) return;
            App.markerHandler.createMarkerPercent(pos.xPctContainer, pos.yPctContainer, "#444", box, true);
          } else if (box.id === "goalRedBox") {
            if (!sampler.isNeutralWhiteAt(pos.xPctContainer, pos.yPctContainer, 235, 12)) return;
            App.markerHandler.createMarkerPercent(pos.xPctContainer, pos.yPctContainer, "#444", box, true);
          } else {
            if (!sampler.isWhiteAt(pos.xPctContainer, pos.yPctContainer, 220)) return;
            App.markerHandler.createMarkerPercent(pos.xPctContainer, pos.yPctContainer, "#444", box, true);
          }
        }
      };
      
      // Mouse Events
      img.addEventListener("mousedown", (ev) => {
        isLong = false;
        if (mouseHoldTimer) clearTimeout(mouseHoldTimer);
        mouseHoldTimer = setTimeout(() => {
          isLong = true;
          placeMarker(getPosFromEvent(ev), true);
        }, App.markerHandler.LONG_MARK_MS);
      });
      
      img.addEventListener("mouseup", (ev) => {
        if (mouseHoldTimer) {
          clearTimeout(mouseHoldTimer);
          mouseHoldTimer = null;
        }
        const now = Date.now();
        const pos = getPosFromEvent(ev);
        
        if (now - lastMouseUp < 300) {
          placeMarker(pos, true, true);
          lastMouseUp = 0;
        } else {
          if (!isLong) placeMarker(pos, false);
          lastMouseUp = now;
        }
        isLong = false;
      });
      
      img.addEventListener("mouseleave", () => {
        if (mouseHoldTimer) {
          clearTimeout(mouseHoldTimer);
          mouseHoldTimer = null;
        }
        isLong = false;
      });
      
      // Touch Events
      img.addEventListener("touchstart", (ev) => {
        isLong = false;
        if (mouseHoldTimer) clearTimeout(mouseHoldTimer);
        mouseHoldTimer = setTimeout(() => {
          isLong = true;
          placeMarker(getPosFromEvent(ev.touches[0]), true);
        }, App.markerHandler.LONG_MARK_MS);
      }, { passive: true });
      
      img.addEventListener("touchend", (ev) => {
        if (mouseHoldTimer) {
          clearTimeout(mouseHoldTimer);
          mouseHoldTimer = null;
        }
        const now = Date.now();
        const pos = getPosFromEvent(ev.changedTouches[0]);
        
        if (now - lastTouchEnd < 300) {
          placeMarker(pos, true, true);
          lastTouchEnd = 0;
        } else {
          if (!isLong) placeMarker(pos, false);
          lastTouchEnd = now;
        }
        isLong = false;
      }, { passive: true });
      
      img.addEventListener("touchcancel", () => {
        if (mouseHoldTimer) {
          clearTimeout(mouseHoldTimer);
          mouseHoldTimer = null;
        }
        isLong = false;
      }, { passive: true });
    });
  },
  
  initTimeTracking() {
    if (!this.timeTrackingBox) return;
    
    let timeData = JSON.parse(localStorage.getItem("timeData")) || {};
    
    this.timeTrackingBox.querySelectorAll(".period").forEach(period => {
      const periodNum = period.dataset.period || Math.random().toString(36).slice(2, 6);
      const buttons = period.querySelectorAll(".time-btn");
      
      buttons.forEach((btn, idx) => {
        const hasStored = (timeData[periodNum] && typeof timeData[periodNum][idx] !== "undefined");
        const stored = hasStored ? Number(timeData[periodNum][idx]) : Number(btn.textContent) || 0;
        btn.textContent = stored;
        
        let lastTap = 0;
        let clickTimeout = null;
        let touchStart = 0;
        
        const updateValue = (delta) => {
          const current = Number(btn.textContent) || 0;
          const newVal = Math.max(0, current + delta);
          btn.textContent = newVal;
          if (!timeData[periodNum]) timeData[periodNum] = {};
          timeData[periodNum][idx] = newVal;
          localStorage.setItem("timeData", JSON.stringify(timeData));
        };
        
        btn.addEventListener("click", () => {
          const now = Date.now();
          const diff = now - lastTap;
          if (diff < 300) {
            if (clickTimeout) {
              clearTimeout(clickTimeout);
              clickTimeout = null;
            }
            updateValue(-1);
            lastTap = 0;
          } else {
            clickTimeout = setTimeout(() => {
              updateValue(+1);
              clickTimeout = null;
            }, 300);
            lastTap = now;
          }
        });
        
        btn.addEventListener("touchstart", (e) => {
          const now = Date.now();
          const diff = now - touchStart;
          if (diff < 300) {
            e.preventDefault();
            if (clickTimeout) {
              clearTimeout(clickTimeout);
              clickTimeout = null;
            }
            updateValue(-1);
            touchStart = 0;
          } else {
            touchStart = now;
            setTimeout(() => {
              if (touchStart !== 0) {
                updateValue(+1);
                touchStart = 0;
              }
            }, 300);
          }
        }, { passive: true });
      });
    });
  },
  
  reset() {
    if (!confirm("Goal Map zurücksetzen?")) return;
    
    document.querySelectorAll("#torbildPage .marker-dot").forEach(d => d.remove());
    document.querySelectorAll("#torbildPage .time-btn").forEach(b => b.textContent = "0");
    localStorage.removeItem("timeData");
    
    alert("Goal Map zurückgesetzt.");
  }
};
