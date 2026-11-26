(() => {
  const config = typeof weiduCupData === "object" && weiduCupData ? weiduCupData : {};
  const rawMode = String(config.mode || "pyramid").trim();
  const mode =
    rawMode === "coming-soon"
      ? "coming-soon"
      : rawMode === "bracket"
      ? "bracket"
      : "pyramid";

  const teaserEl = document.getElementById("cup-coming-soon");
  const appEl = document.getElementById("cup-bracket-app");

  document.body.dataset.cupMode = mode;
  if (mode === "coming-soon") {
    if (teaserEl) teaserEl.hidden = false;
    if (appEl) appEl.hidden = true;
    return;
  }
  if (teaserEl) teaserEl.hidden = true;
  if (appEl) appEl.hidden = false;

  const mainEl = document.getElementById("apple-main");
  const viewPyramidEl = document.getElementById("view-pyramid");
  const viewSymmetricEl = document.getElementById("view-symmetric");
  const symmetricZoneTabsEl = document.getElementById("symmetric-zone-tabs");

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el && text) el.textContent = text;
  };

  const normKey = (name) => String(name || "").replace(/\s+/g, "").trim();

  // Align 2-character Chinese names cleanly with 3-character Chinese names (exact 3em width)
  function buildAlignedNameNode(rawName) {
    const clean = normKey(rawName);
    if (/^[\u4e00-\u9fff]{2,3}$/.test(clean)) {
      const wrap = document.createElement("span");
      wrap.className = "cjk-name-align";
      Array.from(clean).forEach((ch) => {
        const span = document.createElement("span");
        span.textContent = ch;
        wrap.appendChild(span);
      });
      return wrap;
    }
    const fallback = document.createElement("span");
    fallback.textContent = String(rawName || "").trim();
    return fallback;
  }

  // Parse single-game [a, b] or multi-game [[a1, b1], [a2, b2], ...] match score
  function parseMatchScore(rec) {
    if (!rec) return { hasScore: false, games: [], diff: null, winnerSide: 0 };
    const raw = Array.isArray(rec.games) ? rec.games : rec.score;
    const games = [];

    if (Array.isArray(raw) && raw.length > 0) {
      if (Array.isArray(raw[0])) {
        raw.forEach((g) => {
          if (Array.isArray(g) && g.length >= 2) {
            const a = Number(g[0]);
            const b = Number(g[1]);
            if (Number.isFinite(a) && Number.isFinite(b)) {
              games.push([a, b]);
            }
          }
        });
      } else if (raw.length >= 2) {
        const a = Number(raw[0]);
        const b = Number(raw[1]);
        if (Number.isFinite(a) && Number.isFinite(b)) {
          games.push([a, b]);
        }
      }
    }

    if (!games.length) {
      return { hasScore: false, games: [], diff: null, winnerSide: 0 };
    }

    let winsA = 0;
    let winsB = 0;
    let diff = 0;
    games.forEach(([a, b]) => {
      if (a > b) winsA += 1;
      else if (b > a) winsB += 1;
      diff += a - b;
    });

    const winnerSide =
      winsA > winsB ? 1 : winsB > winsA ? -1 : diff > 0 ? 1 : diff < 0 ? -1 : 0;

    return { hasScore: true, games, diff, winnerSide };
  }

  const leftZoneName = config.leftZoneName || "上半区";
  const rightZoneName = config.rightZoneName || "下半区";
  setText("nav-tournament-name", config.title || "第一届微度杯");
  setText("bracket-eyebrow", config.eyebrow || "WEIDU CUP · TOURNAMENT");
  setText("bracket-main-title", config.title || "第一届微度杯");
  setText("tab-left-zone", leftZoneName);
  setText("tab-right-zone", rightZoneName);

  // Theme toggle (supports defaultTheme in config + remembers manual toggle)
  const themeBtn = document.getElementById("apple-theme-toggle");
  const themeLabel = document.getElementById("apple-theme-label");
  const savedTheme = localStorage.getItem("weidu-cup-apple-theme");
  const initialTheme = savedTheme || (config.defaultTheme === "light" ? "light" : "dark");
  const applyTheme = (theme) => {
    const next = theme === "dark" ? "dark" : "light";
    document.body.dataset.appleTheme = next;
    if (themeLabel) {
      themeLabel.textContent = next === "dark" ? "浅色外观" : "深色外观";
    }
  };
  applyTheme(initialTheme);
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const next = document.body.dataset.appleTheme === "dark" ? "light" : "dark";
      localStorage.setItem("weidu-cup-apple-theme", next);
      applyTheme(next);
    });
  }

  // Shared helper: evaluate a single match
  function resolveMatch(id, teamA, teamB, rawScore) {
    const nameA = typeof teamA === "string" && teamA.trim() ? teamA.trim() : null;
    const nameB = typeof teamB === "string" && teamB.trim() ? teamB.trim() : null;

    let scoreA = null;
    let scoreB = null;
    if (Array.isArray(rawScore) && rawScore.length >= 2) {
      const a = Number(rawScore[0]);
      const b = Number(rawScore[1]);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        scoreA = a;
        scoreB = b;
      }
    }

    let winner = null;
    let winnerIndex = -1;
    if (nameA && nameB && scoreA !== null && scoreB !== null && scoreA !== scoreB) {
      winnerIndex = scoreA > scoreB ? 0 : 1;
      winner = winnerIndex === 0 ? nameA : nameB;
    }

    return {
      id,
      teams: [nameA, nameB],
      scores: [scoreA, scoreB],
      winner,
      winnerIndex,
      decided: winner !== null
    };
  }

  // Shared Match Card Builder (Names + Scores only)
  function createMatchCard(match) {
    const card = document.createElement("article");
    card.className = "match-card";
    card.dataset.matchId = match.id;

    match.teams.forEach((teamName, idx) => {
      const slot = document.createElement("div");
      const isTbd = !teamName;
      const isWinner = match.winnerIndex === idx;
      const isLoser = match.decided && match.winnerIndex !== idx;

      slot.className = "team-slot";
      if (isTbd) slot.classList.add("is-tbd");
      if (isWinner) slot.classList.add("is-winner");
      if (isLoser) slot.classList.add("is-loser");
      if (teamName) slot.dataset.teamName = teamName;

      const nameWrap = document.createElement("div");
      nameWrap.className = "team-name-wrap";

      const dot = document.createElement("span");
      dot.className = "win-dot";
      dot.setAttribute("aria-hidden", "true");

      const nameSpan = document.createElement("span");
      nameSpan.className = "team-name";
      nameSpan.textContent = teamName || "待定";
      if (teamName) nameSpan.title = teamName;

      nameWrap.append(dot, nameSpan);

      const scoreSpan = document.createElement("span");
      scoreSpan.className = "team-score";
      scoreSpan.textContent = match.scores[idx] !== null ? String(match.scores[idx]) : "—";

      slot.append(nameWrap, scoreSpan);
      card.appendChild(slot);
    });

    return card;
  }

  function createCrownCard(finalMatch, idAttr, extraClass) {
    const crown = document.createElement("div");
    crown.className = `champion-crown-card${extraClass ? ` ${extraClass}` : ""}${finalMatch.decided ? " has-champion" : ""}`;
    crown.id = idAttr;
    if (finalMatch.winner) {
      crown.dataset.teamName = finalMatch.winner;
    }

    const trophy = document.createElement("div");
    trophy.className = "trophy-icon";
    trophy.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M7 6H4.5a1.5 1.5 0 0 0-1.5 1.5v.5a4 4 0 0 0 4 4M17 6h2.5A1.5 1.5 0 0 1 21 7.5V8a4 4 0 0 1-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

    const crownLabel = document.createElement("span");
    crownLabel.className = "champion-label";
    crownLabel.textContent = "CHAMPION · 总冠军";

    const crownName = document.createElement("div");
    crownName.className = "champion-name";
    crownName.textContent = finalMatch.winner || "冠军虚位以待";

    crown.append(trophy, crownLabel, crownName);
    return crown;
  }

  function createFinalsDuelCard(finalMatch, leftLabel, rightLabel) {
    const duel = document.createElement("article");
    duel.className = "finals-duel-card";
    duel.dataset.matchId = finalMatch.id;

    const badge = document.createElement("div");
    badge.className = "finals-duel-badge";
    badge.textContent = "GRAND FINALS · 巅峰决战";

    const duelGrid = document.createElement("div");
    duelGrid.className = "finals-duel-grid";

    const labels = [leftLabel, rightLabel];
    [0, 1].forEach((idx) => {
      if (idx === 1) {
        const vs = document.createElement("span");
        vs.className = "finals-vs";
        vs.textContent = "VS";
        duelGrid.appendChild(vs);
      }

      const teamName = finalMatch.teams[idx];
      const box = document.createElement("div");
      box.className = "finals-contender";
      if (!teamName) box.classList.add("is-tbd");
      if (finalMatch.winnerIndex === idx) box.classList.add("is-winner");
      if (finalMatch.decided && finalMatch.winnerIndex !== idx) box.classList.add("is-loser");
      if (teamName) box.dataset.teamName = teamName;

      const zSpan = document.createElement("span");
      zSpan.className = "finals-contender-zone";
      zSpan.textContent = labels[idx];

      const nSpan = document.createElement("span");
      nSpan.className = "finals-contender-name";
      nSpan.textContent = teamName || "待定";
      if (teamName) nSpan.title = teamName;

      const sSpan = document.createElement("span");
      sSpan.className = "finals-contender-score";
      sSpan.textContent = finalMatch.scores[idx] !== null ? String(finalMatch.scores[idx]) : "—";

      box.append(zSpan, nSpan, sSpan);
      duelGrid.appendChild(box);
    });

    duel.append(badge, duelGrid);
    return duel;
  }

  // ==========================================================================
  // DATA BUILDER 1: PYRAMID + PERSONAL STANDINGS (Supports 预备赛 & 正式赛)
  // ==========================================================================
  const stageTabsEl = document.getElementById("tournament-stage-tabs");
  const initialHashStage = window.location.hash === "#official" ? "official" : window.location.hash === "#preliminary" ? "preliminary" : null;
  let activeStageKey =
    initialHashStage || (config.defaultStage === "official" ? "official" : "preliminary");

  let standingsList = [];
  let pQuarters = [];
  let pSemis = [];
  let pFinal = null;
  let activeStageCfg = {};

  function buildPyramidStageData(stageKey) {
    activeStageCfg =
      stageKey === "official"
        ? config.officialStage || {}
        : config.pyramidStage || {};

    const stageEyebrow = activeStageCfg.eyebrow || config.eyebrow || "WEIDU CUP · TOURNAMENT";
    setText("bracket-eyebrow", stageEyebrow);

    const rawStandings = Array.isArray(activeStageCfg.standings) ? activeStageCfg.standings : [];
    standingsList = rawStandings.map((item, i) => ({
      name: item && item.name ? String(item.name).trim() : `选手 ${i + 1}`,
      points: Number.isFinite(Number(item && item.points)) ? Number(item.points) : 0,
      goalDiff: Number.isFinite(Number(item && item.goalDiff)) ? Number(item.goalDiff) : 0
    }));

    if (activeStageCfg.autoSortStandings !== false) {
      standingsList.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.goalDiff - a.goalDiff;
      });
    }

    const pPlayers = Array.from({ length: 8 }, (_, idx) => {
      const raw = Array.isArray(activeStageCfg.players) ? activeStageCfg.players[idx] : null;
      return typeof raw === "string" && raw.trim() ? raw.trim() : null;
    });
    const pScores = activeStageCfg.scores || {};
    pQuarters = Array.from({ length: 4 }, (_, i) =>
      resolveMatch(
        `P-q-${i}`,
        pPlayers[i * 2],
        pPlayers[i * 2 + 1],
        Array.isArray(pScores.quarter) ? pScores.quarter[i] : null
      )
    );
    pSemis = Array.from({ length: 2 }, (_, i) =>
      resolveMatch(
        `P-s-${i}`,
        pQuarters[i * 2].winner,
        pQuarters[i * 2 + 1].winner,
        Array.isArray(pScores.semi) ? pScores.semi[i] : null
      )
    );
    pFinal = resolveMatch("P-GF", pSemis[0].winner, pSemis[1].winner, pScores.final);
  }

  buildPyramidStageData(activeStageKey);

  function renderStandingsTable() {
    const tbody = document.getElementById("standings-tbody");
    const countEl = document.getElementById("standings-count");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (countEl) {
      countEl.textContent = `共 ${standingsList.length} 人`;
    }

    standingsList.forEach((row, idx) => {
      const rank = idx + 1;
      const tr = document.createElement("tr");
      tr.className = "standings-row";
      tr.dataset.rank = String(rank);
      tr.dataset.teamName = row.name;

      const tdRank = document.createElement("td");
      tdRank.className = "col-rank";
      const badge = document.createElement("span");
      badge.className = "rank-badge";
      badge.textContent = String(rank);
      tdRank.appendChild(badge);

      const tdName = document.createElement("td");
      tdName.className = "col-player standings-player-name";
      tdName.appendChild(buildAlignedNameNode(row.name));

      const tdPts = document.createElement("td");
      tdPts.className = "col-pts standings-pts-cell";
      const ptsPill = document.createElement("span");
      ptsPill.className = "standings-pts-pill";
      ptsPill.textContent = String(row.points);
      tdPts.appendChild(ptsPill);

      const tdGd = document.createElement("td");
      const gdFormatted = row.goalDiff > 0 ? `+${row.goalDiff}` : String(row.goalDiff);
      tdGd.className = `col-gd standings-gd-cell${
        row.goalDiff > 0 ? " is-positive" : row.goalDiff < 0 ? " is-negative" : ""
      }`;
      tdGd.textContent = gdFormatted;

      tr.append(tdRank, tdName, tdPts, tdGd);
      tbody.appendChild(tr);
    });
  }

  function parsePairNames(rawPair) {
    if (Array.isArray(rawPair)) {
      return rawPair.map((n) => String(n || "").trim()).filter(Boolean);
    }
    if (typeof rawPair === "string" && rawPair.trim()) {
      return rawPair.split(/[\/、,&+]/).map((n) => n.trim()).filter(Boolean);
    }
    return ["待定"];
  }

  function renderMatchRecords() {
    const tbody = document.getElementById("match-records-tbody");
    const countEl = document.getElementById("match-records-count");
    if (!tbody) return;
    tbody.innerHTML = "";

    const rawRecords = Array.isArray(activeStageCfg.matchRecords) ? activeStageCfg.matchRecords : [];
    const finishedCount = rawRecords.filter((r) => parseMatchScore(r).hasScore).length;

    if (countEl) {
      countEl.textContent = rawRecords.length
        ? `已完成 ${finishedCount} / ${rawRecords.length} 场`
        : "暂无记录";
    }

    if (!rawRecords.length) {
      const emptyTr = document.createElement("tr");
      emptyTr.className = "match-record-empty-row";
      const emptyTd = document.createElement("td");
      emptyTd.colSpan = 4;
      emptyTd.textContent = "暂无比赛记录";
      emptyTr.appendChild(emptyTd);
      tbody.appendChild(emptyTr);
      return;
    }

    rawRecords.forEach((rec) => {
      if (!rec) return;
      const tr = document.createElement("tr");
      tr.className = "match-record-row";

      // 1) 比赛时间
      const tdTime = document.createElement("td");
      tdTime.className = "col-mtime mtime-cell";
      tdTime.textContent = rec.time ? String(rec.time) : "待定";

      // Parse doubles players & score (supports single game and best-of-3 multi-game)
      const pairA = parsePairNames(rec.teamA);
      const pairB = parsePairNames(rec.teamB);
      const { hasScore, games, diff, winnerSide } = parseMatchScore(rec);

      // 2) 比赛人员（双打对阵 + 中间比分）
      const tdPlayers = document.createElement("td");
      tdPlayers.className = "col-mplayers";
      const duel = document.createElement("div");
      duel.className = "mplayers-duel";

      const buildPairNode = (names, sideClass, stateClass) => {
        const wrap = document.createElement("div");
        wrap.className = `mpair ${sideClass}${stateClass ? ` ${stateClass}` : ""}`;
        names.forEach((n) => {
          const chip = document.createElement("span");
          chip.className = "mplayer-chip";
          chip.appendChild(buildAlignedNameNode(n));
          if (n !== "待定") chip.dataset.teamName = n;
          wrap.appendChild(chip);
        });
        return wrap;
      };

      const stateA = hasScore && winnerSide > 0 ? "is-pair-winner" : hasScore && winnerSide < 0 ? "is-pair-loser" : "";
      const stateB = hasScore && winnerSide < 0 ? "is-pair-winner" : hasScore && winnerSide > 0 ? "is-pair-loser" : "";

      let scoreNode;
      if (!hasScore) {
        scoreNode = document.createElement("span");
        scoreNode.className = "mscore-pill is-pending";
        scoreNode.textContent = "VS";
      } else if (games.length === 1) {
        scoreNode = document.createElement("span");
        scoreNode.className = "mscore-pill";
        scoreNode.textContent = `${games[0][0]} : ${games[0][1]}`;
      } else {
        scoreNode = document.createElement("div");
        scoreNode.className = "mscore-group";
        games.forEach(([ga, gb]) => {
          const setPill = document.createElement("span");
          setPill.className = "mscore-pill is-set";
          setPill.textContent = `${ga} : ${gb}`;
          scoreNode.appendChild(setPill);
        });
      }

      duel.append(
        buildPairNode(pairA, "mpair-left", stateA),
        scoreNode,
        buildPairNode(pairB, "mpair-right", stateB)
      );
      tdPlayers.appendChild(duel);

      // 3) 比赛胜负
      const tdResult = document.createElement("td");
      tdResult.className = "col-mresult mresult-cell";
      const resBadge = document.createElement("span");
      resBadge.className = "mresult-badge";

      if (typeof rec.result === "string" && rec.result.trim()) {
        resBadge.textContent = rec.result.trim();
      } else if (!hasScore) {
        resBadge.classList.add("is-pending");
        resBadge.textContent = "待开赛";
      } else if (winnerSide > 0) {
        resBadge.textContent = `${pairA.map((n) => n.replace(/\s+/g, "")).join(" / ")} 胜`;
      } else if (winnerSide < 0) {
        resBadge.textContent = `${pairB.map((n) => n.replace(/\s+/g, "")).join(" / ")} 胜`;
      } else {
        resBadge.classList.add("is-draw");
        resBadge.textContent = "平局";
      }
      tdResult.appendChild(resBadge);

      // 4) 净胜球（左组合 / 右组合 对应正负净胜分，方便直接核对个人净胜球）
      const tdGd = document.createElement("td");
      tdGd.className = "col-mgd mgd-cell";
      if (typeof rec.goalDiff === "string" || typeof rec.goalDiff === "number") {
        tdGd.textContent = String(rec.goalDiff);
      } else if (!hasScore) {
        tdGd.innerHTML = `<span class="mgd-neg">—</span>`;
      } else if (diff === 0) {
        tdGd.textContent = "0";
      } else {
        const leftStr = diff > 0 ? `+${diff}` : String(diff);
        const rightStr = -diff > 0 ? `+${-diff}` : String(-diff);
        const leftCls = diff > 0 ? "mgd-pos" : "mgd-neg";
        const rightCls = -diff > 0 ? "mgd-pos" : "mgd-neg";
        tdGd.innerHTML = `<span class="${leftCls}">${leftStr}</span><span class="mgd-sep">/</span><span class="${rightCls}">${rightStr}</span>`;
      }

      tr.append(tdTime, tdPlayers, tdResult, tdGd);
      tbody.appendChild(tr);
    });
  }

  const pyramidBoardEl = document.getElementById("pyramid-board");
  const pyramidTiersEl = document.getElementById("pyramid-tiers");
  const pyramidSvgEl = document.getElementById("pyramid-svg");

  function renderPyramidBracket() {
    if (!pyramidTiersEl) return;
    pyramidTiersEl.innerHTML = "";

    const tierSpecs = [
      {
        step: "TOP · 桂冠",
        name: "总冠军",
        slots: 1,
        isCrown: true,
        nodes: [createCrownCard(pFinal, "pyramid-crown-card", "pyramid-crown-card")]
      },
      {
        step: "FINAL · 决战",
        name: "总决赛",
        slots: 1,
        nodes: [createFinalsDuelCard(pFinal, "左半区晋级", "右半区晋级")]
      },
      {
        step: "ROUND 2",
        name: "半决赛",
        slots: 2,
        nodes: pSemis.map((m) => createMatchCard(m))
      },
      {
        step: "ROUND 1",
        name: "八强首轮",
        slots: 4,
        nodes: pQuarters.map((m) => createMatchCard(m))
      }
    ];

    tierSpecs.forEach((t) => {
      const row = document.createElement("div");
      row.className = `pyramid-tier${t.isCrown ? " is-crown-tier" : ""}`;

      const label = document.createElement("div");
      label.className = "pyramid-tier-label";
      label.innerHTML = `
        <span class="pyramid-tier-step">${t.step}</span>
        <span class="pyramid-tier-name">${t.name}</span>
      `;

      const slotsWrap = document.createElement("div");
      slotsWrap.className = "pyramid-tier-slots";
      slotsWrap.dataset.slots = String(t.slots);
      t.nodes.forEach((node) => slotsWrap.appendChild(node));

      row.append(label, slotsWrap);
      pyramidTiersEl.appendChild(row);
    });
  }

  // Upward rounded-elbow SVG path from bottom child (x1, y1) UP to top parent (x2, y2)
  function buildUpwardElbowPath(x1, y1, x2, y2) {
    const midY = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (Math.abs(dx) < 1.5) {
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }
    const dirX = dx >= 0 ? 1 : -1;
    const dirY = dy >= 0 ? 1 : -1; // -1 when moving upwards
    const r = Math.min(8, Math.abs(dx) / 2, Math.abs(dy) / 4);

    return [
      `M ${x1} ${y1}`,
      `L ${x1} ${midY - dirY * r}`,
      `Q ${x1} ${midY} ${x1 + dirX * r} ${midY}`,
      `L ${x2 - dirX * r} ${midY}`,
      `Q ${x2} ${midY} ${x2} ${midY + dirY * r}`,
      `L ${x2} ${y2}`
    ].join(" ");
  }

  function drawPyramidConnectors() {
    if (!pyramidSvgEl || !pyramidBoardEl || !pyramidTiersEl) return;
    pyramidSvgEl.innerHTML = "";
    const boardRect = pyramidBoardEl.getBoundingClientRect();
    if (!boardRect.width || !boardRect.height) return;

    pyramidSvgEl.setAttribute("width", String(boardRect.width));
    pyramidSvgEl.setAttribute("height", String(boardRect.height));
    pyramidSvgEl.setAttribute("viewBox", `0 0 ${boardRect.width} ${boardRect.height}`);

    const getBox = (selector) => {
      const el = pyramidTiersEl.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        cx: r.left - boardRect.left + r.width / 2,
        leftQuarterX: r.left - boardRect.left + r.width * 0.27,
        rightQuarterX: r.left - boardRect.left + r.width * 0.73,
        topY: r.top - boardRect.top,
        bottomY: r.bottom - boardRect.top
      };
    };

    const appendPath = (d, extraClass, winnerTeam) => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      path.setAttribute("class", `bracket-connector${extraClass ? ` ${extraClass}` : ""}`);
      if (winnerTeam) path.dataset.teamName = winnerTeam;
      pyramidSvgEl.appendChild(path);
    };

    // 1) Quarterfinals (Bottom Row) -> Semifinals (Row 3)
    pQuarters.forEach((qm, idx) => {
      const targetSemi = pSemis[Math.floor(idx / 2)];
      const fromBox = getBox(`[data-match-id="${qm.id}"]`);
      const toBox = getBox(`[data-match-id="${targetSemi.id}"]`);
      if (fromBox && toBox) {
        appendPath(
          buildUpwardElbowPath(fromBox.cx, fromBox.topY, toBox.cx, toBox.bottomY),
          qm.decided ? "is-decided" : "",
          qm.winner
        );
      }
    });

    // 2) Semifinals (Row 3) -> Grand Finals Duel Card (Row 2, connecting neatly into left & right contender halves!)
    const gfBox = getBox(`[data-match-id="${pFinal.id}"]`);
    pSemis.forEach((sm, idx) => {
      const fromBox = getBox(`[data-match-id="${sm.id}"]`);
      if (fromBox && gfBox) {
        const targetX = idx === 0 ? gfBox.leftQuarterX : gfBox.rightQuarterX;
        appendPath(
          buildUpwardElbowPath(fromBox.cx, fromBox.topY, targetX, gfBox.bottomY),
          sm.decided ? "is-gold" : "",
          sm.winner
        );
      }
    });

    // 3) Grand Finals (Row 2) -> Top Champion Crown Card (Row 1)
    const crownBox = getBox("#pyramid-crown-card");
    if (gfBox && crownBox) {
      appendPath(
        `M ${gfBox.cx} ${gfBox.topY} L ${crownBox.cx} ${crownBox.bottomY}`,
        pFinal.decided ? "is-gold" : "",
        pFinal.winner
      );
    }
  }

  // ==========================================================================
  // DATA BUILDER 2: ORIGINAL SYMMETRIC 16/8-TEAM BRACKET
  // ==========================================================================
  const teamCount = config.teamCount === 8 ? 8 : 16;

  function buildZoneBracket(prefix, rawTeams, zoneScores) {
    const perZone = teamCount / 2;
    const teams = Array.from({ length: perZone }, (_, idx) =>
      Array.isArray(rawTeams) && rawTeams[idx] ? String(rawTeams[idx]) : `待定队伍 ${idx + 1}`
    );
    const s = zoneScores || {};
    const rounds = [];

    if (teamCount === 16) {
      const r16Scores = Array.isArray(s.round16) ? s.round16 : [];
      const r16 = [];
      for (let i = 0; i < 4; i++) {
        r16.push(resolveMatch(`${prefix}-r16-${i}`, teams[i * 2], teams[i * 2 + 1], r16Scores[i]));
      }
      rounds.push({ key: "round16", title: "16强首轮", matches: r16 });

      const qScores = Array.isArray(s.quarter) ? s.quarter : [];
      const quarter = [];
      for (let i = 0; i < 2; i++) {
        quarter.push(resolveMatch(`${prefix}-q-${i}`, r16[i * 2].winner, r16[i * 2 + 1].winner, qScores[i]));
      }
      rounds.push({ key: "quarter", title: "八强赛", matches: quarter });

      const semiMatch = resolveMatch(`${prefix}-semi-0`, quarter[0].winner, quarter[1].winner, s.semi);
      rounds.push({ key: "semi", title: "半决赛", matches: [semiMatch] });
    } else {
      const qScores = Array.isArray(s.quarter) ? s.quarter : [];
      const quarter = [];
      for (let i = 0; i < 2; i++) {
        quarter.push(resolveMatch(`${prefix}-q-${i}`, teams[i * 2], teams[i * 2 + 1], qScores[i]));
      }
      rounds.push({ key: "quarter", title: "八强赛", matches: quarter });

      const semiMatch = resolveMatch(`${prefix}-semi-0`, quarter[0].winner, quarter[1].winner, s.semi);
      rounds.push({ key: "semi", title: "半决赛", matches: [semiMatch] });
    }

    const zoneChampion = rounds[rounds.length - 1].matches[0].winner;
    return { rounds, zoneChampion };
  }

  const allScores = config.scores || {};
  const leftData = buildZoneBracket("L", config.leftTeams, allScores.left);
  const rightData = buildZoneBracket("R", config.rightTeams, allScores.right);
  const grandFinal = resolveMatch("GF", leftData.zoneChampion, rightData.zoneChampion, allScores.final);

  const boardEl = document.getElementById("bracket-board");
  const headersEl = document.getElementById("bracket-headers");
  const columnsEl = document.getElementById("bracket-columns");
  const svgEl = document.getElementById("bracket-svg");
  const stageEl = document.getElementById("bracket-stage");

  boardEl.dataset.teamCount = String(teamCount);
  let activeZoneView = "all";

  function createSymmetricCenterColumn() {
    const col = document.createElement("div");
    col.className = "bracket-col bracket-col-center";
    const assembly = document.createElement("div");
    assembly.className = "finals-assembly";

    const crown = createCrownCard(grandFinal, "champion-crown-card", "");
    const duel = createFinalsDuelCard(grandFinal, `${leftZoneName}代表`, `${rightZoneName}代表`);

    assembly.append(crown, duel);
    col.appendChild(assembly);
    return col;
  }

  function renderSymmetricBracket() {
    headersEl.innerHTML = "";
    columnsEl.innerHTML = "";
    boardEl.dataset.zoneView = activeZoneView;

    const colSpecs = [];

    if (activeZoneView === "all" || activeZoneView === "left") {
      leftData.rounds.forEach((round) => {
        colSpecs.push({ zoneLabel: leftZoneName, title: round.title, side: "left", matches: round.matches });
      });
    }

    if (activeZoneView === "all" || activeZoneView === "center") {
      colSpecs.push({ zoneLabel: "巅峰决战", title: "总决赛", side: "center", isCenter: true });
    }

    if (activeZoneView === "all" || activeZoneView === "right") {
      const rightRounds = activeZoneView === "right" ? rightData.rounds : [...rightData.rounds].reverse();
      rightRounds.forEach((round) => {
        colSpecs.push({ zoneLabel: rightZoneName, title: round.title, side: "right", matches: round.matches });
      });
    }

    const colCount = String(colSpecs.length);
    headersEl.dataset.cols = colCount;
    columnsEl.dataset.cols = colCount;

    colSpecs.forEach((spec) => {
      const h = document.createElement("div");
      h.className = `round-col-header${spec.isCenter ? " is-center" : ""}`;
      h.innerHTML = `
        <span class="round-col-zone">${spec.zoneLabel}</span>
        <span class="round-col-title">${spec.title}</span>
      `;
      headersEl.appendChild(h);

      if (spec.isCenter) {
        columnsEl.appendChild(createSymmetricCenterColumn());
      } else {
        const col = document.createElement("div");
        col.className = "bracket-col";
        spec.matches.forEach((m) => col.appendChild(createMatchCard(m)));
        columnsEl.appendChild(col);
      }
    });
  }

  function buildHorizontalElbowPath(x1, y1, x2, y2) {
    const midX = (x1 + x2) / 2;
    const dy = y2 - y1;
    const dx = x2 - x1;
    if (Math.abs(dy) < 1.5) {
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }
    const dirX = dx >= 0 ? 1 : -1;
    const dirY = dy >= 0 ? 1 : -1;
    const r = Math.min(8, Math.abs(dx) / 4, Math.abs(dy) / 2);

    return [
      `M ${x1} ${y1}`,
      `L ${midX - dirX * r} ${y1}`,
      `Q ${midX} ${y1} ${midX} ${y1 + dirY * r}`,
      `L ${midX} ${y2 - dirY * r}`,
      `Q ${midX} ${y2} ${midX + dirX * r} ${y2}`,
      `L ${x2} ${y2}`
    ].join(" ");
  }

  function drawSymmetricConnectors() {
    svgEl.innerHTML = "";
    const stageRect = stageEl.getBoundingClientRect();
    if (!stageRect.width || !stageRect.height) return;

    svgEl.setAttribute("width", String(stageRect.width));
    svgEl.setAttribute("height", String(stageRect.height));
    svgEl.setAttribute("viewBox", `0 0 ${stageRect.width} ${stageRect.height}`);

    const getCardAnchor = (matchId, side) => {
      const el = columnsEl.querySelector(`[data-match-id="${matchId}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: side === "right" ? r.right - stageRect.left : r.left - stageRect.left,
        y: r.top - stageRect.top + r.height / 2
      };
    };

    const appendConnector = (d, extraClass, winnerTeam) => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      path.setAttribute("class", `bracket-connector${extraClass ? ` ${extraClass}` : ""}`);
      if (winnerTeam) path.dataset.teamName = winnerTeam;
      svgEl.appendChild(path);
    };

    const connectZoneRounds = (rounds, flowDirection) => {
      for (let rIdx = 0; rIdx < rounds.length - 1; rIdx++) {
        const currMatches = rounds[rIdx].matches;
        const nextMatches = rounds[rIdx + 1].matches;
        currMatches.forEach((m, idx) => {
          const targetMatch = nextMatches[Math.floor(idx / 2)];
          const fromSide = flowDirection === "ltr" ? "right" : "left";
          const toSide = flowDirection === "ltr" ? "left" : "right";
          const p1 = getCardAnchor(m.id, fromSide);
          const p2 = getCardAnchor(targetMatch.id, toSide);
          if (p1 && p2) {
            appendConnector(buildHorizontalElbowPath(p1.x, p1.y, p2.x, p2.y), m.decided ? "is-decided" : "", m.winner);
          }
        });
      }
    };

    if (activeZoneView === "all" || activeZoneView === "left") {
      connectZoneRounds(leftData.rounds, "ltr");
    }
    if (activeZoneView === "all") {
      connectZoneRounds(rightData.rounds, "rtl");
    } else if (activeZoneView === "right") {
      connectZoneRounds(rightData.rounds, "ltr");
    }

    if (activeZoneView === "all") {
      const leftFinal = leftData.rounds[leftData.rounds.length - 1].matches[0];
      const rightFinal = rightData.rounds[rightData.rounds.length - 1].matches[0];

      const pLeft = getCardAnchor(leftFinal.id, "right");
      const pCenterLeft = getCardAnchor(grandFinal.id, "left");
      if (pLeft && pCenterLeft) {
        appendConnector(buildHorizontalElbowPath(pLeft.x, pLeft.y, pCenterLeft.x, pCenterLeft.y), leftFinal.decided ? "is-gold" : "", leftFinal.winner);
      }

      const pRight = getCardAnchor(rightFinal.id, "left");
      const pCenterRight = getCardAnchor(grandFinal.id, "right");
      if (pRight && pCenterRight) {
        appendConnector(buildHorizontalElbowPath(pRight.x, pRight.y, pCenterRight.x, pCenterRight.y), rightFinal.decided ? "is-gold" : "", rightFinal.winner);
      }

      const crownEl = document.getElementById("champion-crown-card");
      const duelEl = columnsEl.querySelector(`[data-match-id="${grandFinal.id}"]`);
      if (crownEl && duelEl) {
        const cr = crownEl.getBoundingClientRect();
        const dr = duelEl.getBoundingClientRect();
        const cx = dr.left - stageRect.left + dr.width / 2;
        const y1 = dr.top - stageRect.top;
        const y2 = cr.bottom - stageRect.top;
        appendConnector(`M ${cx} ${y1} L ${cx} ${y2}`, grandFinal.decided ? "is-gold" : "", grandFinal.winner);
      }
    }
  }

  // ==========================================================================
  // MODE INITIALIZATION (driven solely by weiduCupData.mode)
  // ==========================================================================
  const activeLayout = mode === "bracket" ? "symmetric" : "pyramid";

  // Unified Cross-Highlight across Standings Table + Match Records + Active Bracket
  function clearHighlight() {
    document.body.classList.remove("is-highlighting-player");
    document.querySelectorAll(".is-team-focus").forEach((el) => el.classList.remove("is-team-focus"));
    document.querySelectorAll(".has-team-focus").forEach((el) => el.classList.remove("has-team-focus"));
    document.querySelectorAll(".is-path-focus").forEach((el) => el.classList.remove("is-path-focus"));
  }

  function highlightPlayerOrTeam(name) {
    const targetKey = normKey(name);
    if (!targetKey) {
      clearHighlight();
      return;
    }
    document.body.classList.add("is-highlighting-player");
    document.querySelectorAll(".has-team-focus").forEach((el) => el.classList.remove("has-team-focus"));
    document.querySelectorAll("[data-team-name]").forEach((el) => {
      const matched = normKey(el.dataset.teamName) === targetKey;
      if (el.classList.contains("bracket-connector")) {
        el.classList.toggle("is-path-focus", matched);
      } else {
        el.classList.toggle("is-team-focus", matched);
        if (matched) {
          const parentRow = el.closest(".match-record-row");
          if (parentRow) parentRow.classList.add("has-team-focus");
        }
      }
    });
  }

  document.addEventListener("click", () => clearHighlight());

  function bindAllHighlights() {
    document.querySelectorAll("[data-team-name]:not(.bracket-connector)").forEach((el) => {
      if (el.dataset.boundHighlight === "1") return;
      el.dataset.boundHighlight = "1";
      el.addEventListener("mouseenter", () => highlightPlayerOrTeam(el.dataset.teamName));
      el.addEventListener("mouseleave", () => highlightPlayerOrTeam(null));
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const already = el.classList.contains("is-team-focus");
        highlightPlayerOrTeam(already ? null : el.dataset.teamName);
      });
    });
  }

  function scheduleRedraw() {
    requestAnimationFrame(() => {
      if (activeLayout === "pyramid") {
        drawPyramidConnectors();
        requestAnimationFrame(drawPyramidConnectors);
      } else {
        drawSymmetricConnectors();
        requestAnimationFrame(drawSymmetricConnectors);
      }
    });
  }

  function initActiveMode() {
    clearHighlight();
    if (mainEl) mainEl.dataset.activeLayout = activeLayout;

    const isPyramid = activeLayout === "pyramid";
    if (viewPyramidEl) viewPyramidEl.hidden = !isPyramid;
    if (viewSymmetricEl) viewSymmetricEl.hidden = isPyramid;
    if (symmetricZoneTabsEl) symmetricZoneTabsEl.hidden = isPyramid;
    if (stageTabsEl) stageTabsEl.hidden = !isPyramid;

    if (isPyramid) {
      buildPyramidStageData(activeStageKey);
      document.querySelectorAll("[data-stage-tab]").forEach((b) => {
        const active = b.dataset.stageTab === activeStageKey;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-selected", String(active));
      });
      renderStandingsTable();
      renderPyramidBracket();
      renderMatchRecords();
    } else {
      renderSymmetricBracket();
    }

    bindAllHighlights();
    scheduleRedraw();
  }

  initActiveMode();

  // Preliminary / Official stage switcher tabs (in top-left navbar beside 第一届微度杯)
  document.querySelectorAll("[data-stage-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nextStage = btn.dataset.stageTab === "official" ? "official" : "preliminary";
      if (nextStage === activeStageKey) return;
      activeStageKey = nextStage;
      if (history.replaceState) {
        history.replaceState(null, "", nextStage === "official" ? "#official" : "#preliminary");
      }
      initActiveMode();
    });
  });

  // Scoring Rules Modal initialization & open/close interactions
  const rulesBtn = document.getElementById("apple-rules-toggle");
  const rulesModal = document.getElementById("cup-rules-modal");
  const rulesCloseBtn = document.getElementById("cup-rules-close");
  const rulesConfirmBtn = document.getElementById("cup-rules-confirm");
  const rulesListEl = document.getElementById("cup-rules-list");

  const defaultRules = [
    {
      label: "单局制计分",
      detail: "当只有一局比赛时，胜者双方个人积分各 +2，负者不加分（+0）；净胜球按照本局实际分差为每位成员填写。"
    },
    {
      label: "三局两胜制计分",
      detail: "当采用三局两胜制时，胜者双方个人积分各 +2，负者不加分（+0）；净胜球按照各局分差的累积为每位成员填写。"
    },
    {
      label: "榜单排序规则",
      detail: "个人积分榜按个人积分从高到低排列；积分相同时，按累计净胜球从高到低排列。"
    }
  ];

  function renderRulesModalContent() {
    if (!rulesListEl) return;
    const rCfg = config.rules || {};
    if (rCfg.eyebrow) setText("cup-rules-eyebrow", rCfg.eyebrow);
    if (rCfg.title) setText("cup-rules-title", rCfg.title);
    const items = Array.isArray(rCfg.items) && rCfg.items.length ? rCfg.items : defaultRules;

    rulesListEl.innerHTML = "";
    items.forEach((item, idx) => {
      const li = document.createElement("li");
      li.className = "apple-rule-item";

      const num = document.createElement("span");
      num.className = "apple-rule-num";
      num.textContent = String(idx + 1);

      const body = document.createElement("div");
      body.className = "apple-rule-body";

      const label = document.createElement("div");
      label.className = "apple-rule-label";
      label.textContent = item && item.label ? String(item.label) : `规则 ${idx + 1}`;

      const detail = document.createElement("p");
      detail.className = "apple-rule-detail";
      detail.textContent = item && item.detail ? String(item.detail) : "";

      body.append(label, detail);
      li.append(num, body);
      rulesListEl.appendChild(li);
    });
  }

  renderRulesModalContent();

  function openRulesModal() {
    if (!rulesModal) return;
    rulesModal.hidden = false;
    document.body.style.overflow = "hidden";
    if (rulesCloseBtn) rulesCloseBtn.focus();
  }

  function closeRulesModal() {
    if (!rulesModal || rulesModal.hidden) return;
    rulesModal.hidden = true;
    document.body.style.overflow = "";
    if (rulesBtn) rulesBtn.focus();
  }

  if (rulesBtn) {
    rulesBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openRulesModal();
    });
  }
  if (rulesCloseBtn) rulesCloseBtn.addEventListener("click", closeRulesModal);
  if (rulesConfirmBtn) rulesConfirmBtn.addEventListener("click", closeRulesModal);
  if (rulesModal) {
    rulesModal.addEventListener("click", (e) => {
      if (e.target === rulesModal) closeRulesModal();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && rulesModal && !rulesModal.hidden) {
      closeRulesModal();
    }
  });

  // Symmetric view zone filter tabs (only visible when mode === "bracket")
  document.querySelectorAll("[data-zone-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeZoneView = btn.dataset.zoneFilter || "all";
      document.querySelectorAll("[data-zone-filter]").forEach((b) => {
        const active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-selected", String(active));
      });
      renderSymmetricBracket();
      bindAllHighlights();
      scheduleRedraw();
    });
  });

  // ResizeObserver for seamless connector redraw on both views
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => scheduleRedraw());
    if (stageEl) ro.observe(stageEl);
    if (columnsEl) ro.observe(columnsEl);
    if (pyramidBoardEl) ro.observe(pyramidBoardEl);
    if (pyramidTiersEl) ro.observe(pyramidTiersEl);
  } else {
    window.addEventListener("resize", () => scheduleRedraw());
  }
})();
