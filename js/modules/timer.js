// Timer Modul
App.timer = {
  seconds: 0,
  interval: null,
  btn: null,
  
  init() {
    this.seconds = Number(localStorage.getItem("timerSeconds")) || 0;
    this.btn = document.getElementById("timerBtn");
    
    if (this.btn) {
      this.updateDisplay();
      this.attachEvents();
    }
  },
  
  updateDisplay() {
    if (this.btn) {
      this.btn.textContent = App.helpers.formatTimeMMSS(this.seconds);
    }
    localStorage.setItem("timerSeconds", String(this.seconds));
  },
  
  start() {
    if (this.interval) return;
    this.interval = setInterval(() => {
      this.seconds++;
      this.updateDisplay();
    }, 1000);
    this.btn?.classList.remove("stopped", "reset");
    this.btn?.classList.add("running");
  },
  
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.btn?.classList.remove("running", "reset");
    this.btn?.classList.add("stopped");
  },
  
  reset() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.seconds = 0;
    this.updateDisplay();
    this.btn?.classList.remove("running", "stopped");
    this.btn?.classList.add("reset");
  },
  
  attachEvents() {
    if (!this.btn) return;
    
    let holdTimer = null;
    let longPress = false;
    let lastTouchTime = 0; // Zeitstempel des letzten Touches
    const LONG_MS = 800;
    const GHOST_CLICK_THRESHOLD = 600; // Zeit in ms um Ghost Clicks zu blockieren
    
    this.btn.addEventListener("mousedown", () => {
      longPress = false;
      holdTimer = setTimeout(() => {
        this.reset();
        longPress = true;
      }, LONG_MS);
    });
    
    this.btn.addEventListener("mouseup", () => {
      if (holdTimer) clearTimeout(holdTimer);
    });
    
    this.btn.addEventListener("mouseleave", () => {
      if (holdTimer) clearTimeout(holdTimer);
    });
    
    this.btn.addEventListener("touchstart", (e) => {
      longPress = false;
      lastTouchTime = Date.now();
      holdTimer = setTimeout(() => {
        this.reset();
        longPress = true;
      }, LONG_MS);
    }, { passive: true });
    
    this.btn.addEventListener("touchend", (e) => {
      if (holdTimer) clearTimeout(holdTimer);
      
      // Bei Touch direkt hier den Toggle ausführen
      if (!longPress) {
        if (this.interval) this.stop();
        else this.start();
      }
      longPress = false;
    }, { passive: true });
    
    this.btn.addEventListener("click", (e) => {
      // Blockiere Click wenn er kurz nach einem Touch kommt (Ghost Click)
      const timeSinceTouch = Date.now() - lastTouchTime;
      if (timeSinceTouch < GHOST_CLICK_THRESHOLD) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      
      if (longPress) {
        longPress = false;
        return;
      }
      if (this.interval) this.stop();
      else this.start();
    });
  }
};
