// Player Selection Modul
App.playerSelection = {
  container: null,
  confirmBtn: null,
  
  init() {
    this.container = document.getElementById("playerList");
    this.confirmBtn = document.getElementById("confirmSelection");
    
    if (this.container) {
      this.render();
    }
    
    if (this.confirmBtn) {
      this.confirmBtn.addEventListener("click", () => this.handleConfirm());
    }
  },
  
  render() {
    if (!this.container) return;
    
    this.container.innerHTML = "";
    
    const sortedPlayers = App.data.players.slice().sort((a, b) => {
      const na = Number(a.num) || 999;
      const nb = Number(b.num) || 999;
      return na - nb;
    });
    
    sortedPlayers.forEach((p, idx) => {
      const li = document.createElement("li");
      const checkboxId = `player-chk-${idx}`;
      const checked = App.data.selectedPlayers.find(sp => sp.name === p.name) ? "checked" : "";
      
      let numAreaHtml = "";
      if (p.num !== "" && p.num !== null && p.num !== undefined && String(p.num).trim() !== "") {
        numAreaHtml = `<div class="num" style="flex:0 0 48px;text-align:center;"><strong>${App.helpers.escapeHtml(p.num)}</strong></div>`;
      } else {
        numAreaHtml = `<div style="flex:0 0 64px;text-align:center;">
                         <input class="num-input" type="text" inputmode="numeric" maxlength="3" placeholder="Nr." value="" style="width:56px;padding:6px;border-radius:6px;border:1px solid #444;">
                       </div>`;
      }
      
      li.innerHTML = `
        <label class="player-line" style="display:flex;align-items:center;gap:8px;width:100%;" for="${checkboxId}">
          <input id="${checkboxId}" type="checkbox" value="${App.helpers.escapeHtml(p.name)}" ${checked} style="flex:0 0 auto">
          ${numAreaHtml}
          <div class="name" style="flex:1;color:#eee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"><strong>${App.helpers.escapeHtml(p.name)}</strong></div>
        </label>`;
      this.container.appendChild(li);
    });
    
    const customSelected = App.data.selectedPlayers.filter(sp => 
      !App.data.players.some(bp => bp.name === sp.name)
    );
    
    for (let i = 0; i < 5; i++) {
      const pre = customSelected[i];
      const li = document.createElement("li");
      const chkId = `custom-chk-${i}`;
      
      li.innerHTML = `
        <label class="custom-line" style="display:flex;align-items:center;gap:8px;width:100%;" for="${chkId}">
          <input id="${chkId}" type="checkbox" class="custom-checkbox" ${pre ? "checked" : ""} style="flex:0 0 auto">
          <input type="text" class="custom-num" inputmode="numeric" maxlength="3" placeholder="Nr." value="${App.helpers.escapeHtml(pre?.num || "")}" style="width:56px;flex:0 0 auto;padding:6px;border-radius:6px;border:1px solid #444;">
          <input type="text" class="custom-name" placeholder="Eigener Spielername" value="${App.helpers.escapeHtml(pre?.name || "")}" style="flex:1;min-width:0;border-radius:6px;border:1px solid #444;padding:6px;">
        </label>`;
      this.container.appendChild(li);
    }
  },
  
  handleConfirm() {
    try {
      App.data.selectedPlayers = [];
      
      const checkedBoxes = Array.from(this.container.querySelectorAll("input[type='checkbox']:not(.custom-checkbox)"))
        .filter(chk => chk.checked);
      
      checkedBoxes.forEach(chk => {
        const li = chk.closest("li");
        const name = chk.value;
        let num = "";
        
        if (li) {
          const numInput = li.querySelector(".num-input");
          if (numInput) {
            num = numInput.value.trim();
          } else {
            const numDiv = li.querySelector(".num");
            if (numDiv) num = numDiv.textContent.trim();
          }
        }
        
        App.data.selectedPlayers.push({ num: num || "", name: name });
      });
      
      const customLis = Array.from(this.container.querySelectorAll("li")).slice(App.data.players.length);
      customLis.forEach(li => {
        const chk = li.querySelector(".custom-checkbox");
        const numInput = li.querySelector(".custom-num");
        const nameInput = li.querySelector(".custom-name");
        
        if (chk && chk.checked && nameInput && nameInput.value.trim() !== "") {
          App.data.selectedPlayers.push({
            num: numInput ? (numInput.value.trim() || "") : "",
            name: nameInput.value.trim()
          });
        }
      });
      
      App.storage.saveSelectedPlayers();
      
      App.data.selectedPlayers.forEach(p => {
        if (!App.data.statsData[p.name]) {
          App.data.statsData[p.name] = {};
        }
        App.data.categories.forEach(c => {
          if (App.data.statsData[p.name][c] === undefined) {
            App.data.statsData[p.name][c] = 0;
          }
        });
      });
      
      App.storage.saveStatsData();
      
      // KORRIGIERT: Prüfe ob App.showPage existiert
      if (typeof App.showPage === 'function') {
        App.showPage("stats");
      } else {
        console.warn("App.showPage ist noch nicht definiert");
        // Fallback: Direkt die Seiten umschalten
        document.getElementById("playerSelectionPage").style.display = "none";
        document.getElementById("statsPage").style.display = "block";
      }
      
      if (App.statsTable && typeof App.statsTable.render === 'function') {
        App.statsTable.render();
      }
      
    } catch (err) {
      console.error("Error in confirmSelection:", err);
      alert("Fehler beim Bestätigen (siehe Konsole): " + (err?.message || err));
    }
  }
};
