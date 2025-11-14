// Globale Konfiguration und Namespace
const App = {
  version: '2.0.0',
  
  // Seiten
  pages: {},
  
  // Daten
  data: {
    players: [
      { num: 4, name: "Ondrej Kastner" }, { num: 5, name: "Raphael Oehninger" },
      { num: 6, name: "Nuno Meier" }, { num: 7, name: "Silas Teuber" },
      { num: 8, name: "Diego Warth" }, { num: 9, name: "Mattia Crameri" },
      { num: 10, name: "Mael Bernath" }, { num: 11, name: "Sean Nef" },
      { num: 12, name: "Rafael Burri" }, { num: 13, name: "Lenny Schwarz" },
      { num: 14, name: "David Lienert" }, { num: 15, name: "Neven Severini" },
      { num: 16, name: "Nils Koubek" }, { num: 17, name: "Lio Kundert" },
      { num: 18, name: "Livio Berner" }, { num: 19, name: "Robin Strasser" },
      { num: 21, name: "Marlon Kreyenbühl" }, { num: 22, name: "Martin Lana" },
      { num: 23, name: "Manuel Isler" }, { num: 24, name: "Moris Hürlimann" },
      { num: "", name: "Levi Baumann" }, { num: "", name: "Corsin Blapp" },
      { num: "", name: "Lenny Zimmermann" }, { num: "", name: "Luke Böhmichen" },
      { num: "", name: "Livio Weissen" }, { num: "", name: "Raul Wütrich" },
      { num: "", name: "Marco Senn" }
    ],
    
    categories: ["Shot", "Goals", "Assist", "+/-", "FaceOffs", "FaceOffs Won", "Penaltys"],
    
    selectedPlayers: [],
    statsData: {},
    playerTimes: {},
    seasonData: {},
    activeTimers: {}
  },
  
  // Selektoren
  selectors: {
    torbildBoxes: "#torbildPage .field-box, #torbildPage .goal-img-box",
    seasonMapBoxes: "#seasonMapPage .field-box, #seasonMapPage .goal-img-box"
  },
  
  // Theme Setup
  initTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  },
  
  // CSS Injection für Season/GoalValue Tables (SCROLL FIX eingearbeitet)
  injectTableStyles() {
    const existing = document.getElementById('season-goalvalue-left-align');
    if (existing) existing.remove();
    
    const style = document.createElement('style');
    style.id = 'season-goalvalue-left-align';
    style.textContent = `
      #seasonContainer, #goalValueContainer {
        display: flex !important;
        justify-content: flex-start !important;
        align-items: flex-start !important;
        padding-left: 0 !important;
        margin-left: 0 !important;
        box-sizing: border-box !important;
        width: 100% !important;
      }
      #seasonContainer .table-scroll, #goalValueContainer .table-scroll {
        overflow-x: auto !important;          /* WICHTIG: horizontal scroll ermöglichen */
        overflow-y: hidden !important;
        -webkit-overflow-scrolling: touch !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      #seasonContainer table, #goalValueContainer table {
        white-space: nowrap !important;
        margin-left: 0 !important;
        margin-right: auto !important;
        width: auto !important;
        max-width: none !important;
        box-sizing: border-box !important;
      }
      #seasonContainer table th, #seasonContainer table td,
      #goalValueContainer table th, #goalValueContainer table td {
        text-align: center !important;
        padding-left: 0 !important;
      }
      #seasonContainer table th:nth-child(1),
      #seasonContainer table td:nth-child(1),
      #seasonContainer table th:nth-child(2),
      #seasonContainer table td:nth-child(2) {
        text-align: left !important;
        padding-left: 12px !important;
      }
      #goalValueContainer table th:first-child,
      #goalValueContainer table td:first-child {
        text-align: left !important;
        padding-left: 12px !important;
      }
      @media (min-width: 1200px) {
        #seasonContainer, #goalValueContainer {
          width: 100vw !important;
          overflow: visible !important;
        }
        /* Season soll auf sehr breiten Screens nicht mehr horizontal scrollen */
        #seasonContainer .table-scroll {
          overflow-x: hidden !important;
        }
        /* Goal Value DARF weiterhin scrollen -> KEIN overflow-x: hidden! */
        #goalValueContainer .table-scroll {
          overflow-x: auto !important;
        }
        #seasonContainer table {
          width: auto !important;
          table-layout: auto !important;
          white-space: nowrap !important;
          font-size: 13px !important;
        }
        #goalValueContainer table {
          width: auto !important;
          table-layout: fixed !important;
          white-space: nowrap !important;
          font-size: 13px !important;
        }
      }
      #seasonContainer table {
        width: auto !important;
        table-layout: auto !important;
      }
    `;
    document.head.appendChild(style);
  },
  
  // Page Navigation (sofort verfügbar!)
  showPage(page) {
    try {
      // Lazy-initialize pages wenn noch nicht geschehen
      if (!this.pages || Object.keys(this.pages).length === 0) {
        this.pages = {
          selection: document.getElementById("playerSelectionPage"),
          stats: document.getElementById("statsPage"),
            torbild: document.getElementById("torbildPage"),
          goalValue: document.getElementById("goalValuePage"),
          season: document.getElementById("seasonPage"),
          seasonMap: document.getElementById("seasonMapPage")
        };
      }
      
      // Alle Seiten verstecken
      Object.values(this.pages).forEach(p => {
        if (p) p.style.display = "none";
      });
      
      // Target-Seite anzeigen
      if (this.pages[page]) {
        this.pages[page].style.display = "block";
      }
      
      // Page in LocalStorage speichern
      if (this.storage && typeof this.storage.setCurrentPage === 'function') {
        this.storage.setCurrentPage(page);
      } else {
        try {
          localStorage.setItem("currentPage", page);
        } catch (e) {}
      }
      
      // Title setzen
      const titles = {
        selection: "Spielerauswahl",
        stats: "Statistiken",
        torbild: "Goal Map",
        goalValue: "Goal Value",
        season: "Season",
        seasonMap: "Season Map"
      };
      document.title = titles[page] || "Spielerstatistik";
      
      // Render bei Seitenwechsel verzögert
      setTimeout(() => {
        if (page === "stats" && this.statsTable && typeof this.statsTable.render === 'function') {
          this.statsTable.render();
        }
        if (page === "season" && this.seasonTable && typeof this.seasonTable.render === 'function') {
          this.seasonTable.render();
        }
        if (page === "goalValue" && this.goalValue && typeof this.goalValue.render === 'function') {
          this.goalValue.render();
        }
        if (page === "seasonMap" && this.seasonMap && typeof this.seasonMap.render === 'function') {
          this.seasonMap.render();
        }
      }, 60);
      
    } catch (err) {
      console.error("App.showPage failed:", err);
    }
  }
};
