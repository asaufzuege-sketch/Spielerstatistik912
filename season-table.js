// Season Table Modul
App.seasonTable = {
  container: null,
  sortState: { index: null, asc: true },

  init() {
    this.container = document.getElementById("seasonContainer");

    // Event Listeners
    document.getElementById("exportSeasonFromStatsBtn")?.addEventListener("click", () => {
      this.exportFromStats();
    });

    document.getElementById("exportSeasonBtn")?.addEventListener("click", () => {
      this.exportCSV();
    });

    document.getElementById("resetSeasonBtn")?.addEventListener("click", () => {
      this.reset();
    });
  },

  render() {
    if (!this.container) return;

    // Nur leeren, KEINE inline Layout-Styles setzen – Scroll steuert CSS (#seasonContainer)
    this.container.innerHTML = "";

    const headerCols = [
      "Nr", "Spieler", "Games",
      "Goals", "Assists", "Points", "+/-", "Ø +/-",
      "Shots", "Shots/Game", "Shots %", "Goals/Game", "Points/Game",
      "Penalty", "Goal Value", "FaceOffs", "FaceOffs Won", "FaceOffs %", "Time",
      "MVP", "MVP Points"
    ];

    // Tabelle direkt in den Container (kein zusätzlicher Wrapper) – wie Goal Value
    const table = document.createElement("table");
    table.className = "season-table"; // eigener Klassenname für gezieltes CSS

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    headerCols.forEach((h, idx) => {
      const th = document.createElement("th");
      th.textContent = h;
      th.dataset.colIndex = idx;
      th.className = "sortable";
      th.style.cursor = "pointer";

      const arrow = document.createElement("span");
      arrow.className = "sort-arrow";
      arrow.style.marginLeft = "6px";
      th.appendChild(arrow);

      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    // Sicherstellen, dass GoalValue-Daten da sind (falls verwendet)
    if (App.goalValue && typeof App.goalValue.ensureDataForSeason === "function") {
      App.goalValue.ensureDataForSeason();
    }

    const rows = Object.keys(App.data.seasonData).map(name => {
      const d = App.data.seasonData[name];
      const games = Number(d.games || 0);
      const goals = Number(d.goals || 0);
      const assists = Number(d.assists || 0);
      const points = goals + assists;
      const plusMinus = Number(d.plusMinus || 0);
      const shots = Number(d.shots || 0);
      const penalty = Number(d.penaltys || 0);
      const faceOffs = Number(d.faceOffs || 0);
      const faceOffsWon = Number(d.faceOffsWon || 0);
      const faceOffPercent = faceOffs ? Math.round((faceOffsWon / faceOffs) * 100) : 0;
      const timeSeconds = Number(d.timeSeconds || 0);

      const avgPlusMinus = games ? (plusMinus / games) : 0;
      const shotsPerGame = games ? (shots / games) : 0;
      const goalsPerGame = games ? (goals / games) : 0;
      const pointsPerGame = games ? (points / games) : 0;
      const shotsPercent = shots ? Math.round((goals / shots) * 100) : 0;

      let goalValue = "";
      try {
        if (App.goalValue && typeof App.goalValue.computeValueForPlayer === "function") {
          goalValue = App.goalValue.computeValueForPlayer(d.name) || Number(d.goalValue || 0);
        } else {
          goalValue = Number(d.goalValue || 0);
        }
      } catch (e) {
        goalValue = Number(d.goalValue || 0);
      }

      const assistsPerGame = games ? (assists / games) : 0;
      const penaltyPerGame = games ? (penalty / games) : 0;
      const gvNum = Number(goalValue || 0);

      const mvpPointsNum = (
        (assistsPerGame * 8) +
        (avgPlusMinus * 0.5) +
        (shotsPerGame * 0.5) +
        (goalsPerGame + (games ? (gvNum / games) * 10 : 0)) -
        (penaltyPerGame * 1.2)
      );

      const mvpPointsRounded = Number(mvpPointsNum.toFixed(1));

      const cells = [
        d.num || "",
        d.name,
        games,
        goals,
        assists,
        points,
        plusMinus,
        Number(avgPlusMinus.toFixed(1)),
        shots,
        Number(shotsPerGame.toFixed(1)),
        String(shotsPercent) + "%",
        Number(goalsPerGame.toFixed(1)),
        Number(pointsPerGame.toFixed(1)),
        penalty,
        goalValue,
        faceOffs,
        faceOffsWon,
        String(faceOffPercent) + "%",
        App.helpers.formatTimeMMSS(timeSeconds),
        "",
        ""
      ];

      return {
        name: d.name,
        num: d.num || "",
        cells,
        raw: { games, goals, assists, points, plusMinus, shots, penalty, faceOffs, faceOffsWon, faceOffPercent, timeSeconds, goalValue },
        mvpPointsRounded
      };
    });

    // MVP Rank berechnen und eintragen
    const sortedByMvp = rows.slice().sort((a, b) => (b.mvpPointsRounded || 0) - (a.mvpPointsRounded || 0));
    const uniqueScores = [...new Set(sortedByMvp.map(r => r.mvpPointsRounded))];
    const scoreToRank = {};
    uniqueScores.forEach((s, idx) => { scoreToRank[s] = idx + 1; });

    rows.forEach(r => {
      const mvpIdx = headerCols.length - 2;
      const mvpPointsIdx = headerCols.length - 1;
      r.cells[mvpIdx] = (scoreToRank[r.mvpPointsRounded] || "");
      r.cells[mvpPointsIdx] = Number(r.mvpPointsRounded.toFixed(1));
    });

    // Sortieren
    let displayRows = rows.slice();
    if (this.sortState.index === null) {
      displayRows.sort((a, b) => (b.raw.points || 0) - (a.raw.points || 0));
    } else {
      const idx = this.sortState.index;
      displayRows.sort((a, b) => {
        const va = App.helpers.parseForSort(a.cells[idx]);
        const vb = App.helpers.parseForSort(b.cells[idx]);
        if (typeof va === "number" && typeof vb === "number") {
          return this.sortState.asc ? va - vb : vb - va;
        }
        if (va < vb) return this.sortState.asc ? -1 : 1;
        if (va > vb) return this.sortState.asc ? 1 : -1;
        return 0;
      });
    }

    // Body rendern
    displayRows.forEach(r => {
      const tr = document.createElement("tr");
      r.cells.forEach((c, cellIdx) => {
        const td = document.createElement("td");
        td.textContent = c;
        if (cellIdx === 1) {
          td.style.textAlign = "left";
          td.style.fontWeight = "700";
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    // Total-Zeile
    if (rows.length > 0) {
      const sums = {
        games: 0, goals: 0, assists: 0, points: 0, plusMinus: 0,
        shots: 0, penalty: 0, faceOffs: 0, faceOffsWon: 0, timeSeconds: 0
      };

      rows.forEach(r => {
        const rs = r.raw;
        sums.games += rs.games;
        sums.goals += rs.goals;
        sums.assists += rs.assists;
        sums.points += rs.points;
        sums.plusMinus += rs.plusMinus;
        sums.shots += rs.shots;
        sums.penalty += rs.penalty;
        sums.faceOffs += rs.faceOffs;
        sums.faceOffsWon += rs.faceOffsWon;
        sums.timeSeconds += rs.timeSeconds;
      });

      const count = rows.length;
      const avgShotsPercent = sums.shots ? Math.round((sums.goals / sums.shots) * 100) : 0;
      const avgFacePercent = sums.faceOffs ? Math.round((sums.faceOffsWon / sums.faceOffs) * 100) : 0;
      const avgTime = Math.round(sums.timeSeconds / count);

      const totalCells = new Array(headerCols.length).fill("");
      totalCells[1] = "Total Ø";
      totalCells[2] = (sums.games / count).toFixed(1);
      totalCells[3] = (sums.goals / count).toFixed(1);
      totalCells[4] = (sums.assists / count).toFixed(1);
      totalCells[5] = (sums.points / count).toFixed(1);
      totalCells[6] = (sums.plusMinus / count).toFixed(1);
      totalCells[7] = (sums.plusMinus / count).toFixed(1);
      totalCells[8] = (sums.shots / count).toFixed(1);
      totalCells[9] = ((sums.shots / count) / ((sums.games / count) || 1)).toFixed(1);
      totalCells[10] = String(avgShotsPercent) + "%";
      totalCells[11] = ((sums.goals / count) / ((sums.games / count) || 1)).toFixed(1);
      totalCells[12] = ((sums.points / count) / ((sums.games / count) || 1)).toFixed(1);
      totalCells[13] = (sums.penalty / count).toFixed(1);
      totalCells[14] = "";
      totalCells[15] = (sums.faceOffs / count).toFixed(1);
      totalCells[16] = (sums.faceOffsWon / count).toFixed(1);
      totalCells[17] = String(avgFacePercent) + "%";
      totalCells[18] = App.helpers.formatTimeMMSS(avgTime);
      totalCells[19] = "";
      totalCells[20] = "";

      const trTotal = document.createElement("tr");
      trTotal.className = "total-row";
      totalCells.forEach((c, idx) => {
        const td = document.createElement("td");
        td.textContent = c;
        if (idx === 1) {
          td.style.textAlign = "left";
          td.style.fontWeight = "700";
        }
        trTotal.appendChild(td);
      });
      tbody.appendChild(trTotal);
    }

    table.appendChild(tbody);

    // Wichtig: Tabelle direkt in den Container (nur EIN Scroll-Container)
    this.container.appendChild(table);

    // Sort UI
    this.updateSortUI(table);
    table.querySelectorAll("th.sortable").forEach(th => {
      th.addEventListener("click", () => {
        const idx = Number(th.dataset.colIndex);
        if (this.sortState.index === idx) {
          this.sortState.asc = !this.sortState.asc;
        } else {
          this.sortState.index = idx;
          this.sortState.asc = true;
        }
        this.render();
      });
    });
  },

  updateSortUI(table) {
    const ths = table.querySelectorAll("th.sortable");
    ths.forEach(th => {
      const arrow = th.querySelector(".sort-arrow");
      if (!arrow) return;
      const idx = Number(th.dataset.colIndex);
      if (this.sortState.index === idx) {
        arrow.textContent = this.sortState.asc ? "▴" : "▾";
      } else {
        arrow.textContent = "";
      }
    });
  },

  exportFromStats() {
    if (!confirm("Spiel zu Season exportieren?")) return;

    if (!App.data.selectedPlayers.length) {
      alert("Keine Spieler ausgewählt.");
      return;
    }

    App.data.selectedPlayers.forEach(p => {
      const name = p.name;
      const stats = App.data.statsData[name] || {};
      const timeSeconds = Number(App.data.playerTimes[name] || 0);

      if (!App.data.seasonData[name]) {
        App.data.seasonData[name] = {
          num: p.num || "",
          name: name,
          games: 0,
          goals: 0,
          assists: 0,
          plusMinus: 0,
          shots: 0,
          penaltys: 0,
          faceOffs: 0,
          faceOffsWon: 0,
          timeSeconds: 0,
          goalValue: 0
        };
      }

      const sd = App.data.seasonData[name];
      sd.games += 1;
      sd.goals += Number(stats.Goals || 0);
      sd.assists += Number(stats.Assist || 0);
      sd.plusMinus += Number(stats["+/-"] || 0);
      sd.shots += Number(stats.Shot || 0);
      sd.penaltys += Number(stats.Penaltys || 0);
      sd.faceOffs += Number(stats.FaceOffs || 0);
      sd.faceOffsWon += Number(stats["FaceOffs Won"] || 0);
      sd.timeSeconds += timeSeconds;
      sd.num = p.num || sd.num || "";

      try {
        if (App.goalValue && typeof App.goalValue.computeValueForPlayer === "function") {
          sd.goalValue = App.goalValue.computeValueForPlayer(name) || sd.goalValue || 0;
        } else {
          sd.goalValue = sd.goalValue || 0;
        }
      } catch (e) {
        sd.goalValue = sd.goalValue || 0;
      }
    });

    App.storage.saveSeasonData();

    const keep = confirm("Spiel wurde in Season exportiert. Daten in Game beibehalten? (OK = Ja)");
    if (!keep) {
      App.data.selectedPlayers.forEach(p => {
        const name = p.name;
        if (!App.data.statsData[name]) App.data.statsData[name] = {};
        App.data.categories.forEach(c => {
          App.data.statsData[name][c] = 0;
        });
        App.data.playerTimes[name] = 0;
      });
      App.storage.saveStatsData();
      App.storage.savePlayerTimes();
      if (App.statsTable && typeof App.statsTable.render === "function") {
        App.statsTable.render();
      }
    }

    if (typeof App.showPage === "function") {
      App.showPage("season");
    }
    this.render();
  },

  exportCSV() {
    try {
      const names = Object.keys(App.data.seasonData || {});
      if (!names.length) {
        alert("Keine Season-Daten vorhanden.");
        return;
      }

      const header = [
        "Nr","Spieler","Games",
        "Goals","Assists","Points","+/-","Ø +/-",
        "Shots","Shots/Game","Shots %","Goals/Game","Points/Game",
        "Penalty","Goal Value","FaceOffs","FaceOffs Won","FaceOffs %","Time",
        "MVP","MVP Points"
      ];
      const rows = [header];
      const tempRows = [];

      names.forEach(name => {
        const d = App.data.seasonData[name] || {};
        const games = Number(d.games || 0);
        const goals = Number(d.goals || 0);
        const assists = Number(d.assists || 0);
        const points = goals + assists;
        const plusMinus = Number(d.plusMinus || 0);
        const shots = Number(d.shots || 0);
        const penalty = Number(d.penaltys || 0);
        const faceOffs = Number(d.faceOffs || 0);
        const faceOffsWon = Number(d.faceOffsWon || 0);
        const faceOffsPercent = faceOffs ? Math.round((faceOffsWon / faceOffs) * 100) : 0;
        const timeSeconds = Number(d.timeSeconds || 0);

        const avgPlusMinus = games ? (plusMinus / games) : 0;
        const shotsPerGame = games ? (shots / games) : 0;
        const goalsPerGame = games ? (goals / games) : 0;
        const pointsPerGame = games ? (points / games) : 0;
        const shotsPercent = shots ? Math.round((goals / shots) * 100) : 0;

        let goalValue = 0;
        try {
          if (App.goalValue && typeof App.goalValue.computeValueForPlayer === "function") {
            goalValue = Number(App.goalValue.computeValueForPlayer(name) || 0);
          } else {
            goalValue = Number(d.goalValue || 0);
          }
        } catch {
          goalValue = Number(d.goalValue || 0);
        }

        const assistsPerGame = games ? (assists / games) : 0;
        const penaltyPerGame = games ? (penalty / games) : 0;
        const gvNum = Number(goalValue || 0);
        const mvpPointsNum = (
          (assistsPerGame * 8) +
          (avgPlusMinus * 0.5) +
          (shotsPerGame * 0.5) +
          (goalsPerGame + (games ? (gvNum / games) * 10 : 0)) -
          (penaltyPerGame * 1.2)
        );
        const mvpPointsRounded = Number(mvpPointsNum.toFixed(1));

        const row = [
          d.num || "",
          name,
          games,
          goals,
          assists,
          points,
          plusMinus,
          avgPlusMinus.toFixed(1),
          shots,
          shotsPerGame.toFixed(1),
          String(shotsPercent) + "%",
          goalsPerGame.toFixed(1),
          pointsPerGame.toFixed(1),
          penalty,
          goalValue,
          faceOffs,
          faceOffsWon,
          String(faceOffsPercent) + "%",
          App.helpers.formatTimeMMSS(timeSeconds),
          "",
          mvpPointsRounded
        ];
        tempRows.push(row);
      });

      const MVP_POINTS_IDX = header.indexOf("MVP Points");
      const MVP_IDX = header.indexOf("MVP");
      const allPoints = tempRows.map(r => Number(r[MVP_POINTS_IDX]) || 0);
      const sortedDescUnique = [...new Set(allPoints.slice().sort((a,b) => b - a))];

      function rankFor(val) {
        const i = sortedDescUnique.indexOf(val);
        return i === -1 ? "" : (i + 1);
      }

      tempRows.forEach(r => {
        r[MVP_IDX] = rankFor(Number(r[MVP_POINTS_IDX]) || 0);
      });

      rows.push(...tempRows);

      const count = tempRows.length;
      if (count) {
        const sums = {
          games: 0, goals: 0, assists: 0, points: 0, plusMinus: 0,
          shots: 0, penalty: 0, faceOffs: 0, faceOffsWon: 0, timeSeconds: 0
        };

        tempRows.forEach(r => {
          sums.games += Number(r[2]) || 0;
          sums.goals += Number(r[3]) || 0;
          sums.assists += Number(r[4]) || 0;
          sums.points += Number(r[5]) || 0;
          sums.plusMinus += Number(r[6]) || 0;
          sums.shots += Number(r[8]) || 0;
          sums.penalty += Number(r[13]) || 0;
          sums.faceOffs += Number(r[15]) || 0;
          sums.faceOffsWon += Number(r[16]) || 0;
          const t = r[18] || "00:00";
          if (/^\d{2}:\d{2}$/.test(t)) {
            const parts = t.split(":");
            const mm = Number(parts[0]) || 0;
            const ss = Number(parts[1]) || 0;
            sums.timeSeconds += (mm * 60 + ss);
          }
        });

        const avgShotsPercent = sums.shots ? Math.round((sums.goals / sums.shots) * 100) : 0;
        const avgFacePercent = sums.faceOffs ? Math.round((sums.faceOffsWon / sums.faceOffs) * 100) : 0;
        const avgTime = Math.round(sums.timeSeconds / count);

        const totalRow = [
          "", "Total Ø",
          (sums.games / count).toFixed(1),
          (sums.goals / count).toFixed(1),
          (sums.assists / count).toFixed(1),
          (sums.points / count).toFixed(1),
          (sums.plusMinus / count).toFixed(1),
          (sums.plusMinus / count).toFixed(1),
          (sums.shots / count).toFixed(1),
          ((sums.shots / count) / ((sums.games / count) || 1)).toFixed(1),
          String(avgShotsPercent) + "%",
          ((sums.goals / count) / ((sums.games / count) || 1)).toFixed(1),
          ((sums.points / count) / ((sums.games / count) || 1)).toFixed(1),
          (sums.penalty / count).toFixed(1),
          "",
          (sums.faceOffs / count).toFixed(1),
          (sums.faceOffsWon / count).toFixed(1),
          String(avgFacePercent) + "%",
          App.helpers.formatTimeMMSS(avgTime),
          "",
          ""
        ];
        rows.push(totalRow);
      }

      const csv = rows.map(r => r.join(";")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "season.csv";
      a.click();
      URL.revokeObjectURL(a.href);
      alert("Season CSV exportiert.");
    } catch (e) {
      console.error("Season CSV Export fehlgeschlagen:", e);
      alert("Fehler beim Season-Export (siehe Konsole).");
    }
  },

  reset() {
    if (!confirm("Season-Daten löschen?")) return;

    App.data.seasonData = {};
    localStorage.removeItem("seasonData");
    this.render();
    alert("Season-Daten gelöscht.");
  }
};
