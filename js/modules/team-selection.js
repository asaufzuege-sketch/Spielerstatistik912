// Team Selection Module mit vollständig separater Datenspeicherung
App.teamSelection = {
  container: null,
  currentTeam: 1,
  
  init() {
    this.container = document.getElementById("teamSelectionContainer");
    this.createTeamButtons();
    this.initTeamFromStorage();
    this.setupHTMLTeamButtons();
    this.setupEditButtons();
  },
  
  setupHTMLTeamButtons() {
    // Setup event listeners for the HTML team buttons (teamBtn1, teamBtn2, teamBtn3)
    for (let i = 1; i <= 3; i++) {
      const btn = document.getElementById(`teamBtn${i}`);
      if (btn) {
        btn.addEventListener("click", () => {
          this.selectTeamAndNavigate(i);
        });
      }
    }
  },
  
  setupEditButtons() {
    // Setup event listeners for the edit buttons
    const modal = document.getElementById("teamEditModal");
    const input = document.getElementById("teamNameInput");
    const saveBtn = document.getElementById("saveTeamNameBtn");
    const cancelBtn = document.getElementById("cancelTeamEditBtn");
    let currentEditingTeam = null;
    
    // Edit button handlers
    for (let i = 1; i <= 3; i++) {
      const editBtn = document.getElementById(`editBtn${i}`);
      if (editBtn) {
        editBtn.addEventListener("click", () => {
          currentEditingTeam = i;
          const teamNameSpan = document.getElementById(`teamName${i}`);
          input.value = teamNameSpan?.textContent || `Team ${i}`;
          modal.style.display = "flex";
        });
      }
    }
    
    // Save button handler
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        if (currentEditingTeam && input.value.trim()) {
          const teamNameSpan = document.getElementById(`teamName${currentEditingTeam}`);
          if (teamNameSpan) {
            teamNameSpan.textContent = input.value.trim();
            localStorage.setItem(`teamName${currentEditingTeam}`, input.value.trim());
          }
          modal.style.display = "none";
        }
      });
    }
    
    // Cancel button handler
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        modal.style.display = "none";
      });
    }
    
    // Load saved team names
    for (let i = 1; i <= 3; i++) {
      const savedName = localStorage.getItem(`teamName${i}`);
      if (savedName) {
        const teamNameSpan = document.getElementById(`teamName${i}`);
        if (teamNameSpan) {
          teamNameSpan.textContent = savedName;
        }
      }
    }
  },
  
  selectTeamAndNavigate(teamNumber) {
    // Switch to the selected team
    if (teamNumber !== this.currentTeam) {
      this.switchTeam(teamNumber);
    }
    // Navigate to player selection page
    App.showPage("selection");
  },
  
  createTeamButtons() {
    if (!this.container) return;
    
    // Clear container
    this.container.innerHTML = "";
    
    // Create team buttons wrapper
    const wrapper = document.createElement("div");
    wrapper.className = "team-buttons-wrapper";
    wrapper.style.cssText = `
      display: flex;
      gap: 10px;
      justify-content: center;
      margin: 10px 0;
      flex-wrap: wrap;
    `;
    
    // Create 3 team buttons
    for (let i = 1; i <= 3; i++) {
      const button = document.createElement("button");
      button.className = "team-btn";
      button.textContent = `Team ${i}`;
      button.dataset.team = i;
      button.style.cssText = `
        padding: 8px 16px;
        border: 2px solid #44bb91;
        background-color: transparent;
        color: #44bb91;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
        transition: all 0.3s ease;
        min-width: 80px;
      `;
      
      // Event listener for team switch
      button.addEventListener("click", () => {
        this.switchTeam(i);
      });
      
      // Hover effects
      button.addEventListener("mouseenter", () => {
        if (!button.classList.contains('active')) {
          button.style.backgroundColor = "rgba(68, 187, 145, 0.2)";
        }
      });
      
      button.addEventListener("mouseleave", () => {
        if (!button.classList.contains('active')) {
          button.style.backgroundColor = "transparent";
        }
      });
      
      wrapper.appendChild(button);
    }
    
    this.container.appendChild(wrapper);
    
    // Set initial active state
    this.updateButtonStates();
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
    this.updateButtonStates();
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
  
  updateButtonStates() {
    document.querySelectorAll('.team-btn').forEach((btn, index) => {
      const teamNum = index + 1;
      if (teamNum === this.currentTeam) {
        btn.classList.add('active');
        btn.style.backgroundColor = '#44bb91';
        btn.style.color = 'white';
      } else {
        btn.classList.remove('active');
        btn.style.backgroundColor = 'transparent';
        btn.style.color = '#44bb91';
      }
    });
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
        this.switchTeam(1);
      }
    } else {
      // No saved team, default to team 1
      this.switchTeam(1);
    }
    
    this.updateButtonStates();
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
  },
  
  // Get current team (required by app.js)
  getCurrentTeam() {
    return App.data.currentTeam || localStorage.getItem("currentTeam") || "team1";
  },
  
  // Save teams (required by app.js)
  saveTeams() {
    this.saveCurrentTeamData();
  }
};
