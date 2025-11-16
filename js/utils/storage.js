// LocalStorage Verwaltung (Team-spezifisch)
App.storage = {
  // Aktuelle Team-ID ermitteln
  getCurrentTeamId() {
    return App.data.currentTeam || "team1";
  },
  
  // Teamspezifische Storage Keys
  getTeamStorageKey(key) {
    return `${key}_${this.getCurrentTeamId()}`;
  },
  
  load() {
    const teamId = this.getCurrentTeamId();
    App.data.selectedPlayers = JSON.parse(localStorage.getItem(`selectedPlayers_${teamId}`)) || [];
    App.data.statsData = JSON.parse(localStorage.getItem(`statsData_${teamId}`)) || {};
    App.data.playerTimes = JSON.parse(localStorage.getItem(`playerTimes_${teamId}`)) || {};
    App.data.seasonData = JSON.parse(localStorage.getItem(`seasonData_${teamId}`)) || {};
  },
  
  saveSelectedPlayers() {
    const teamId = this.getCurrentTeamId();
    localStorage.setItem(`selectedPlayers_${teamId}`, JSON.stringify(App.data.selectedPlayers));
  },
  
  saveStatsData() {
    const teamId = this.getCurrentTeamId();
    localStorage.setItem(`statsData_${teamId}`, JSON.stringify(App.data.statsData));
  },
  
  savePlayerTimes() {
    const teamId = this.getCurrentTeamId();
    localStorage.setItem(`playerTimes_${teamId}`, JSON.stringify(App.data.playerTimes));
  },
  
  saveSeasonData() {
    const teamId = this.getCurrentTeamId();
    localStorage.setItem(`seasonData_${teamId}`, JSON.stringify(App.data.seasonData));
  },
  
  saveAll() {
    this.saveSelectedPlayers();
    this.saveStatsData();
    this.savePlayerTimes();
    this.saveSeasonData();
  },
  
  getCurrentPage() {
    return localStorage.getItem("currentPage") || "selection";
  },
  
  setCurrentPage(page) {
    localStorage.setItem("currentPage", page);
  }
};
