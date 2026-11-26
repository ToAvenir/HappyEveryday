const initializeResetAnnouncements = (() => {
  const base = 'https://data.radarultra.com';
  const feeds = {
    codex: base + '/v5/refresh.json',
    claude: base + '/reset-products/claude.json',
    antigravity: base + '/reset-products/antigravity.json',
  };
  const accounts = {
    codex: ['thsottiaux', 'openai', 'openaidevs'],
    claude: ['claudedevs', 'claudeai', 'anthropicai', 'lydiahallie', 'bcherny'],
    antigravity: ['_mohansolo', '_anshulr', 'google', 'googledeepmind'],
  };
  const officialHosts = {
    codex: ['openai.com', 'help.openai.com', 'developers.openai.com'],
    claude: ['anthropic.com', 'www.anthropic.com', 'support.claude.com'],
    antigravity: ['antigravity.google', 'blog.google', 'developers.googleblog.com'],
  };
  const day = 86400000;
  const zhDay = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', timeZone: 'Asia/Shanghai' });
  const zhTime = new Intl.DateTimeFormat('zh-CN', {
    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Shanghai',
  });

  function originalLink(provider, value) {
    if (typeof value !== 'string' || !Object.hasOwn(feeds, provider)) return null;
    try {
      const link = new URL(value);
      if (link.protocol !== 'https:' || link.username || link.password) return null;
      if (officialHosts[provider].includes(link.hostname)) return link.href;
      const [, account] = link.pathname.match(/^\/([\w]+)\/status\/\d+\/?$/) ?? [];
      if ((link.hostname === 'x.com' || link.hostname === 'twitter.com') && accounts[provider].includes(account?.toLowerCase())) {
        return link.href;
      }
    } catch { /* The source must be a valid, public original link. */ }
    return null;
  }

  function timestamp(value) {
    return typeof value === 'string' && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;
  }

  function planFromFeed(value) {
    if (value?.resolution !== 'resolved') return null;
    const { earliestAt, latestAt } = value.effectiveWindow ?? {};
    const start = timestamp(earliestAt);
    const end = timestamp(latestAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
    if (!['instant', 'interval', 'deadline', 'not_before'].includes(value.relation)) return null;
    return { start, end, relation: value.relation, approximate: value.precision === 'approximate' };
  }

  function planFromLocal(entry) {
    const exact = timestamp(entry.expectedAt);
    if (Number.isFinite(exact)) return { start: exact, end: exact, relation: 'instant' };
    if (typeof entry.expectedDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.expectedDate)) return null;
    const utcDay = Date.parse(entry.expectedDate + 'T00:00:00Z');
    if (!Number.isFinite(utcDay) || new Date(utcDay).toISOString().slice(0, 10) !== entry.expectedDate) return null;
    const start = utcDay - 8 * 3600000;
    return { start, end: start + day - 1, relation: 'day' };
  }

  function normalize(provider, announcedAt, url, plan, expiresAt) {
    const at = timestamp(announcedAt);
    const source = originalLink(provider, url);
    if (!source || !Number.isFinite(at)) return null;
    const explicitExpiry = timestamp(expiresAt);
    return {
      provider, at, source, plan,
      expires: Number.isFinite(explicitExpiry) ? explicitExpiry : plan ? Math.max(plan.end, at) + 1.5 * day : at + 7 * day,
    };
  }

  function normalizedPending(provider, entries) {
    return entries.flatMap(entry => {
      if (!Array.isArray(entry?.noticeTimeline)) return [];
      const candidates = entry.noticeTimeline.filter(notice => !(Array.isArray(notice?.kinds) && notice.kinds.includes('executed')) &&
        notice?.phase !== 'executed' && originalLink(provider, notice?.sourceUrl));
      const latest = candidates.sort((a, b) => Date.parse(b.authoredAt) - Date.parse(a.authoredAt))[0];
      if (!latest) return [];
      const merged = normalize(provider, latest.authoredAt, latest.sourceUrl, planFromFeed(entry.plannedTiming), entry.expiresAt);
      return merged ? [merged] : [];
    });
  }

  function bundledPending(bundle) {
    function read(pointer) {
      const file = pointer?.href;
      if (typeof file !== 'string' || !/^blobs\/[a-f0-9]{64}\.json$/.test(file)) throw new Error('Unrecognized reset data');
      return JSON.parse(bundle.blobs?.['v5/' + file]);
    }
    const snapshot = read(JSON.parse(bundle.latest).snapshot);
    const directory = read(snapshot.pendingResetActions);
    if (!Array.isArray(directory.pages)) throw new Error('Missing pending reset index');
    return directory.pages.flatMap(pointer => read(pointer).items);
  }

  async function fetchPending(provider) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);
    try {
      const response = await fetch(feeds[provider], { credentials: 'omit', cache: 'no-cache', signal: controller.signal });
      if (!response.ok) throw new Error('Reset preview feed is unavailable');
      const result = await response.json();
      const entries = provider === 'codex' ? bundledPending(result) : result.pendingResetActions;
      if (!Array.isArray(entries)) throw new Error('Missing pending reset list');
      return normalizedPending(provider, entries);
    } finally {
      clearTimeout(timeout);
    }
  }

  function timingLabel(plan, now) {
    if (!plan) return '重置时间待公布';
    if (now > plan.end) return '已到预告时间 · 待官方确认';
    if (plan.relation === 'day') return '预计 ' + zhDay.format(plan.start);
    if (plan.relation === 'deadline') return '预计 ' + zhTime.format(plan.end) + ' 前';
    if (plan.relation === 'not_before') return '预计 ' + zhTime.format(plan.start) + ' 后';
    if (plan.relation === 'interval' || plan.start !== plan.end) return '预计 ' + zhTime.formatRange(plan.start, plan.end);
    return '预计 ' + zhTime.format(plan.start) + (plan.approximate ? ' 左右' : '');
  }

  function recentAnnouncement(provider, record, now) {
    const at = timestamp(record?.announcedAt ?? record?.addedAt);
    if (!Number.isFinite(at) || at > now || now - at >= day) return null;
    const source = originalLink(provider, record.url);
    return source ? { source, title: '新收录公告', label: record.detail } : null;
  }

  return (page, previews, { announcements: seeds, automaticAnnouncements: saved, events }) => {
    const cards = [...previews.querySelectorAll('.public-card')].map(node => ({ node, provider: node.dataset.provider }));
    const manual = (Array.isArray(seeds) ? seeds : []).flatMap(entry => {
      if (!entry) return [];
      const report = normalize(entry.provider, entry.publishedAt, entry.url, planFromLocal(entry), entry.expiresAt);
      return report ? [report] : [];
    });
    const stored = (Array.isArray(saved) ? saved : []).flatMap(entry => {
      if (!entry) return [];
      const report = normalize(entry.provider, entry.publishedAt, entry.url, planFromFeed(entry.plannedTiming), entry.expiresAt);
      return report ? [report] : [];
    });
    const live = new Map();
    let lastFetch = 0;
    let fetching = false;

    function show(entry, notice, breathe) {
      const { node } = entry;
      if (!notice) {
        entry.panel?.remove();
        entry.ring?.remove();
        entry.panel = null;
        entry.ring = null;
        delete node.dataset.announced;
        return;
      }
      node.dataset.announced = 'true';
      if (!entry.panel) {
        const panel = document.createElement('aside');
        panel.className = 'public-announcement';
        const title = document.createElement('strong');
        const timing = document.createElement('span');
        timing.setAttribute('aria-live', 'polite');
        const link = document.createElement('a');
        link.textContent = '查看团队原帖';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        panel.append(title, timing, link);
        node.append(panel);
        Object.assign(entry, { panel, title, timing, link });
      }
      const changed = entry.link.href !== notice.source || entry.title.textContent !== notice.title;
      if (changed) {
        entry.panel.setAttribute('aria-label', notice.title);
        entry.title.textContent = notice.title;
        entry.link.href = notice.source;
      }
      if (entry.timing.textContent !== notice.label) entry.timing.textContent = notice.label;
      if (!page.hidden && (breathe || changed)) {
        entry.ring?.remove();
        entry.ring = document.createElement('span');
        entry.ring.className = 'public-announcement-ring';
        entry.ring.setAttribute('aria-hidden', 'true');
        node.append(entry.ring);
      }
    }

    function render(breathe = false) {
      const now = Date.now();
      for (const card of cards) {
        const indexed = live.get(card.provider) ?? stored.filter(entry => entry.provider === card.provider);
        const reports = [...manual.filter(entry => entry.provider === card.provider), ...indexed];
        const notice = reports.filter(entry => entry.at <= now + 60000 && entry.expires > now)
          .sort((a, b) => b.at - a.at)[0];
        const alert = notice
          ? { source: notice.source, title: '重置预告', label: timingLabel(notice.plan, now) }
          : recentAnnouncement(card.provider, events[card.provider]?.[0], now);
        show(card, alert, breathe);
      }
    }

    async function refresh() {
      if (fetching || Date.now() - lastFetch < 300000) return;
      fetching = true;
      lastFetch = Date.now();
      await Promise.allSettled(Object.keys(feeds).map(async provider => {
        live.set(provider, await fetchPending(provider));
        if (!page.hidden) render();
      }));
      fetching = false;
    }

    function visit() {
      render(true);
      void refresh();
    }

    page.addEventListener('reset:enter', visit);
    window.addEventListener('online', () => {
      if (!page.hidden) {
        lastFetch = 0;
        void refresh();
      }
    });
    setInterval(() => {
      if (!page.hidden && !document.hidden) {
        render();
        void refresh();
      }
    }, 60000);
    if (!page.hidden) visit();
  };
})();
