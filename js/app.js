// Haupt-App Initialisierung
document.addEventListener("DOMContentLoaded", () => {
  console.log(`Spielerstatistik App v${App.version} wird geladen...`);
  
  // 1. Theme & Styles initialisieren
  App.initTheme();
  App.injectTableStyles();
  
  // 2. Pages registrieren
  App.pages = {
    teamSelection: document.getElementById("teamSelectionPage"),
    selection: document.getElementById("playerSelectionPage"),
    stats: document.getElementById("statsPage"),
    torbild: document.getElementById("torbildPage"),
    goalValue: document.getElementById("goalValuePage"),
    season: document.getElementById("seasonPage"),
    seasonMap: document.getElementById("seasonMapPage")
  };
  
  // 3. Daten aus LocalStorage laden
  App.storage.load();
  
  // 4. Alle Module initialisieren
  App.teamSelection.init();
  App.timer.init();
  App.csvHandler.init();
  App.playerSelection.init();
  App.statsTable.init();
  App.seasonTable.init();
  App.goalMap.init();
  App.seasonMap.init();
  App.goalValue.init();
  
  // 5. Navigation Event Listeners
  document.getElementById("selectPlayersBtn")?.addEventListener("click", () => {
    App.showPage("selection");
  });
  
  document.getElementById("backToStatsBtn")?.addEventListener("click", () => {
    App.showPage("stats");
  });
  
  document.getElementById("backToStatsFromSeasonBtn")?.addEventListener("click", () => {
    App.showPage("stats");
  });
  
  document.getElementById("backToStatsFromSeasonMapBtn")?.addEventListener("click", () => {
    App.showPage("stats");
  });
  
  document.getElementById("backFromGoalValueBtn")?.addEventListener("click", () => {
    App.showPage("stats");
  });
  
  document.getElementById("backToTeamSelectionBtn")?.addEventListener("click", () => {
    App.showPage("teamSelection");
  });
  
  document.getElementById("torbildBtn")?.addEventListener("click", () => {
    App.showPage("torbild");
  });
  
  document.getElementById("goalValueBtn")?.addEventListener("click", () => {
    App.showPage("goalValue");
  });
  
  document.getElementById("seasonBtn")?.addEventListener("click", () => {
    App.showPage("season");
  });
  
  document.getElementById("seasonMapBtn")?.addEventListener("click", () => {
    App.showPage("seasonMap");
  });
  
  // 6. Delegierte Back-Button Handler
  document.addEventListener("click", (e) => {
    try {
      const btn = e.target.closest("button");
      if (!btn) return;
      
      const backIds = new Set([
        "backToStatsBtn",
        "backToStatsFromSeasonBtn",
        "backToStatsFromSeasonMapBtn",
        "backFromGoalValueBtn"
      ]);
      
      if (backIds.has(btn.id)) {
        App.showPage("stats");
        e.preventDefault();
        e.stopPropagation();
      }
      
      if (btn.id === "backToTeamSelectionBtn") {
        App.showPage("teamSelection");
        e.preventDefault();
        e.stopPropagation();
      }
    } catch (err) {
      console.warn("Back button delegation failed:", err);
    }
  }, true);
  
  // 7. Initiale Seite anzeigen
  const currentTeam = App.teamSelection.getCurrentTeam();
  const lastPage = App.storage.getCurrentPage();
  
  // Wenn kein Team ausgewählt ist, zur Teamauswahl
  let initialPage;
  if (!currentTeam) {
    initialPage = "teamSelection";
  } else if (lastPage === "selection" || !App.data.selectedPlayers.length) {
    initialPage = "selection";
  } else {
    initialPage = lastPage;
  }
  
  App.showPage(initialPage);
  
  // 8. Daten vor Seitenabschluss speichern
  window.addEventListener("beforeunload", () => {
    try {
      App.storage.saveAll();
      App.teamSelection.saveTeams();
      localStorage.setItem("timerSeconds", String(App.timer.seconds));
      if (App.goalValue) {
        localStorage.setItem("goalValueOpponents", JSON.stringify(App.goalValue.getOpponents()));
        localStorage.setItem("goalValueData", JSON.stringify(App.goalValue.getData()));
        localStorage.setItem("goalValueBottom", JSON.stringify(App.goalValue.getBottom()));
      }
    } catch (e) {
      console.warn("Save on unload failed:", e);
    }
  });
  
  console.log("✅ App erfolgreich geladen!");
});
