(() => {
  const { checkedThrough, events } = resetPublicData;
  const names = { codex: 'Codex', claude: 'Claude', antigravity: 'Antigravity' };
  const labels = { direct: '直接重置', grant: '发放重置卡' };
  const day = 86400000;
  const displayDate = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', timeZone: 'UTC' });
  const asOf = Date.parse(checkedThrough);
  const year = new Date(asOf).getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const mondayOffset = (new Date(yearStart).getUTCDay() + 6) % 7;
  const weekStart = yearStart - mondayOffset * day;
  const weeks = Math.floor((asOf - weekStart) / (7 * day)) + 1;
  const recentStart = asOf - 29 * day;
  const resetPage = document.querySelector('#ai-reset');
  const previews = document.querySelector('#public-reset-cards');
  const providers = document.querySelector('#public-providers');
  const months = document.querySelector('#public-calendar-months');
  const days = document.querySelector('#public-calendar-days');
  const list = document.querySelector('#public-events');
  const listTitle = document.querySelector('#public-events-title');
  const detailsButton = document.querySelector('#public-show-all');
  const rollingNumbers = [];
  let selectedProvider = 'codex';
  let selectedDate = '';
  let showAll = false;

  function dateKey(at) {
    return new Date(at).toISOString().slice(0, 10);
  }

  function element(tag, className, content) {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (content) item.textContent = content;
    return item;
  }

  function eventDates(entries) {
    const grouped = new Map();
    for (const entry of entries) {
      const records = grouped.get(entry.date) || [];
      records.push(entry);
      grouped.set(entry.date, records);
    }
    return grouped;
  }

  function markDate(node, records) {
    const kinds = new Set(records.map(record => record.kind));
    if (kinds.size) node.dataset.kind = kinds.size === 2 ? 'mixed' : records[0].kind;
  }

  function playOverviewNumbers() {
    for (const { node, value, delay } of rollingNumbers) {
      const spoken = element('span', 'visually-hidden', value);
      const visual = element('span');
      visual.setAttribute('aria-hidden', 'true');
      let digitIndex = 0;
      for (const character of value) {
        if (!/^[0-9]$/.test(character)) {
          visual.append(character);
          continue;
        }
        const reel = element('span', 'public-digit');
        const track = element('span', 'public-digit-track');
        const steps = 7 + digitIndex % 4;
        for (let step = 0; step <= steps; step++) {
          track.append(element('span', '', String((Number(character) + 20 - steps + step) % 10)));
        }
        track.style.setProperty('--digit-end', '-' + (steps * 1.16).toFixed(2) + 'em');
        track.style.setProperty('--digit-delay', delay + digitIndex * 38 + 'ms');
        track.style.setProperty('--digit-duration', 730 + digitIndex * 34 + 'ms');
        reel.append(track);
        visual.append(reel);
        digitIndex++;
      }
      node.replaceChildren(spoken, visual);
    }
  }

  function renderCards() {
    for (const [index, [provider, name]] of Object.entries(names).entries()) {
      const entries = events[provider];
      const latest = entries[0];
      const grouped = eventDates(entries);
      const card = element('article', 'public-card');
      card.dataset.provider = provider;
      const title = element('h2', '', name);
      const dateLabel = latest ? displayDate.format(Date.parse(latest.date)) : '暂无记录';
      const latestDate = element('time', 'public-latest', dateLabel);
      if (latest) {
        latestDate.dateTime = latest.date;
        rollingNumbers.push({ node: latestDate, value: dateLabel, delay: index * 80 });
      }
      const strip = element('div', 'public-strip');
      strip.setAttribute('aria-hidden', 'true');
      let recentCount = 0;
      for (let date = recentStart; date <= asOf; date += day) {
        const key = dateKey(date);
        const dot = element('span');
        const records = grouped.get(key) || [];
        markDate(dot, records);
        recentCount += records.length;
        dot.title = displayDate.format(date) + (records.length ? ' · ' + records.map(record => labels[record.kind]).join('、') : ' · 未收录');
        strip.append(dot);
      }
      const footer = element('div', 'public-card-footer');
      const link = element('a', 'public-inline', '查看历史');
      link.href = '#ai-reset-history';
      link.dataset.provider = provider;
      link.setAttribute('aria-label', '查看 ' + name + ' 的公开重置历史');
      const recentLabel = element('span', '', '近 30 天 · ');
      const recentNumber = element('span', 'public-recent-number', String(recentCount));
      recentLabel.append(recentNumber, ' 条');
      rollingNumbers.push({ node: recentNumber, value: String(recentCount), delay: index * 80 + 70 });
      footer.append(recentLabel, link);
      const recordLabel = latest?.announcedAt ? '公告发布日期' : '最新公开记录';
      card.append(title, element('span', 'public-latest-label', recordLabel), latestDate,
        element('span', 'public-latest-kind', latest ? labels[latest.kind] : ''), strip, footer);
      previews.append(card);
    }
  }

  function renderMonthLabels() {
    months.style.setProperty('--weeks', weeks);
    days.style.setProperty('--weeks', weeks);
    for (let month = 0; Date.UTC(year, month, 1) <= asOf; month++) {
      const label = element('span', '', String(month + 1) + '月');
      label.style.gridColumn = Math.floor((Date.UTC(year, month, 1) - weekStart) / (7 * day)) + 1;
      months.append(label);
    }
  }

  function renderCalendar() {
    document.querySelector('#public-calendar-title').textContent = names[selectedProvider] + ' · ' + year;
    const grouped = eventDates(events[selectedProvider]);
    days.replaceChildren();
    for (let date = yearStart; date <= asOf; date += day) {
      const key = dateKey(date);
      const records = grouped.get(key) || [];
      const cell = element(records.length ? 'button' : 'span', 'public-day');
      const offset = Math.round((date - weekStart) / day);
      cell.style.gridColumn = Math.floor(offset / 7) + 1;
      cell.style.gridRow = offset % 7 + 1;
      cell.title = key + (records.length ? ' · ' + records.map(record => labels[record.kind]).join('、') : ' · 未收录');
      if (records.length) {
        cell.type = 'button';
        cell.dataset.date = key;
        cell.setAttribute('aria-label', cell.title);
        cell.setAttribute('aria-pressed', String(selectedDate === key));
        markDate(cell, records);
      } else {
        cell.setAttribute('aria-hidden', 'true');
      }
      days.append(cell);
    }
  }

  function renderEvents() {
    const entries = events[selectedProvider];
    const visible = selectedDate ? entries.filter(entry => entry.date === selectedDate) : showAll ? entries : entries.slice(0, 5);
    listTitle.textContent = selectedDate ? selectedDate + ' 的记录' : showAll ? '全部已收录记录' : '最近记录';
    detailsButton.textContent = selectedDate ? '清除日期筛选' : showAll ? '收起记录' : '查看全部日期';
    detailsButton.hidden = !selectedDate && entries.length <= 5;
    list.replaceChildren();
    if (!visible.length) list.append(element('li', '', '暂无已收录的公开记录。'));
    for (const entry of visible) {
      const row = element('li', 'public-event');
      const date = element('time', '', entry.date);
      date.dateTime = entry.date;
      if (entry.announcedAt) date.title = '公告发布日期';
      const detail = element('div');
      detail.append(element('strong', '', labels[entry.kind]), document.createTextNode(entry.detail));
      const link = element('a', '', entry.source);
      link.href = entry.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      row.append(date, detail, link);
      list.append(row);
    }
  }

  function selectProvider(provider) {
    if (!Object.hasOwn(names, provider)) return;
    selectedProvider = provider;
    selectedDate = '';
    showAll = false;
    for (const button of providers.children) {
      button.setAttribute('aria-pressed', String(button.dataset.provider === provider));
    }
    renderCalendar();
    renderEvents();
  }

  function selectDate(date) {
    selectedDate = date;
    for (const cell of days.querySelectorAll('button')) {
      cell.setAttribute('aria-pressed', String(cell.dataset.date === date));
    }
    renderEvents();
  }

  document.querySelector('#public-asof').textContent = '公开资料收录截至 ' + checkedThrough + ' · 日期按北京时间';
  for (const [provider, name] of Object.entries(names)) {
    const button = element('button', '', name);
    button.type = 'button';
    button.dataset.provider = provider;
    providers.append(button);
  }
  previews.addEventListener('click', event => {
    const link = event.target.closest('a[data-provider]');
    if (link) selectProvider(link.dataset.provider);
  });
  providers.addEventListener('click', event => {
    const button = event.target.closest('button[data-provider]');
    if (button) selectProvider(button.dataset.provider);
  });
  days.addEventListener('click', event => {
    const button = event.target.closest('button[data-date]');
    if (button) selectDate(selectedDate === button.dataset.date ? '' : button.dataset.date);
  });
  detailsButton.addEventListener('click', () => {
    if (selectedDate) selectDate('');
    else {
      showAll = !showAll;
      renderEvents();
    }
  });
  renderCards();
  resetPage.addEventListener('reset:enter', playOverviewNumbers);
  if (!resetPage.hidden) playOverviewNumbers();
  initializeResetAnnouncements(resetPage, previews, resetPublicData);
  renderMonthLabels();
  selectProvider(selectedProvider);
})();
