(() => {
  const config = typeof weiduCupData === "object" && weiduCupData ? weiduCupData : {};
  const mode = config.mode === "coming-soon" ? "coming-soon" : "bracket";

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

  const teamCount = config.teamCount === 8 ? 8 : 16;
  const leftZoneName = config.leftZoneName || "上半区";
  const rightZoneName = config.rightZoneName || "下半区";

  // Populate text headers
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el && text) el.textContent = text;
  };
  setText("nav-tournament-name", config.title || "微度杯");
  setText("bracket-eyebrow", config.eyebrow || "WEIDU CUP · TOURNAMENT");
  setText("bracket-main-title", config.title || "第一届微度杯");
  setText("bracket-subtitle", config.subtitle || "双半区单败淘汰赛 · 胜者晋级");
  setText("tab-left-zone", leftZoneName);
  setText("tab-right-zone", rightZoneName);

  // Theme toggle (Light Cupertino Showcase default, Dark Cupertino optional)
  const themeBtn = document.getElementById("apple-theme-toggle");
  const themeLabel = document.getElementById("apple-theme-label");
  const savedTheme = localStorage.getItem("weidu-cup-apple-theme");
  const applyTheme = (theme) => {
    const next = theme === "dark" ? "dark" : "light";
    document.body.dataset.appleTheme = next;
    if (themeLabel) {
      themeLabel.textContent = next === "dark" ? "浅色外观" : "深色外观";
    }
  };
  applyTheme(savedTheme || "light");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const next = document.body.dataset.appleTheme === "dark" ? "light" : "dark";
      localStorage.setItem("weidu-cup-apple-theme", next);
      applyTheme(next);
    });
  }

  // Helper: evaluate a single match from two team names and a [scoreA, scoreB] pair
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

  // Build rounds for one half-zone (left or right)
  function buildZoneBracket(prefix, rawTeams, zoneScores) {
    const perZone = teamCount / 2; // 8 or 4
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
        quarter.push(
          resolveMatch(
            `${prefix}-q-${i}`,
            r16[i * 2].winner,
            r16[i * 2 + 1].winner,
            qScores[i]
          )
        );
      }
      rounds.push({ key: "quarter", title: "八强赛", matches: quarter });

      const semiMatch = resolveMatch(
        `${prefix}-semi-0`,
        quarter[0].winner,
        quarter[1].winner,
        s.semi
      );
      rounds.push({ key: "semi", title: "半决赛", matches: [semiMatch] });
    } else {
      const qScores = Array.isArray(s.quarter) ? s.quarter : [];
      const quarter = [];
      for (let i = 0; i < 2; i++) {
        quarter.push(resolveMatch(`${prefix}-q-${i}`, teams[i * 2], teams[i * 2 + 1], qScores[i]));
      }
      rounds.push({ key: "quarter", title: "八强赛", matches: quarter });

      const semiMatch = resolveMatch(
        `${prefix}-semi-0`,
        quarter[0].winner,
        quarter[1].winner,
        s.semi
      );
      rounds.push({ key: "semi", title: "半决赛", matches: [semiMatch] });
    }

    const zoneChampion = rounds[rounds.length - 1].matches[0].winner;
    return { rounds, zoneChampion };
  }

  const allScores = config.scores || {};
  const leftData = buildZoneBracket("L", config.leftTeams, allScores.left);
  const rightData = buildZoneBracket("R", config.rightTeams, allScores.right);
  const grandFinal = resolveMatch(
    "GF",
    leftData.zoneChampion,
    rightData.zoneChampion,
    allScores.final
  );

  // Compute tournament overview metrics
  const allMatches = [
    ...leftData.rounds.flatMap((r) => r.matches),
    ...rightData.rounds.flatMap((r) => r.matches),
    grandFinal
  ];
  const decidedCount = allMatches.filter((m) => m.decided).length;
  const totalMatches = allMatches.length;

  let currentStageText = "待开赛";
  if (grandFinal.decided) {
    currentStageText = `总冠军：${grandFinal.winner}`;
  } else if (leftData.zoneChampion || rightData.zoneChampion) {
    currentStageText = "当前阶段：巅峰总决赛";
  } else if (decidedCount > 0) {
    currentStageText = "当前阶段：淘汰晋级中";
  }

  const metricsEl = document.getElementById("bracket-metrics");
  if (metricsEl) {
    metricsEl.innerHTML = "";
    const pills = [
      { label: "参赛规模", value: `${teamCount} 支队伍` },
      { label: "赛程进度", value: `${decidedCount} / ${totalMatches} 场已决出` },
      {
        label: grandFinal.decided ? "桂冠得主" : "赛事状态",
        value: grandFinal.decided ? grandFinal.winner : currentStageText,
        isChampion: grandFinal.decided
      }
    ];
    pills.forEach((p) => {
      const pill = document.createElement("div");
      pill.className = `apple-metric-pill${p.isChampion ? " is-champion" : ""}`;
      const labelSpan = document.createElement("span");
      labelSpan.className = "apple-metric-label";
      labelSpan.textContent = p.label;
      const valSpan = document.createElement("span");
      valSpan.className = "apple-metric-value";
      valSpan.textContent = p.value;
      pill.append(labelSpan, valSpan);
      metricsEl.appendChild(pill);
    });
  }

  // DOM Builders
  const boardEl = document.getElementById("bracket-board");
  const headersEl = document.getElementById("bracket-headers");
  const columnsEl = document.getElementById("bracket-columns");
  const svgEl = document.getElementById("bracket-svg");
  const stageEl = document.getElementById("bracket-stage");

  boardEl.dataset.teamCount = String(teamCount);
  let activeZoneView = "all";

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

  function createCenterColumn() {
    const col = document.createElement("div");
    col.className = "bracket-col bracket-col-center";

    const assembly = document.createElement("div");
    assembly.className = "finals-assembly";

    // Trophy + Champion Crown Card
    const crown = document.createElement("div");
    crown.className = `champion-crown-card${grandFinal.decided ? " has-champion" : ""}`;
    crown.id = "champion-crown-card";
    if (grandFinal.winner) {
      crown.dataset.teamName = grandFinal.winner;
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
    crownName.textContent = grandFinal.winner || "冠军虚位以待";

    crown.append(trophy, crownLabel, crownName);

    // Side-by-side Grand Finals Duel Card (NBA Playoffs center style, pure names + scores)
    const duel = document.createElement("article");
    duel.className = "finals-duel-card";
    duel.dataset.matchId = grandFinal.id;

    const badge = document.createElement("div");
    badge.className = "finals-duel-badge";
    badge.textContent = "GRAND FINALS · 巅峰对决";

    const duelGrid = document.createElement("div");
    duelGrid.className = "finals-duel-grid";

    const zones = [`${leftZoneName}代表`, `${rightZoneName}代表`];
    [0, 1].forEach((idx) => {
      if (idx === 1) {
        const vs = document.createElement("span");
        vs.className = "finals-vs";
        vs.textContent = "VS";
        duelGrid.appendChild(vs);
      }

      const teamName = grandFinal.teams[idx];
      const box = document.createElement("div");
      box.className = "finals-contender";
      if (!teamName) box.classList.add("is-tbd");
      if (grandFinal.winnerIndex === idx) box.classList.add("is-winner");
      if (grandFinal.decided && grandFinal.winnerIndex !== idx) box.classList.add("is-loser");
      if (teamName) box.dataset.teamName = teamName;

      const zSpan = document.createElement("span");
      zSpan.className = "finals-contender-zone";
      zSpan.textContent = zones[idx];

      const nSpan = document.createElement("span");
      nSpan.className = "finals-contender-name";
      nSpan.textContent = teamName || "待定";
      if (teamName) nSpan.title = teamName;

      const sSpan = document.createElement("span");
      sSpan.className = "finals-contender-score";
      sSpan.textContent = grandFinal.scores[idx] !== null ? String(grandFinal.scores[idx]) : "—";

      box.append(zSpan, nSpan, sSpan);
      duelGrid.appendChild(box);
    });

    duel.append(badge, duelGrid);
    assembly.append(crown, duel);
    col.appendChild(assembly);
    return col;
  }

  // Render columns according to active zone filter
  function renderBracket() {
    headersEl.innerHTML = "";
    columnsEl.innerHTML = "";
    boardEl.dataset.zoneView = activeZoneView;

    const colSpecs = [];

    if (activeZoneView === "all" || activeZoneView === "left") {
      leftData.rounds.forEach((round) => {
        colSpecs.push({
          zoneLabel: leftZoneName,
          title: round.title,
          side: "left",
          matches: round.matches
        });
      });
    }

    if (activeZoneView === "all" || activeZoneView === "center") {
      colSpecs.push({
        zoneLabel: "巅峰决战",
        title: "总决赛",
        side: "center",
        isCenter: true
      });
    }

    if (activeZoneView === "all" || activeZoneView === "right") {
      const rightRounds =
        activeZoneView === "right"
          ? rightData.rounds // left-to-right when viewing right zone solo
          : [...rightData.rounds].reverse(); // converging right-to-left in panoramic view
      rightRounds.forEach((round) => {
        colSpecs.push({
          zoneLabel: rightZoneName,
          title: round.title,
          side: "right",
          matches: round.matches
        });
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
        columnsEl.appendChild(createCenterColumn());
      } else {
        const col = document.createElement("div");
        col.className = "bracket-col";
        spec.matches.forEach((m) => col.appendChild(createMatchCard(m)));
        columnsEl.appendChild(col);
      }
    });

    bindHoverHighlights();
    scheduleDrawConnectors();
  }

  function scheduleDrawConnectors() {
    requestAnimationFrame(() => {
      drawConnectors();
      requestAnimationFrame(drawConnectors);
    });
  }

  // Smooth rounded-elbow SVG connector path
  function buildElbowPath(x1, y1, x2, y2) {
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

  // Dynamically draw SVG connectors from actual card coordinates
  function drawConnectors() {
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
        y: r.top - stageRect.top + r.height / 2,
        topY: r.top - stageRect.top
      };
    };

    const appendConnector = (d, extraClass, winnerTeam) => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      path.setAttribute("class", `bracket-connector${extraClass ? ` ${extraClass}` : ""}`);
      if (winnerTeam) {
        path.dataset.teamName = winnerTeam;
      }
      svgEl.appendChild(path);
    };

    // Connect rounds within a zone
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
            appendConnector(
              buildElbowPath(p1.x, p1.y, p2.x, p2.y),
              m.decided ? "is-decided" : "",
              m.winner
            );
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

    // In panoramic view, connect both Zone Finals into Center Grand Finals + Trophy line
    if (activeZoneView === "all") {
      const leftFinal = leftData.rounds[leftData.rounds.length - 1].matches[0];
      const rightFinal = rightData.rounds[rightData.rounds.length - 1].matches[0];

      const pLeft = getCardAnchor(leftFinal.id, "right");
      const pCenterLeft = getCardAnchor(grandFinal.id, "left");
      if (pLeft && pCenterLeft) {
        appendConnector(
          buildElbowPath(pLeft.x, pLeft.y, pCenterLeft.x, pCenterLeft.y),
          leftFinal.decided ? "is-gold" : "",
          leftFinal.winner
        );
      }

      const pRight = getCardAnchor(rightFinal.id, "left");
      const pCenterRight = getCardAnchor(grandFinal.id, "right");
      if (pRight && pCenterRight) {
        appendConnector(
          buildElbowPath(pRight.x, pRight.y, pCenterRight.x, pCenterRight.y),
          rightFinal.decided ? "is-gold" : "",
          rightFinal.winner
        );
      }

      // Vertical line from Grand Finals up to Champion Crown Card
      const crownEl = document.getElementById("champion-crown-card");
      const duelEl = columnsEl.querySelector(`[data-match-id="${grandFinal.id}"]`);
      if (crownEl && duelEl) {
        const cr = crownEl.getBoundingClientRect();
        const dr = duelEl.getBoundingClientRect();
        const cx = dr.left - stageRect.left + dr.width / 2;
        const y1 = dr.top - stageRect.top;
        const y2 = cr.bottom - stageRect.top;
        appendConnector(
          `M ${cx} ${y1} L ${cx} ${y2}`,
          grandFinal.decided ? "is-gold" : "",
          grandFinal.winner
        );
      }
    }
  }

  // Hover / Tap a team to trace its full path across all rounds
  function clearHighlight() {
    boardEl.classList.remove("is-highlighting");
    columnsEl.querySelectorAll(".is-team-focus").forEach((el) => el.classList.remove("is-team-focus"));
    svgEl.querySelectorAll(".is-path-focus").forEach((el) => el.classList.remove("is-path-focus"));
  }

  function highlightTeam(name) {
    if (!name) {
      clearHighlight();
      return;
    }
    boardEl.classList.add("is-highlighting");
    columnsEl.querySelectorAll("[data-team-name]").forEach((el) => {
      el.classList.toggle("is-team-focus", el.dataset.teamName === name);
    });
    svgEl.querySelectorAll(".bracket-connector").forEach((el) => {
      el.classList.toggle("is-path-focus", el.dataset.teamName === name);
    });
  }

  document.addEventListener("click", () => clearHighlight());

  function bindHoverHighlights() {
    const teamElements = columnsEl.querySelectorAll("[data-team-name]");

    teamElements.forEach((el) => {
      el.addEventListener("mouseenter", () => highlightTeam(el.dataset.teamName));
      el.addEventListener("mouseleave", () => highlightTeam(null));
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const isAlreadyFocused = el.classList.contains("is-team-focus");
        highlightTeam(isAlreadyFocused ? null : el.dataset.teamName);
      });
    });
  }

  // Segmented Zone Filter Tabs
  document.querySelectorAll("[data-zone-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeZoneView = btn.dataset.zoneFilter || "all";
      document.querySelectorAll("[data-zone-filter]").forEach((b) => {
        const active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-selected", String(active));
      });
      renderBracket();
    });
  });

  // Redraw connectors seamlessly on resize
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => scheduleDrawConnectors());
    ro.observe(stageEl);
    ro.observe(columnsEl);
  } else {
    window.addEventListener("resize", () => scheduleDrawConnectors());
  }

  renderBracket();
})();
