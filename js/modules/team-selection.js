// Team Selection Module mit vollständig separater Datenspeicherung
App.teamSelection = {
  container: null,
  currentTeam: 1,
  
  init() {
    this.initEventListeners();
    this.initTeamFromStorage();
  },
  
  initEventListeners() {
    // Team buttons
    for (let i = 1; i <= 3; i++) {
      const btn = document.getElementById(`teamBtn${i}`);
      if (btn) {
        btn.addEventListener("click", () => {
          this.selectTeam(i);
        });
      }
    }
    
    // Edit buttons
    for (let i = 1; i <= 3; i++) {
      const editBtn = document.getElementById(`editBtn${i}`);
      if (editBtn) {
        editBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.openEditModal(i);
        });
      }
    }
    
    // Modal handlers
    const saveBtn = document.getElementById("saveTeamNameBtn");
    const cancelBtn = document.getElementById("cancelTeamEditBtn");
    const modal = document.getElementById("teamEditModal");
    
    if (saveBtn) {
      saveBtn.addEventListener("click", () => this.saveTeamName());
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => this.closeEditModal());
    }
    
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) this.closeEditModal();
      });
    }
    
    this.loadTeamNames();
  },
  
  selectTeam(teamNumber) {
    this.saveCurrentTeamData();
    this.stopAllTimers();
    
    this.currentTeam = teamNumber;
    App.data.currentTeam = `team${teamNumber}`;
    localStorage.setItem("currentTeam", App.data.currentTeam);
    
    this.loadTeamData(teamNumber);
    this.updateTeamDisplay();
    
    // Navigate to player selection page
    if (typeof App.showPage === 'function') {
      App.showPage("selection");
    }
    
    console.log(`Team ${teamNumber} selected`);
  },
  
  switchTeam(teamNumber) {
    if (teamNumber === this.currentTeam) return; // Already on this team
    
    console.log(`Switching from team ${this.currentTeam} to team ${teamNumber}`);
    
    // Save current team data before switching
    this.saveCurrentTeamData();
    
    // Stop all active timers for current team
    this.stopAllTimers();
    
    // Switch team
    const previousTeam = this.currentTeam;
    this.currentTeam = teamNumber;
    App.data.currentTeam = `team${teamNumber}`;
    
    // Save team selection
    localStorage.setItem("currentTeam", App.data.currentTeam);
    
    // Load new team data
    this.loadTeamData(teamNumber);
    
    // Update UI
    this.updateTeamDisplay();
    this.refreshAllTables();
    
    console.log(`Successfully switched from team ${previousTeam} to team ${teamNumber}`);
  },
  
  saveCurrentTeamData() {
    if (!this.currentTeam) return;
    
    const teamId = `team${this.currentTeam}`;
    
    // Save all current data with team prefix
    localStorage.setItem(`selectedPlayers_${teamId}`, JSON.stringify(App.data.selectedPlayers || []));
    localStorage.setItem(`statsData_${teamId}`, JSON.stringify(App.data.statsData || {}));
    localStorage.setItem(`playerTimes_${teamId}`, JSON.stringify(App.data.playerTimes || {}));
    localStorage.setItem(`seasonData_${teamId}`, JSON.stringify(App.data.seasonData || {}));
    
    // Save opponent shots
    const shotCell = document.querySelector('.total-cell[data-cat="Shot"]');
    if (shotCell && shotCell.dataset.opp) {
      localStorage.setItem(`opponentShots_${teamId}`, shotCell.dataset.opp);
    }
    
    // Save active timer players
    const activeTimerPlayers = Object.keys(App.data.activeTimers || {});
    localStorage.setItem(`activeTimerPlayers_${teamId}`, JSON.stringify(activeTimerPlayers));
    
    console.log(`Saved data for ${teamId}`);
  },
  
  loadTeamData(teamNumber) {
    const teamId = `team${teamNumber}`;
    
    // Load team-specific data or use defaults
    const savedPlayers = localStorage.getItem(`selectedPlayers_${teamId}`);
    const savedStats = localStorage.getItem(`statsData_${teamId}`);
    const savedTimes = localStorage.getItem(`playerTimes_${teamId}`);
    const savedSeason = localStorage.getItem(`seasonData_${teamId}`);
    const savedOppShots = localStorage.getItem(`opponentShots_${teamId}`);
    const savedActiveTimers = localStorage.getItem(`activeTimerPlayers_${teamId}`);
    
    // Reset App data
    App.data.selectedPlayers = savedPlayers ? JSON.parse(savedPlayers) : [];
    App.data.statsData = savedStats ? JSON.parse(savedStats) : {};
    App.data.playerTimes = savedTimes ? JSON.parse(savedTimes) : {};
    App.data.seasonData = savedSeason ? JSON.parse(savedSeason) : {};
    App.data.activeTimers = {};
    
    // Restore active timers if any
    if (savedActiveTimers) {
      const timerPlayers = JSON.parse(savedActiveTimers);
      timerPlayers.forEach(playerName => {
        if (App.data.selectedPlayers.some(p => p.name === playerName)) {
          App.startPlayerTimer(playerName);
        }
      });
    }
    
    // Restore opponent shots (will be applied when table renders)
    if (savedOppShots) {
      setTimeout(() => {
        const shotCell = document.querySelector('.total-cell[data-cat="Shot"]');
        if (shotCell) {
          shotCell.dataset.opp = savedOppShots;
          App.statsTable.updateTotals();
        }
      }, 100);
    }
    
    console.log(`Loaded data for ${teamId}`, {
      players: App.data.selectedPlayers.length,
      hasStats: Object.keys(App.data.statsData).length > 0,
      hasTimers: Object.keys(App.data.activeTimers).length > 0
    });
  },
  
  stopAllTimers() {
    Object.values(App.data.activeTimers || {}).forEach(timer => {
      if (timer) clearInterval(timer);
    });
    App.data.activeTimers = {};
  },
  
  updateTeamDisplay() {
    // Update current team display on other pages
    const currentTeamDisplays = document.querySelectorAll("#currentTeamDisplay, #statsTeamDisplay");
    const teamId = `team${this.currentTeam}`;
    const teamName = this.getTeamName(teamId) || `Team ${this.currentTeam}`;
    
    currentTeamDisplays.forEach(display => {
      if (display) display.textContent = teamName;
    });
  },
  
  openEditModal(teamNumber) {
    this.editingTeam = teamNumber;
    const teamId = `team${teamNumber}`;
    const currentName = this.getTeamName(teamId) || `Team ${teamNumber}`;
    
    const input = document.getElementById("teamNameInput");
    const modal = document.getElementById("teamEditModal");
    
    if (input && modal) {
      input.value = currentName === `Team ${teamNumber}` ? "" : currentName;
      modal.style.display = "flex";
      input.focus();
    }
  },
  
  closeEditModal() {
    const modal = document.getElementById("teamEditModal");
    if (modal) {
      modal.style.display = "none";
    }
    this.editingTeam = null;
  },
  
  saveTeamName() {
    if (!this.editingTeam) return;
    
    const input = document.getElementById("teamNameInput");
    if (!input) return;
    
    const newName = input.value.trim();
    const teamId = `team${this.editingTeam}`;
    
    if (newName) {
      this.setTeamName(teamId, newName);
    } else {
      this.setTeamName(teamId, `Team ${this.editingTeam}`);
    }
    
    this.updateTeamDisplay();
    this.closeEditModal();
  },
  
  getTeamName(teamId) {
    const teams = JSON.parse(localStorage.getItem("teamNames") || "{}");
    return teams[teamId] || null;
  },
  
  setTeamName(teamId, name) {
    const teams = JSON.parse(localStorage.getItem("teamNames") || "{}");
    teams[teamId] = name;
    localStorage.setItem("teamNames", JSON.stringify(teams));
    
    const teamNumber = parseInt(teamId.replace("team", ""));
    const nameSpan = document.getElementById(`teamName${teamNumber}`);
    if (nameSpan) {
      nameSpan.textContent = name;
    }
  },
  
  loadTeamNames() {
    const teams = JSON.parse(localStorage.getItem("teamNames") || "{}");
    for (let i = 1; i <= 3; i++) {
      const teamId = `team${i}`;
      const name = teams[teamId] || `Neues Team`;
      const nameSpan = document.getElementById(`teamName${i}`);
      if (nameSpan) {
        nameSpan.textContent = name;
      }
    }
  },
  
  saveTeams() {
    // Called before page unload - already handled by individual save methods
  },
  
  refreshAllTables() {
    // Refresh stats table
    if (App.statsTable && App.statsTable.render) {
      App.statsTable.render();
    }
    
    // Refresh season table
    if (App.seasonTable && App.seasonTable.render) {
      App.seasonTable.render();
    }
    
    // Update timer visuals
    if (App.updateTimerVisuals) {
      App.updateTimerVisuals();
    }
  },
  
  refreshAllTables() {
    // Refresh stats table
    if (App.statsTable && App.statsTable.render) {
      App.statsTable.render();
    }
    
    // Refresh season table
    if (App.seasonTable && App.seasonTable.render) {
      App.seasonTable.render();
    }
    
    // Update timer visuals
    if (App.updateTimerVisuals) {
      App.updateTimerVisuals();
    }
  },
  
  initTeamFromStorage() {
    const savedTeam = localStorage.getItem("currentTeam");
    if (savedTeam) {
      const teamNumber = parseInt(savedTeam.replace('team', ''));
      if (teamNumber >= 1 && teamNumber <= 3) {
        this.currentTeam = teamNumber;
        App.data.currentTeam = savedTeam;
        this.loadTeamData(teamNumber);
      } else {
        // Invalid team number, default to team 1
        this.selectTeam(1);
      }
    } else {
      // No saved team, default to team 1
      this.selectTeam(1);
    }
    
    this.updateTeamDisplay();
  },
  
  resetCurrentTeam() {
    const teamId = `team${this.currentTeam}`;
    const teamName = `Team ${this.currentTeam}`;
    
    if (!confirm(`${teamName} Daten vollständig zurücksetzen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return false;
    }
    
    // Stop all timers
    this.stopAllTimers();
    
    // Remove team-specific data from localStorage
    const keysToRemove = [
      `selectedPlayers_${teamId}`,
      `statsData_${teamId}`,
      `playerTimes_${teamId}`,
      `seasonData_${teamId}`,
      `opponentShots_${teamId}`,
      `activeTimerPlayers_${teamId}`
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Reset app data
    App.data.selectedPlayers = [];
    App.data.statsData = {};
    App.data.playerTimes = {};
    App.data.seasonData = {};
    App.data.activeTimers = {};
    
    // Refresh UI
    this.refreshAllTables();
    
    console.log(`Reset completed for ${teamName}`);
    alert(`${teamName} wurde zurückgesetzt. Andere Teams sind unberührt.`);
    
    return true;
  },
  
  // Get current team info
  getCurrentTeamInfo() {
    return {
      number: this.currentTeam,
      id: `team${this.currentTeam}`,
      name: `Team ${this.currentTeam}`,
      playerCount: App.data.selectedPlayers.length,
      hasData: Object.keys(App.data.statsData).length > 0
    };
  },
  
  // Get current team (for compatibility with app.js)
  getCurrentTeam() {
    return this.currentTeam ? `team${this.currentTeam}` : null;
  },
  
  // Export current team data
  exportCurrentTeam() {
    if (App.csvHandler && App.csvHandler.exportStats) {
      App.csvHandler.exportStats();
    }
  },
  
  // Import data for current team
  importToCurrentTeam() {
    if (App.csvHandler && App.csvHandler.fileInput) {
      App.csvHandler.fileInput.dataset.target = "stats";
      App.csvHandler.fileInput.click();
    }
  }
};
