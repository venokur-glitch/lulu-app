/* Lulu's app. Local-first state, optional Supabase sync (see sync.js). */
(function () {
  'use strict';
  var S = window.SEASON;
  var CFG = window.LULU_CONFIG || {};
  var KEY = CFG.storageKey || 'lulu.state.v1';
  var app = document.getElementById('app');
  var overlay = document.getElementById('overlay');

  // ---------- dates and times ----------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return ymd(d); }
  function todayStr() { return window.__TODAY || ymd(new Date()); }
  function daysBetween(a, b) { return Math.round((parse(b) - parse(a)) / 86400000); }
  var DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var DOW3 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function nice(s) { var d = parse(s); return DOW3[d.getDay()] + ', ' + MON[d.getMonth()] + ' ' + d.getDate(); }
  function short(s) { var d = parse(s); return MON[d.getMonth()] + ' ' + d.getDate(); }
  function toMin(t) { var p = t.split(':'); return (+p[0]) * 60 + (+p[1]); }
  function fmtT(m) { var h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? 'pm' : 'am'; var hh = h % 12 || 12; return hh + ':' + pad(mm) + ' ' + ap; }
  function hrs(m) { var h = m / 60; return (Math.round(h * 2) / 2).toString().replace('.5', '½'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function uid() { return Math.random().toString(36).slice(2, 10); }

  // ---------- state ----------
  function fresh() {
    var t = todayStr();
    var patterns = [];
    for (var i = 0; i < 12; i++) patterns.push({ name: '', status: 'seed' });
    return {
      v: 1, updatedAt: Date.now(), seasonId: S.id, __fresh: true,
      settings: { commute: 45, tier: 20 },
      tasks: [
        { id: uid(), text: 'Gather the mood boards in one folder', date: t, done: false },
        { id: uid(), text: 'List every idea, circle the six strongest', date: t, done: false },
        { id: uid(), text: 'Name the six and put them in order', date: t, done: false }
      ],
      focus: {}, patterns: patterns, moves: {}, shifts: [], ideas: [], blocksDone: {}, checkins: {}, rescue: {}, morning: {}, evening: {}
    };
  }
  // Bring any saved data up to the current shape. Never drops anything.
  function migrate(st) {
    st = st || fresh();
    var dflt = fresh();
    ['focus', 'moves', 'blocksDone', 'checkins', 'rescue', 'morning', 'evening'].forEach(function (k) { if (!st[k] || typeof st[k] !== 'object') st[k] = {}; });
    ['tasks', 'shifts', 'ideas'].forEach(function (k) { if (!Array.isArray(st[k])) st[k] = []; });
    if (!Array.isArray(st.patterns)) st.patterns = dflt.patterns;
    if (!st.settings) st.settings = { commute: 45, tier: 20 };
    if (!Array.isArray(st.events)) st.events = [];
    if (!st.bloomDays) st.bloomDays = {};
    if (!Array.isArray(st.mantras)) st.mantras = [];
    if (!st.private) st.private = {};
    if (!st.private.cycle) st.private.cycle = { on: false, starts: [], periodLen: 5, cycleLen: 28 };
    if (!st.private.notes) st.private.notes = {};
    // v1 kept end-of-day notes in focus; move them into the private (encrypted) area
    Object.keys(st.focus).forEach(function (d) {
      var f = st.focus[d];
      if (f && f.note) { if (!st.private.notes[d]) st.private.notes[d] = f.note; delete f.note; }
    });
    st.v = 2;
    return st;
  }
  function sample() {
    var st = fresh(); delete st.__fresh;
    st.shifts = [['2026-11-02', '14:00', '20:00'], ['2026-11-04', '10:00', '16:00'], ['2026-11-06', '14:00', '20:00'], ['2026-11-10', '14:00', '20:00'], ['2026-11-12', '10:00', '16:00']].map(function (x) { return { id: uid(), date: x[0], start: x[1], end: x[2] }; });
    st.events = [{ id: uid(), date: '2026-11-19', title: 'Dentist (sample)', kind: 'Appointment', start: '15:00', end: '16:00' }, { id: uid(), date: '2026-11-26', title: 'Thanksgiving', kind: 'Plans', start: '', end: '' }];
    st.ideas = [{ id: uid(), text: 'Stickers of my patterns (sample idea)', date: '2026-10-31', status: 'parked' }];
    st.patterns[0] = { name: 'Faded Letters (sample)', status: 'bloom' };
    st.patterns[1] = { name: '', status: 'sprout' };
    st = migrate(st);
    st.private.cycle = { on: true, starts: ['2026-10-20'], periodLen: 5, cycleLen: 28 };
    return st;
  }
  var state;
  try { state = JSON.parse(localStorage.getItem(KEY)); } catch (e) { state = null; }
  if (!state && CFG.sample) state = sample();
  state = migrate(state);
  function save(skipSync) {
    state.updatedAt = Date.now(); delete state.__fresh;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    if (!skipSync && window.LuluSync) window.LuluSync.push(state);
  }
  window.LuluApp = {
    getState: function () { return state; },
    migrate: function (s) { return migrate(s); },
    replaceState: function (s) { state = migrate(s); try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} render(); },
    render: function () { render(); }
  };

  // ---------- season helpers ----------
  function weekIndex(d) {
    var i = Math.floor(daysBetween(S.start, d) / 7);
    return Math.max(0, Math.min(S.weeks.length - 1, i));
  }
  function weekStart(i) { return addDays(S.start, i * 7); }
  function weekEnd(i) { return i === S.weeks.length - 1 ? S.end : addDays(S.start, i * 7 + 6); }
  function dayN(d) { return Math.max(1, Math.min(60, daysBetween(S.start, d) + 1)); }
  function dayLabel(d) {
    var until = daysBetween(d, S.start);
    if (until === 1) return 'Day 1 is tomorrow';
    if (until > 1) return 'Day 1 is ' + nice(S.start);
    return 'Day ' + dayN(d) + ' of 60';
  }
  function bloomCount() { var n = 0; for (var i = 0; i < 6; i++) if (state.patterns[i].status === 'bloom') n++; return n; }
  function goalProgress(g) {
    var tot = 0, done = 0;
    S.weeks.forEach(function (w, i) { if (w.goal === g) w.moves.forEach(function (m, j) { tot++; if (state.moves[i + '-' + j]) done++; }); });
    return { tot: tot, done: done };
  }

  // ---------- scheduler ----------
  var KIND = {
    create: { label: 'Create', color: '#E8B4BE' },
    market: { label: 'Market', color: '#A9BCD3' },
    maintain: { label: 'Maintain', color: '#C8C68A' },
    'class': { label: 'Class', color: '#9C8E7E' },
    checkin: { label: 'Sunday check-in', color: '#C8C68A' },
    shift: { label: 'Work', color: '#70604F' },
    commute: { label: 'Commute', color: '#C9C8C2' },
    event: { label: 'Event', color: '#B4495F' }
  };

  // ---------- cycle and mantra ----------
  function cycleLen() {
    var c = state.private.cycle, st = c.starts.slice().sort();
    if (st.length >= 2) {
      var diffs = [];
      for (var i = Math.max(1, st.length - 3); i < st.length; i++) diffs.push(daysBetween(st[i - 1], st[i]));
      var avg = Math.round(diffs.reduce(function (a, b) { return a + b; }, 0) / diffs.length);
      if (avg >= 21 && avg <= 40) return avg;
    }
    return c.cycleLen || 28;
  }
  function cycleInfo(d) {
    var c = state.private.cycle;
    if (!c.on || !c.starts.length) return null;
    var st = c.starts.filter(function (x) { return x <= d; }).sort();
    if (!st.length) return null;
    var L = cycleLen(), cd = daysBetween(st[st.length - 1], d) + 1, predicted = false;
    if (cd > L) { cd = ((cd - 1) % L) + 1; predicted = true; }
    var P = c.periodLen || 5, ov = L - 14;
    var phase = cd <= P ? 'Period' : cd < ov - 2 ? 'Follicular' : cd <= ov + 1 ? 'Ovulation' : 'Luteal';
    var note = { Period: 'go gentle, rest counts', Follicular: 'energy often rising', Ovulation: 'energy often high', Luteal: 'plan softer days near the end' }[phase];
    return { cd: cd, phase: phase, note: note, period: cd <= P, predicted: predicted };
  }
  function cycleLine(d) { var c = cycleInfo(d); return c ? 'Cycle day ' + c.cd + ' · ' + c.phase.toLowerCase() + ' · ' + c.note : ''; }
  function mantraFor(d) {
    var list = S.mantras.concat(state.mantras || []);
    return list[Math.abs(daysBetween('2026-01-01', d)) % list.length];
  }
  var DAY_START = 9 * 60, DAY_END = 21 * 60;
  function scaled(min, kind, tier) {
    if (kind === 'class' || kind === 'checkin') return min;
    var v = Math.round(min * tier / 20 / 15) * 15;
    return Math.max(30, v);
  }
  function planDay(d) {
    var tier = state.settings.tier, c = state.settings.commute;
    var dow = parse(d).getDay();
    var items = [], busy = [];
    state.shifts.filter(function (s) { return s.date === d; }).forEach(function (s) {
      var a = toMin(s.start), b = toMin(s.end);
      if (c > 0) items.push({ kind: 'commute', s: a - c, e: a, fixed: true });
      items.push({ kind: 'shift', s: a, e: b, fixed: true, label: 'Work until ' + fmtT(b) });
      if (c > 0) items.push({ kind: 'commute', s: b, e: b + c, fixed: true, label: 'Commute home' });
      busy.push([a - c - 15, b + c + 15]);
    });
    state.events.filter(function (e) { return e.date === d && e.start && e.end; }).forEach(function (e) {
      var a = toMin(e.start), b = toMin(e.end);
      items.push({ kind: 'event', s: a, e: b, fixed: true, label: e.title + ' until ' + fmtT(b) });
      busy.push([a - 15, b + 15]);
    });
    var tpl = (tier === 4 ? S.rescue : S.template)[dow] || [];
    var shortfall = 0, planned = 0, wanted = 0;
    tpl.forEach(function (pair, idx) {
      var kind = pair[0], dur = tier === 4 ? pair[1] : scaled(pair[1], kind, tier);
      var isProject = kind === 'create' || kind === 'market' || kind === 'maintain';
      if (isProject) wanted += dur;
      var gaps = freeGaps(busy);
      if (kind !== 'create') {
        // admin and class prefer after noon, but take anything
        gaps.sort(function (x, y) { return (x[0] >= 720 ? 0 : 1) - (y[0] >= 720 ? 0 : 1) || x[0] - y[0]; });
      }
      var placed = null;
      for (var g = 0; g < gaps.length && !placed; g++) if (gaps[g][1] - gaps[g][0] >= dur) placed = [gaps[g][0], gaps[g][0] + dur];
      if (!placed) {
        var min = kind === 'create' ? 45 : 30, best = null;
        gaps.forEach(function (gp) { if (gp[1] - gp[0] >= min && (!best || gp[1] - gp[0] > best[1] - best[0])) best = gp; });
        if (best) placed = [best[0], best[0] + Math.floor((best[1] - best[0]) / 15) * 15];
      }
      if (placed) {
        var id = d + ':' + kind + ':' + idx;
        items.push({ id: id, kind: kind, s: placed[0], e: placed[1], done: !!state.blocksDone[id] });
        busy.push([placed[0], placed[1] + 15]);
        if (isProject) planned += placed[1] - placed[0];
        if (isProject) shortfall += dur - (placed[1] - placed[0]);
      } else if (isProject) shortfall += dur;
    });
    items.sort(function (a, b) { return a.s - b.s; });
    return { items: items, planned: planned, wanted: wanted, shortfall: shortfall };
  }
  function freeGaps(busy) {
    var b = busy.slice().sort(function (x, y) { return x[0] - y[0]; });
    var gaps = [], cur = DAY_START;
    b.forEach(function (iv) {
      if (iv[0] > cur) gaps.push([cur, Math.min(iv[0], DAY_END)]);
      cur = Math.max(cur, iv[1]);
    });
    if (cur < DAY_END) gaps.push([cur, DAY_END]);
    return gaps.filter(function (g) { return g[1] - g[0] >= 30; }).map(function (g) { return [Math.ceil(g[0] / 15) * 15, g[1]]; });
  }
  function weekOf(d) { var dt = parse(d); var back = (dt.getDay() + 6) % 7; return addDays(d, -back); } // Monday
  function planWeek(mon) {
    var days = [], planned = 0, wanted = 0;
    for (var i = 0; i < 7; i++) { var d = addDays(mon, i); var p = planDay(d); days.push({ d: d, p: p }); planned += p.planned; wanted += p.wanted; }
    return { days: days, planned: planned, wanted: wanted };
  }

  // ---------- routing ----------
  var cardIdx = 0;
  function route() { return (location.hash || '#today').slice(1); }
  window.addEventListener('hashchange', render);
  function setTabs(r) {
    var base = r.split('/')[0]; if (base === 'day') base = 'today';
    document.querySelectorAll('nav.tabs a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-tab') === base); });
  }
  function render() {
    var r = route(); setTabs(r);
    if (document.getElementById('scrim')) overlay.innerHTML = '';
    var views = { today: vToday, day: vDay, week: vWeek, garden: vGarden, ideas: vIdeas, me: vMe };
    (views[r.split('/')[0]] || vToday)();
    window.scrollTo(0, 0);
  }

  // ---------- Today (cards) ----------
  function oneThing(t) {
    var f = state.focus[t];
    if (f && f.one) return f.one;
    return S.weeks[weekIndex(t)].domino;
  }
  function headlineFor(t) {
    var f = state.focus[t];
    if (f && f.headline) return f.headline;
    var wi = weekIndex(t);
    if (wi === 0) return 'Pick your six.';
    if (wi === 1) return 'Make, finish, submit.';
    return S.weeks[wi].theme + '.';
  }
  var energyAns = [];
  function energyResult(a) {
    if (a[1] > 0) return ['Water and a snack.', 'Running on empty feels like running out of motivation. Refuel first, then decide.', 2];
    if (a[2] === 0 || a[0] === 2) return ['Take a real break.', 'You’ve put in the hours. Rest is the next step, and you don’t have to earn it.', 7];
    if (a[2] === 1) return ['Ten minutes outside.', 'A short walk clears a foggy brain faster than another scroll.', 0];
    return ['Playlist and tidy.', 'Put on a favorite playlist and organize files for ten minutes. Starting small often gets you moving.', 4];
  }
  function vToday() {
    var t = todayStr();
    var plan = planDay(t);
    var shift = plan.items.filter(function (i) { return i.kind === 'shift'; })[0];
    var create = plan.items.filter(function (i) { return i.kind === 'create'; })[0];
    var yf = S.goals[0], left = daysBetween(t, yf.due);
    var cyc = cycleLine(t);
    var cards = [
      { bg: 'var(--peony)', theme: '#F5DDE1', label: 'Today’s one thing', h: headlineFor(t), p: oneThing(t), btn: 'Go Deeper', href: '#day' },
      { bg: 'var(--sea)', theme: '#D3DFEB', label: 'Your day', h: dayHeadline(create, shift), p: daySentence(plan, shift), btn: 'See Your Day', href: '#day' },
      { bg: 'var(--chamomile)', theme: '#DCDBAE', label: 'Your garden', h: gardenHeadline(left), p: gardenSentence(left), btn: 'Visit the Garden', href: '#garden' },
      { bg: 'var(--oat)', theme: '#EBE5D7', label: 'Running low?', energy: true }
    ];
    var c = cards[cardIdx];
    var d = parse(t);
    var top = '<div class="top"><span class="label">' + esc(c.label) + '</span><div class="dots" aria-label="Card ' + (cardIdx + 1) + ' of 4">' +
      cards.map(function (_, i) { return '<span class="' + (i === cardIdx ? 'on' : '') + '"></span>'; }).join('') + '</div>' +
      (cardIdx === 0 ? '<p class="serif" style="margin:18px 8px 0;font-style:italic;font-size:21px;line-height:1.3;color:var(--muted)">“' + esc(mantraFor(t)) + '”</p>' : '') + '</div>';
    var mid;
    if (c.energy) {
      if (energyAns.length < S.energy.length) {
        var q = S.energy[energyAns.length];
        mid = '<span class="label" style="letter-spacing:1.2px">Question ' + (energyAns.length + 1) + ' of ' + S.energy.length + '</span>' +
          '<h1 class="big serif" style="font-size:38px">' + esc(q.q) + '</h1>' +
          q.o.map(function (o, i) { return '<button class="pill block" data-en="' + i + '">' + esc(o) + '</button>'; }).join('');
      } else {
        var r = energyResult(energyAns);
        var others = S.refuel.filter(function (_, i) { return i !== r[2]; }).slice(0, 3);
        mid = '<span class="label" style="letter-spacing:1.2px">Try this</span><h1 class="big serif" style="font-size:42px">' + r[0] + '</h1><p>' + r[1] + '</p>' +
          '<div style="width:100%;text-align:left;margin-top:6px"><span class="label">Or pick another</span>' + others.map(function (o) { return '<div style="padding:10px 0;border-bottom:1px solid #CFC7B6;font-size:15px">' + esc(o) + '</div>'; }).join('') + '</div>' +
          '<button class="pill small" data-en="reset" style="border:0;text-decoration:underline">Start over</button>';
      }
    } else {
      mid = '<span class="label" style="letter-spacing:1.2px">' + DOW[d.getDay()] + ' · ' + MON[d.getMonth()] + ' ' + d.getDate() + ' · ' + dayLabel(t) + '</span>' +
        (cardIdx === 0 && cyc ? '<span style="font-size:12px;padding:6px 12px;border-radius:99px;background:rgba(255,255,255,.6)">' + esc(cyc) + '</span>' : '') +
        '<h1 class="big serif">' + esc(c.h) + '</h1><p>' + esc(c.p) + '</p>' +
        '<a class="pill" href="' + c.href + '" style="margin-top:12px">' + c.btn + '</a>';
    }
    app.innerHTML = '<section class="card" style="background:' + c.bg + '" id="card">' + top +
      '<div class="mid"' + (c.energy ? ' style="justify-content:flex-start;padding-top:24px;gap:12px;width:100%"' : '') + '>' + mid + '</div>' +
      '<div class="nav"><button class="round" aria-label="Previous card" data-act="prev">' + arrow('M15 5l-7 7 7 7') + '</button>' +
      '<button class="round" aria-label="Next card" data-act="next">' + arrow('M9 5l7 7-7 7') + '</button></div></section>';
    document.querySelector('meta[name=theme-color]').setAttribute('content', c.theme);
    bind('[data-act=next]', function () { cardIdx = (cardIdx + 1) % 4; vToday(); });
    bind('[data-act=prev]', function () { cardIdx = (cardIdx + 3) % 4; vToday(); });
    app.querySelectorAll('[data-en]').forEach(function (b) {
      b.addEventListener('click', function () { var v = b.getAttribute('data-en'); if (v === 'reset') energyAns = []; else energyAns.push(+v); vToday(); });
    });
    swipe(document.getElementById('card'), function (dir) { cardIdx = (cardIdx + (dir > 0 ? 1 : 3)) % 4; vToday(); });
  }
  function dayHeadline(create, shift) {
    if (state.settings.tier === 4) return 'Small is enough today.';
    if (create && shift) return create.s < shift.s ? 'Create first. Work at ' + fmtT(shift.s).replace(':00', '').replace(' ', '') + '.' : 'Work first. Create after.';
    if (shift) return 'A work day. Rest counts.';
    if (create) return 'A making day.';
    return 'An open day.';
  }
  function daySentence(plan, shift) {
    var parts = plan.items.filter(function (i) { return i.kind !== 'commute'; }).map(function (i) {
      return (i.kind === 'shift' ? 'work' : KIND[i.kind].label.toLowerCase()) + ' at ' + fmtT(i.s);
    });
    var s = parts.length ? 'Today: ' + parts.join(', ') + '.' : 'Nothing is scheduled. Add your hours in Week when they land.';
    if (shift) s += ' Leave by ' + fmtT(shift.s - state.settings.commute) + '.';
    return s;
  }
  function gardenHeadline(left) {
    var b = bloomCount();
    if (left > 1) return (left <= 20 ? numWord(left) : left) + ' days to bloom.';
    if (left === 1) return 'Tomorrow is the day.';
    if (left === 0) return 'Submission day.';
    return b + ' of 6 in bloom.';
  }
  function gardenSentence(left) {
    var b = bloomCount();
    if (left >= 0) return 'Yesterday Forgotten goes to P&B Textiles on November 12. ' + b + ' of 6 must-have patterns are in bloom.';
    return 'Week ' + (weekIndex(todayStr()) + 1) + ' of 9: ' + S.weeks[weekIndex(todayStr())].theme.toLowerCase() + '.';
  }
  function numWord(n) { return ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty'][n] || n; }
  function arrow(d) { return '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>'; }
  function swipe(el, cb) {
    var x0 = null;
    el.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) cb(dx < 0 ? 1 : -1); x0 = null; });
  }

  // ---------- Day (Go Deeper) ----------
  function vDay() {
    var t = todayStr();
    var f = state.focus[t] || {};
    var plan = planDay(t);
    var mine = state.tasks.filter(function (k) { return k.date === t || (!k.done && k.date < t); });
    var check = function (on) { return '<span class="check' + (on ? ' on' : '') + '">' + (on ? tick() : '') + '</span>'; };
    var html = '<div class="screen">' +
      '<a href="#today" class="pill small" style="border:0;padding:0;min-height:44px">← Today</a>' +
      '<div style="margin-top:6px"><span class="label">Day ' + dayN(t) + ' of 60 · Week ' + (weekIndex(t) + 1) + '</span>' +
      '<h1 class="big serif" style="font-size:40px;margin-top:6px">' + esc(headlineFor(t)) + '</h1>' +
      (cycleLine(t) ? '<p class="muted" style="margin:6px 0 0;font-size:13px">' + esc(cycleLine(t)) + '</p>' : '') +
      '<textarea class="edit" id="one" rows="2" aria-label="Today’s one thing" style="margin-top:8px;font-size:16px">' + esc(oneThing(t)) + '</textarea></div>' +
      '<div class="section"><span class="label">Steps</span>' +
      mine.map(function (k) {
        return '<div style="display:flex;align-items:center;border-bottom:1px solid var(--rule)"><button class="row" style="border:0;flex:1" data-task="' + k.id + '" aria-pressed="' + k.done + '">' + check(k.done) +
          '<span class="' + (k.done ? 'done-text' : '') + '">' + esc(k.text) + (k.date < t && !k.done ? '<span class="tag">from ' + short(k.date) + '</span>' : '') + '</span></button>' +
          '<button class="x" aria-label="Remove ' + esc(k.text) + ' from today" data-rmtask="' + k.id + '">\u00D7</button></div>';
      }).join('') +
      '<form class="add" id="addTask"><input id="taskText" placeholder="Add a step" aria-label="Add a step" autocomplete="off"><button class="pill small solid" type="submit">Add</button></form>' +
      '<label class="italic" style="display:block;margin-top:18px">Not today: <input id="boundary" class="edit italic" style="display:inline;width:auto;min-width:60%;font-size:19px" value="' + esc(f.boundary || 'the website, or any new idea.') + '"></label></div>' +
      '<div class="section"><span class="label">Your day</span><div class="tl">' +
      state.events.filter(function (e) { return e.date === t && !(e.start && e.end); }).map(function (e) {
        return '<span class="dot" style="background:' + KIND.event.color + '"></span><span class="muted">All day</span><span>' + esc(e.title) + '</span>';
      }).join('') +
      plan.items.map(function (i) {
        var lbl = i.label || KIND[i.kind].label + (i.kind === 'create' ? ' · ' + (S.goals.filter(function (g) { return g.id === S.weeks[weekIndex(t)].goal; })[0] || { name: 'your goals' }).name : '');
        var movable = !i.fixed;
        return '<span class="dot" style="background:' + KIND[i.kind].color + '"></span><span class="muted">' + fmtT(i.s) + '</span>' +
          (movable ? '<button data-block="' + i.id + '" aria-pressed="' + i.done + '"><span class="' + (i.done ? 'done-text' : '') + '">' + esc(lbl) + ' · ' + hrs(i.e - i.s) + 'h</span></button>' : '<span class="muted">' + esc(lbl) + '</span>');
      }).join('') +
      '<span class="dot" style="background:#C8C68A"></span><span class="muted">9:30 pm</span><span>Close the day · 5 min</span>' +
      '</div>' + (plan.items.length ? '<p class="muted" style="font-size:13px;margin:10px 0 0">Tap a block when it’s done.</p>' : '') + '</div>' +
      ritual('Morning setup · 10 min', 'morning', ['Look at today and see how much time you have', 'Choose the one thing that matters most', 'Open the file or materials you need']) +
      ritual('Evening close · 5 min', 'evening', ['Save your work and leave files organized', 'Write down where to begin tomorrow', 'Name one thing you did well']) +
      '<div class="section"><span class="label">End-of-day note</span><textarea class="edit" id="note" rows="3" placeholder="What worked? One win?">' + esc(state.private.notes[t] || '') + '</textarea></div>' +
      '</div>';
    app.innerHTML = html;
    function setF(k, v) { state.focus[t] = state.focus[t] || {}; state.focus[t][k] = v; save(); }
    document.getElementById('one').addEventListener('change', function (e) { setF('one', e.target.value.trim()); });
    document.getElementById('boundary').addEventListener('change', function (e) { setF('boundary', e.target.value.trim()); });
    document.getElementById('note').addEventListener('change', function (e) { state.private.notes[t] = e.target.value; save(); });
    app.querySelectorAll('[data-rmtask]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-rmtask'), k = state.tasks.filter(function (x) { return x.id === id; })[0];
        if (!k) return;
        state.tasks = state.tasks.filter(function (x) { return x.id !== id; });
        var idea = k.from && state.ideas.filter(function (x) { return x.id === k.from; })[0];
        if (idea) idea.status = 'parked';
        save(); vDay();
        toast(idea ? 'Moved back to the Parking Lot' : 'Removed from today');
      });
    });
    app.querySelectorAll('[data-task]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = state.tasks.filter(function (x) { return x.id === b.getAttribute('data-task'); })[0];
        k.done = !k.done; if (k.done) { k.date = k.date < t ? t : k.date; } save(); vDay();
        var list = state.tasks.filter(function (x) { return x.date === t || (!x.done && x.date < t); });
        if (k.done && list.length && list.every(function (x) { return x.done; })) celebrate(t);
      });
    });
    app.querySelectorAll('[data-block]').forEach(function (b) {
      b.addEventListener('click', function () { var id = b.getAttribute('data-block'); state.blocksDone[id] = !state.blocksDone[id]; save(); vDay(); });
    });
    app.querySelectorAll('[data-rit]').forEach(function (b) {
      b.addEventListener('click', function () { var p = b.getAttribute('data-rit').split('|'); state[p[0]][t] = state[p[0]][t] || {}; state[p[0]][t][p[1]] = !state[p[0]][t][p[1]]; save(); vDay(); });
    });
    document.getElementById('addTask').addEventListener('submit', function (e) {
      e.preventDefault(); var v = document.getElementById('taskText').value.trim(); if (!v) return;
      state.tasks.push({ id: uid(), text: v, date: t, done: false }); save(); vDay();
    });
  }
  function celebrate(t) {
    var first = !state.bloomDays[t];
    state.bloomDays[t] = true; save();
    var n = Object.keys(state.bloomDays).filter(function (d) { return d >= S.start && d <= S.end; }).length;
    var colors = ['#D98E9C', '#F5DDE1', '#E8B4BE', '#DCDBAE', '#D3DFEB'];
    var layer = document.createElement('div'); layer.className = 'petals'; layer.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 22; i++) {
      var sz = 14 + (i * 7) % 12;
      layer.innerHTML += '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 20 20" style="left:' + ((i * 47) % 96) + '%;animation-duration:' + (3.5 + (i * 13) % 4 * 0.5) + 's,3s;animation-delay:' + ((i * 0.23) % 1.6).toFixed(2) + 's,0s"><path d="M10 1c4 3 6 7 4 12-1 3-3 5-4 6-1-1-3-3-4-6C4 8 6 4 10 1z" fill="' + colors[i % 5] + '"/></svg>';
    }
    document.body.appendChild(layer);
    setTimeout(function () { layer.remove(); }, 7000);
    var inSeason = t >= S.start;
    sheet('<div style="text-align:center"><span class="label">Every step, done</span><h2 class="serif" style="font-size:42px;margin:8px 0 6px;line-height:1.05">Today bloomed.</h2>' +
      '<p style="margin:0 0 18px;font-size:15px;line-height:1.5">' + (inSeason ? 'One more flower for your season bouquet. That’s ' + n + ' of 60.' : 'Nicely done. Your season bouquet starts ' + nice(S.start) + '.') + '</p>' +
      '<button class="pill solid block" id="lovely">Lovely</button></div>', function (root, close) { root.querySelector('#lovely').addEventListener('click', close); });
  }
  function ritual(title, key, steps) {
    var t = todayStr(), m = (state[key] || {})[t] || {};
    return '<div class="section"><span class="label">' + title + '</span>' + steps.map(function (s, i) {
      var on = !!m[i];
      return '<button class="row" data-rit="' + key + '|' + i + '" aria-pressed="' + on + '" style="min-height:48px"><span class="check' + (on ? ' on' : '') + '">' + (on ? tick() : '') + '</span><span class="' + (on ? 'done-text' : '') + '" style="font-size:15px">' + s + '</span></button>';
    }).join('') + '</div>';
  }
  function tick() { return '<svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>'; }

  // ---------- Week ----------
  var weekOffset = 0, weekMode = 'week', monthOffset = 0, selDay = null;
  function modeToggle(m) {
    return '<div style="display:flex;justify-content:center;margin-bottom:14px"><div style="display:flex;border:1.5px solid var(--ink);border-radius:99px;overflow:hidden">' +
      ['week', 'month'].map(function (x) { return '<button data-mode="' + x + '" style="min-height:38px;padding:0 22px;border:0;font-size:14px;background:' + (m === x ? 'var(--ink);color:#fff' : 'transparent') + '">' + (x === 'week' ? 'Week' : 'Month') + '</button>'; }).join('') + '</div></div>';
  }
  function bindMode() { app.querySelectorAll('[data-mode]').forEach(function (b) { b.addEventListener('click', function () { weekMode = b.getAttribute('data-mode'); vWeek(); }); }); }
  function vMonth() {
    var t = todayStr(), base = parse(t);
    var first = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
    var mStr = ymd(first), month = first.getMonth();
    var gridStart = weekOf(mStr);
    var sel = selDay || t;
    var deadlines = {}; S.goals.forEach(function (g) { if (g.due) deadlines[g.due] = g.name + ' due'; });
    var cycOn = state.private.cycle.on;
    var cells = '';
    for (var i = 0; i < 42; i++) {
      var d = addDays(gridStart, i), dt = parse(d), inM = dt.getMonth() === month;
      if (i === 35 && !inM) break;
      var ci = cycOn ? cycleInfo(d) : null;
      var bg = d === sel ? 'var(--ink)' : ci && ci.period ? (ci.predicted ? 'rgba(232,180,190,.55)' : '#E8B4BE') : 'rgba(255,255,255,.55)';
      var fg = d === sel ? '#fff' : 'var(--ink)';
      var dots = '';
      if (state.shifts.some(function (x) { return x.date === d; })) dots += '<i style="background:#70604F"></i>';
      if (state.events.some(function (x) { return x.date === d; })) dots += '<i style="background:#B4495F"></i>';
      if (deadlines[d]) dots += '<i style="background:#1F1B17"></i>';
      cells += '<button data-day="' + d + '" aria-label="' + nice(d) + '" style="background:' + bg + ';color:' + fg + ';opacity:' + (inM ? 1 : 0.4) + (d === t ? ';box-shadow:inset 0 0 0 1.5px var(--ink)' : '') + '">' +
        dt.getDate() + '<small>' + (ci ? 'CD ' + ci.cd : '') + '</small><span class="dots2">' + dots + '</span></button>';
    }
    var ci2 = cycOn ? cycleInfo(sel) : null;
    var items = [];
    if (deadlines[sel]) items.push('<div style="padding:8px 0">' + esc(deadlines[sel]) + '</div>');
    state.shifts.filter(function (x) { return x.date === sel; }).forEach(function (x) { items.push('<div style="padding:8px 0">Work ' + fmtT(toMin(x.start)) + ' to ' + fmtT(toMin(x.end)) + '</div>'); });
    state.events.filter(function (x) { return x.date === sel; }).forEach(function (x) {
      items.push('<div style="display:flex;justify-content:space-between;align-items:center"><span style="padding:8px 0">' + esc(x.title) + ' · ' + (x.start && x.end ? fmtT(toMin(x.start)) + ' to ' + fmtT(toMin(x.end)) : 'all day') + '</span><button class="x" aria-label="Remove ' + esc(x.title) + '" data-delev="' + x.id + '">×</button></div>');
    });
    if (!items.length) items.push('<div class="muted" style="padding:8px 0">Open day. Your Create blocks go here first.</div>');
    var cyc = state.private.cycle, isStart = cyc.starts.indexOf(sel) >= 0;
    if (cycOn && isStart) items.push('<button class="pill small" data-per="off" style="margin-top:6px">Remove period start</button>');
    else if (cycOn && sel <= t) items.push('<button class="pill small solid" data-per="on" style="margin-top:6px">My period started this day</button>');
    app.innerHTML = '<div class="screen" style="background:var(--sea);min-height:100vh;padding-left:14px;padding-right:14px">' + modeToggle('month') +
      '<div style="display:flex;align-items:center;justify-content:space-between"><button class="x" aria-label="Previous month" data-mo="-1">←</button><h1 class="big serif" style="font-size:40px">' + ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][month] + '</h1><button class="x" aria-label="Next month" data-mo="1">→</button></div>' +
      '<div class="cal" style="margin-top:8px">' + ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(function (x) { return '<span style="font-size:11px;font-weight:600;color:#4E5A6B">' + x + '</span>'; }).join('') + cells + '</div>' +
      '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;font-size:11px;color:#33404F;margin-top:10px">' + (cycOn ? '<span><span style="display:inline-block;width:10px;height:10px;border-radius:9px;background:#E8B4BE;vertical-align:-1px"></span> Period</span>' : '') + '<span><span style="display:inline-block;width:6px;height:6px;border-radius:9px;background:#70604F"></span> Work</span><span><span style="display:inline-block;width:6px;height:6px;border-radius:9px;background:#B4495F"></span> Event</span><span><span style="display:inline-block;width:6px;height:6px;border-radius:9px;background:#1F1B17"></span> Deadline</span>' + (cycOn ? '<span>CD = cycle day</span>' : '') + '</div>' +
      '<div class="note" style="margin-top:14px"><span class="label">' + esc(nice(sel)) + (ci2 ? ' · Cycle day ' + ci2.cd : '') + '</span>' +
      (ci2 ? '<div class="serif" style="font-size:22px;margin-top:4px">' + ci2.phase + ': ' + ci2.note + '</div>' + (ci2.predicted ? '<div class="muted" style="font-size:12px">Estimated from your last logged period</div>' : '') : '') + items.join('') +
      '<form id="addEv" style="display:flex;flex-direction:column;gap:8px;margin-top:10px">' +
      '<label class="field">Add to this day<input id="evT" placeholder="Appointment, birthday, plans…" autocomplete="off" required></label>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><label class="field">From (optional)<input type="time" id="evS"></label><label class="field">To<input type="time" id="evE"></label></div>' +
      '<button class="pill solid block" type="submit">Add</button><span class="muted" style="font-size:12px">Times you add here are kept clear when your week is planned.</span></form></div>' +
      '</div>';
    bindMode();
    app.querySelectorAll('[data-day]').forEach(function (b) { b.addEventListener('click', function () { selDay = b.getAttribute('data-day'); vMonth(); }); });
    app.querySelectorAll('[data-mo]').forEach(function (b) { b.addEventListener('click', function () { monthOffset += +b.getAttribute('data-mo'); selDay = null; vMonth(); }); });
    app.querySelectorAll('[data-per]').forEach(function (b) {
      b.addEventListener('click', function () {
        var c = state.private.cycle;
        if (b.getAttribute('data-per') === 'on') { if (c.starts.indexOf(sel) < 0) c.starts.push(sel); toast('Period logged for ' + short(sel)); }
        else { c.starts = c.starts.filter(function (x) { return x !== sel; }); toast('Removed'); }
        save(); vMonth();
      });
    });
    app.querySelectorAll('[data-delev]').forEach(function (b) { b.addEventListener('click', function () { var id = b.getAttribute('data-delev'); state.events = state.events.filter(function (x) { return x.id !== id; }); save(); vMonth(); }); });
    document.getElementById('addEv').addEventListener('submit', function (e) {
      e.preventDefault();
      var title = document.getElementById('evT').value.trim(), st = document.getElementById('evS').value, en = document.getElementById('evE').value;
      if (!title) return;
      if ((st && !en) || (!st && en)) { toast('Add both times, or neither for all day'); return; }
      if (st && en && toMin(en) <= toMin(st)) { toast('End time needs to be after start'); return; }
      state.events.push({ id: uid(), date: sel, title: title, kind: 'Event', start: st, end: en }); save(); vMonth(); toast('Added to ' + short(sel));
    });
  }
  function vWeek() {
    if (weekMode === 'month') return vMonth();
    var mon = addDays(weekOf(todayStr()), weekOffset * 7);
    var w = planWeek(mon);
    var tier = state.settings.tier;
    var target = tier * 60;
    var tiers = [[4, 'Rescue'], [12, '12h'], [16, '16h'], [20, '20h'], [24, '24h']];
    var shiftsThis = state.shifts.filter(function (s) { return s.date >= mon && s.date <= addDays(mon, 6); });
    var lower = tiers.filter(function (x) { return x[0] < tier && x[0] * 60 <= w.planned + 30 && x[0] >= 12; }).pop();
    var html = '<div class="screen" style="background:var(--sea);min-height:100vh">' + modeToggle('week') +
      '<div style="text-align:center"><span class="label">' + short(mon) + ' to ' + short(addDays(mon, 6)) + '</span>' +
      '<h1 class="big serif" style="margin-top:6px">' + (weekOffset === 0 ? 'This week.' : weekOffset === 1 ? 'Next week.' : weekOffset === -1 ? 'Last week.' : 'Week of ' + short(mon) + '.') + '</h1>' +
      '<p style="margin:8px 0 0;font-size:15px">' + hrs(w.planned) + ' of ' + (tier === 4 ? 4 : tier) + ' project hours fit around your shifts.</p></div>' +
      '<div style="display:flex;justify-content:space-between;margin-top:16px"><button class="pill small" data-wk="-1">← Prev</button><button class="pill small" data-wk="0">This week</button><button class="pill small" data-wk="1">Next →</button></div>' +
      (w.planned + 30 < Math.min(target, w.wanted) && tier !== 4 ? '<div class="warn" style="margin-top:16px">Shifts are heavy this week. Only ' + hrs(w.planned) + ' hours fit.' + (lower ? ' <button class="pill small solid" data-tier="' + lower[0] + '" style="margin-top:10px">Use the ' + lower[1] + ' plan</button>' : ' Rescue Mode keeps you moving in 4 hours.') + '</div>' : '') +
      '<div class="section"><span class="label">Plan size</span><div class="seg">' + tiers.map(function (x) { return '<button data-tier="' + x[0] + '" class="' + (x[0] === tier ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="section"><span class="label">Days</span>' + w.days.map(function (day) {
        var it = day.p.items.filter(function (i) { return i.kind !== 'commute'; });
        return '<div style="padding:12px 0;border-bottom:1px solid #A9BCD3"><div style="display:flex;justify-content:space-between;font-size:15px"><b style="font-weight:600">' + nice(day.d) + '</b><span class="muted">' + (day.p.planned ? hrs(day.p.planned) + 'h project' : '') + '</span></div>' +
          (it.length ? '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">' + it.map(function (i) {
            var dark = i.kind === 'shift' || i.kind === 'class';
            return '<span style="font-size:12px;padding:5px 9px;border-radius:99px;background:' + KIND[i.kind].color + ';color:' + (dark ? '#fff' : 'var(--ink)') + (i.done ? ';opacity:.5;text-decoration:line-through' : '') + '">' + (i.kind === 'shift' ? 'Work' : KIND[i.kind].label) + ' ' + fmtT(i.s) + '</span>';
          }).join('') + '</div>' : '<div class="muted" style="font-size:13px;margin-top:4px">Open</div>') + '</div>';
      }).join('') + '</div>' +
      '<div class="section" style="text-align:center"><h2 class="serif" style="font-size:32px;margin:0">New hours landed?</h2><p style="font-size:14px;margin:6px 0 14px">Add shifts from UKG. Your ' + state.settings.commute + '-minute commute goes in both ways.</p>' +
      '<form id="addShift" class="grid3" style="text-align:left">' +
      '<label class="field">Date<input type="date" id="sd" required value="' + (lastShiftDate() || mon) + '"></label>' +
      '<label class="field">Start<input type="time" id="ss" required value="' + (lastShift().start || '14:00') + '"></label>' +
      '<label class="field">End<input type="time" id="se" required value="' + (lastShift().end || '20:00') + '"></label>' +
      '<button class="pill solid block" type="submit" style="grid-column:1/-1;margin-top:6px">Add Shift</button></form>' +
      '<div style="margin-top:14px;text-align:left">' + (shiftsThis.length ? shiftsThis : []).sort(byDate).map(function (s) {
        return '<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #A9BCD3;font-size:15px"><span style="padding:12px 0">' + nice(s.date) + '</span><span style="display:flex;align-items:center;gap:4px">' + fmtT(toMin(s.start)) + ' to ' + fmtT(toMin(s.end)) + '<button class="x" aria-label="Remove shift" data-del="' + s.id + '">×</button></span></div>';
      }).join('') + '</div>' +
      '<label class="field" style="margin-top:16px;text-align:left">Commute each way (minutes)<input type="number" id="commute" min="0" max="180" step="5" value="' + state.settings.commute + '"></label></div>' +
      '</div>';
    app.innerHTML = html;
    bindMode();
    app.querySelectorAll('[data-wk]').forEach(function (b) { b.addEventListener('click', function () { var v = +b.getAttribute('data-wk'); weekOffset = v === 0 ? 0 : weekOffset + v; vWeek(); }); });
    app.querySelectorAll('[data-tier]').forEach(function (b) { b.addEventListener('click', function () { state.settings.tier = +b.getAttribute('data-tier'); save(); vWeek(); }); });
    app.querySelectorAll('[data-del]').forEach(function (b) { b.addEventListener('click', function () { var id = b.getAttribute('data-del'); state.shifts = state.shifts.filter(function (s) { return s.id !== id; }); save(); vWeek(); }); });
    document.getElementById('commute').addEventListener('change', function (e) { state.settings.commute = Math.max(0, +e.target.value || 0); save(); vWeek(); });
    document.getElementById('addShift').addEventListener('submit', function (e) {
      e.preventDefault();
      var d = document.getElementById('sd').value, s = document.getElementById('ss').value, en = document.getElementById('se').value;
      if (!d || !s || !en) return;
      if (toMin(en) <= toMin(s)) { toast('End time needs to be after start'); return; }
      state.shifts.push({ id: uid(), date: d, start: s, end: en });
      save();
      var w2 = weekOf(d); weekOffset = Math.round(daysBetween(weekOf(todayStr()), w2) / 7);
      vWeek(); toast('Shift added. Your week re-planned.');
      var nd = document.getElementById('sd'); if (nd) nd.value = addDays(d, 1);
    });
  }
  function byDate(a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.start < b.start ? -1 : 1; }
  function lastShift() { return state.shifts.slice().sort(byDate).pop() || {}; }
  function lastShiftDate() { var l = lastShift(); return l.date ? addDays(l.date, 1) : null; }

  // ---------- Garden ----------
  function vGarden() {
    var t = todayStr(), wi = weekIndex(t), b = bloomCount();
    var web = goalProgress('web'), mod = goalProgress('model');
    var plants = state.patterns.slice(0, 6).map(function (p, i) { return '<button data-pat="' + i + '" aria-label="Pattern ' + (i + 1) + (p.name ? ', ' + esc(p.name) : '') + ', ' + p.status + '">' + plantSvg(p.status) + '</button>'; }).join('');
    var bonus = state.patterns.slice(6).map(function (p, i) { return '<button data-pat="' + (i + 6) + '" aria-label="Bonus pattern ' + (i + 1) + ', ' + p.status + '">' + bonusSvg(p.status) + '</button>'; }).join('');
    var path = S.weeks.map(function (w, i) {
      var cur = i === wi, past = i < wi;
      return '<button data-week="' + i + '" aria-label="Week ' + (i + 1) + ': ' + esc(w.theme) + (cur ? ' (you are here)' : '') + '"><span style="width:' + (cur ? 14 : 8) + 'px;height:' + (cur ? 14 : 8) + 'px;background:' + (cur || past ? 'var(--ink)' : '#B5AC9A') + '"></span></button>' + (i < S.weeks.length - 1 ? '<i></i>' : '');
    }).join('');
    var celebrate = b === 6 ? '<div class="note" style="text-align:center;margin-top:14px"><span class="serif" style="font-size:24px">All six in bloom.</span><br>' + S.rewards[0].what + '</div>' : '';
    app.innerHTML = '<div class="screen" style="background:var(--oat);min-height:100vh;text-align:center">' +
      '<span class="label">Season one · ' + dayLabel(t) + '</span><h1 class="big serif" style="margin-top:8px">Your Garden</h1>' +
      '<div class="path" style="margin-top:24px">' + path + '</div>' +
      '<div style="display:flex;justify-content:space-between;font-size:12px;margin-top:4px" class="muted"><span>' + short(S.start) + '</span><span>' + esc(S.reward) + ' · ' + short(S.end) + '</span></div>' +
      '<button class="linerow" data-week="' + wi + '" style="border:0;justify-content:center;gap:6px;font-size:14px"><span class="label">Week ' + (wi + 1) + '</span><span>' + esc(S.weeks[wi].theme) + ' →</span></button>' +
      '<div class="bed" style="margin-top:6px"><span class="label">Yesterday Forgotten · Nov 12</span><div class="plants">' + plants + '</div>' +
      '<span class="serif" style="font-size:22px">' + b + ' of 6 in bloom</span><div class="bonus" aria-label="Bonus patterns">' + bonus + '</div><span class="muted" style="font-size:12px">Tap a plant to name it or grow it</span></div>' + celebrate +
      '<div style="margin-top:12px;text-align:left">' +
      bedRow('Website', web, 'plants ' + short(weekStart(2)), 2) + bedRow('Modeling', mod, 'plants ' + short(weekStart(5)), 5) + '</div>' +
      '<a class="pill solid block" href="#day" style="margin-top:22px">Next: ' + esc(lowerFirst(headlineFor(t)).replace(/\.$/, '')) + '</a></div>';
    app.querySelectorAll('[data-pat]').forEach(function (bt) { bt.addEventListener('click', function () { patternSheet(+bt.getAttribute('data-pat')); }); });
    app.querySelectorAll('[data-week]').forEach(function (bt) { bt.addEventListener('click', function () { weekSheet(+bt.getAttribute('data-week')); }); });
  }
  function lowerFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
  function bedRow(name, p, plants, firstWeek) {
    var started = todayStr() >= weekStart(firstWeek);
    return '<button class="linerow" data-week="' + firstWeek + '"><span>' + name + '</span><span class="muted">' + (started || p.done ? p.done + ' of ' + p.tot + ' grown' : plants) + '</span></button>';
  }
  function plantSvg(s) {
    if (s === 'bloom') return '<svg aria-hidden="true" width="40" height="64" viewBox="0 0 40 64"><path d="M20 64V26" stroke="#70604F" stroke-width="2"/><path d="M20 44c-6 0-9-3-10-8 5 0 8 3 10 8z" fill="#9FA36A"/><circle cx="20" cy="12" r="7" fill="#D98E9C"/><circle cx="12" cy="18" r="7" fill="#D98E9C"/><circle cx="28" cy="18" r="7" fill="#D98E9C"/><circle cx="15" cy="26" r="7" fill="#D98E9C"/><circle cx="25" cy="26" r="7" fill="#D98E9C"/><circle cx="20" cy="19" r="4.5" fill="#EBE5D7"/></svg>';
    if (s === 'sprout') return '<svg aria-hidden="true" width="40" height="64" viewBox="0 0 40 64"><path d="M20 64V44" stroke="#70604F" stroke-width="2"/><path d="M20 48c-7 0-10-4-10-9 6 0 9 3 10 9zM20 46c6 0 9-4 9-9-5 0-8 3-9 9z" fill="#9FA36A"/></svg>';
    return '<svg aria-hidden="true" width="40" height="64" viewBox="0 0 40 64"><ellipse cx="20" cy="59" rx="3.5" ry="4.5" fill="#70604F"/></svg>';
  }
  function bonusSvg(s) {
    var fill = s === 'bloom' ? '#D98E9C' : s === 'sprout' ? '#9FA36A' : 'none';
    return '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="6" fill="' + fill + '" stroke="#70604F" stroke-width="1.5"/></svg>';
  }
  function patternSheet(i) {
    var p = state.patterns[i];
    sheet('<span class="label">' + (i < 6 ? 'Must-have pattern ' + (i + 1) : 'Bonus pattern ' + (i - 5)) + '</span>' +
      '<label class="field" style="margin-top:12px">Working name<input id="pn" value="' + esc(p.name) + '" placeholder="Name this pattern"></label>' +
      '<div class="seg" style="margin-top:16px">' + [['seed', 'Not started'], ['sprout', 'In progress'], ['bloom', 'Finished']].map(function (x) { return '<button data-st="' + x[0] + '" class="' + (p.status === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<button class="pill solid block" id="pdone" style="margin-top:20px">Done</button>', function (root, close) {
      root.querySelectorAll('[data-st]').forEach(function (b) { b.addEventListener('click', function () { p.status = b.getAttribute('data-st'); root.querySelectorAll('[data-st]').forEach(function (x) { x.classList.toggle('on', x === b); }); }); });
      root.querySelector('#pdone').addEventListener('click', function () {
        var before = bloomCount();
        p.name = root.querySelector('#pn').value.trim(); save(); close(); vGarden();
        if (bloomCount() > before) toast(bloomCount() === 6 ? 'All six in bloom. Go celebrate.' : 'Another one in bloom.');
      });
    });
  }
  function weekSheet(i) {
    var w = S.weeks[i];
    sheet('<span class="label">Week ' + w.n + ' · ' + short(weekStart(i)) + ' to ' + short(weekEnd(i)) + '</span>' +
      '<h2 class="serif" style="font-size:34px;margin:6px 0 4px;line-height:1.1">' + esc(w.theme) + '</h2><p class="muted" style="margin:0 0 12px;font-size:14px">' + esc(w.phase) + '</p>' +
      w.moves.map(function (m, j) { var on = !!state.moves[i + '-' + j]; return '<button class="row" data-mv="' + i + '-' + j + '" aria-pressed="' + on + '"><span class="check' + (on ? ' on' : '') + '">' + (on ? tick() : '') + '</span><span class="' + (on ? 'done-text' : '') + '" style="font-size:15px">' + esc(m) + '</span></button>'; }).join('') +
      '<div class="note" style="margin-top:16px"><span class="label">First domino</span><br>' + esc(w.domino) + '</div>' +
      '<button class="pill block" id="todom" style="margin-top:14px">Make it today’s one thing</button>', function (root, close) {
      root.querySelectorAll('[data-mv]').forEach(function (b) { b.addEventListener('click', function () { var k = b.getAttribute('data-mv'); state.moves[k] = !state.moves[k]; save(); close(); weekSheet(i); vGarden(); }); });
      root.querySelector('#todom').addEventListener('click', function () { var t = todayStr(); state.focus[t] = state.focus[t] || {}; state.focus[t].one = w.domino; save(); close(); toast('Set as today’s one thing'); });
    });
  }

  // ---------- Ideas (Parking Lot) ----------
  function vIdeas() {
    var parked = state.ideas.filter(function (x) { return x.status === 'parked'; });
    app.innerHTML = '<div class="screen" style="background:var(--peony);min-height:100vh">' +
      '<div style="text-align:center"><span class="label">Parking lot</span><h1 class="big serif" style="margin-top:6px">Good ideas can wait.</h1>' +
      '<p style="margin:8px 0 0;font-size:15px">Catch it here so it stops spinning. Check it against your plan, or park it for your Sunday review.</p></div>' +
      '<form class="add" id="addIdea" style="margin-top:20px"><input id="ideaText" placeholder="A new idea…" aria-label="New idea" autocomplete="off"><button class="pill small solid" type="submit">Catch</button></form>' +
      '<div class="section"><span class="label">Parked (' + parked.length + ')</span>' + (parked.length ? parked.map(function (x) {
        return '<div style="display:flex;align-items:center;gap:8px;border-bottom:1px solid #E0C3C9;min-height:54px"><span style="flex:1;font-size:15px;padding:10px 0">' + esc(x.text) + '<span class="tag">' + short(x.date) + '</span></span><button class="pill small" data-chk="' + x.id + '">Check</button><button class="x" aria-label="Delete idea" data-delid="' + x.id + '">×</button></div>';
      }).join('') : '<p class="muted" style="font-size:14px">Nothing parked yet.</p>') + '</div>' +
      '<div class="section"><span class="label">Kind ways to say “not now”</span><p class="italic" style="margin:6px 0 10px">“I love this, and I want to give it real attention. I’m focused on a few deadlines, so I’m saving it for later.”</p><p class="italic" style="margin:0">“That sounds exciting! I can’t take it on without pushing back something I’ve committed to. It’s on my list.”</p></div></div>';
    document.getElementById('addIdea').addEventListener('submit', function (e) {
      e.preventDefault(); var v = document.getElementById('ideaText').value.trim(); if (!v) return;
      var idea = { id: uid(), text: v, date: todayStr(), status: 'parked' }; state.ideas.unshift(idea); save(); vIdeas(); filterSheet(idea);
    });
    app.querySelectorAll('[data-chk]').forEach(function (b) { b.addEventListener('click', function () { filterSheet(state.ideas.filter(function (x) { return x.id === b.getAttribute('data-chk'); })[0]); }); });
    app.querySelectorAll('[data-delid]').forEach(function (b) { b.addEventListener('click', function () { var id = b.getAttribute('data-delid'); state.ideas = state.ideas.filter(function (x) { return x.id !== id; }); save(); vIdeas(); }); });
  }
  function filterSheet(idea) {
    var ans = [];
    function step(root, close) {
      var q = ans.length;
      if (q === S.filter.length || (q === 1 && ans[0] === false)) {
        var yes = ans.filter(Boolean).length;
        var now = ans[0] && (ans[1] || yes >= 4);
        root.innerHTML = '<div class="grab"></div><span class="label">The verdict</span><h2 class="serif" style="font-size:34px;margin:6px 0">' + (now ? 'Give it time now.' : 'Park it for now.') + '</h2>' +
          '<p style="font-size:15px;line-height:1.5">' + (now ? 'It supports your plan. It’s on today’s steps.' : 'A good idea can wait for its week. It’s safe in the Parking Lot until Sunday.') + '</p><button class="pill solid block" id="ok">Got it</button>' +
          '<button class="pill block" id="undo" style="border:0;margin-top:6px;text-decoration:underline">' + (now ? 'Undo: keep it parked instead' : 'Actually, add it to today') + '</button>';
        var taskId = null;
        function promote() { idea.status = 'promoted'; taskId = uid(); state.tasks.push({ id: taskId, text: idea.text, date: todayStr(), done: false, from: idea.id }); save(); }
        if (now) promote();
        root.querySelector('#ok').addEventListener('click', function () { close(); vIdeas(); });
        root.querySelector('#undo').addEventListener('click', function () {
          if (now) { idea.status = 'parked'; state.tasks = state.tasks.filter(function (x) { return x.id !== taskId; }); save(); toast('Kept in the Parking Lot'); }
          else { promote(); toast('Added to today\u2019s steps'); }
          close(); vIdeas();
        });
        return;
      }
      root.innerHTML = '<div class="grab"></div><span class="label">Question ' + (q + 1) + ' of ' + S.filter.length + '</span><p class="muted" style="margin:6px 0 0;font-size:14px">' + esc(idea.text) + '</p>' +
        '<h2 class="serif" style="font-size:30px;margin:10px 0 18px;line-height:1.15">' + esc(S.filter[q]) + '</h2>' +
        '<div style="display:flex;gap:10px"><button class="pill solid" style="flex:1" id="y">Yes</button><button class="pill" style="flex:1" id="n">No</button></div>' +
        '<button class="pill block" id="skip" style="margin-top:10px;border:0">Just park it</button>';
      root.querySelector('#y').addEventListener('click', function () { ans.push(true); step(root, close); });
      root.querySelector('#n').addEventListener('click', function () { ans.push(false); step(root, close); });
      root.querySelector('#skip').addEventListener('click', function () { close(); vIdeas(); });
    }
    sheet('', step);
  }

  // ---------- Me ----------
  function vMe() {
    var t = todayStr(), mon = weekOf(t), ck = state.checkins[mon] || {};
    var rescueOn = state.settings.tier === 4;
    var r = state.rescue || {};
    var isSun = parse(t).getDay() === 0;
    var newSeason = daysBetween(t, S.end);
    app.innerHTML = '<div class="screen">' +
      '<div style="text-align:center"><span class="label">Me</span><h1 class="big serif" style="margin-top:6px">Hi, Lulu.</h1></div>' +
      '<div class="section" style="background:var(--chamomile);border-radius:24px;padding:18px"><span class="label">Rescue mode</span>' +
      '<p style="margin:6px 0 12px;font-size:15px;line-height:1.5">' + (rescueOn ? 'You’re in a 4-hour week. Small steps still count. Getting back on track isn’t catching up.' : 'Extra shifts, low energy, life happened? Shrink the week to 4 hours and keep going.') + '</p>' +
      '<button class="pill solid block" id="rescue">' + (rescueOn ? 'Back to my 20-hour week' : 'Turn on Rescue Mode') + '</button>' +
      (rescueOn ? S.backOnTrack.map(function (d, di) { return '<div style="margin-top:14px"><span class="label">' + d.day + '</span>' + d.steps.map(function (s, si) { var k = di + '-' + si, on = !!r[k]; return '<button class="row" data-r="' + k + '" aria-pressed="' + on + '" style="border-color:#C8C68A"><span class="check' + (on ? ' on' : '') + '">' + (on ? tick() : '') + '</span><span class="' + (on ? 'done-text' : '') + '" style="font-size:15px">' + s + '</span></button>'; }).join('') + '</div>'; }).join('') : '') + '</div>' +
      cycleSection() +
      '<div class="section"><span class="label">Sunday check-in' + (isSun ? ' · today' : '') + '</span>' +
      [['finished', 'What did I finish that moved a goal forward?'], ['next', 'What’s the one thing that matters most next week?'], ['simplify', 'What can I remove, delay or make simpler?']].map(function (q) {
        return '<label class="field" style="margin-top:10px;color:var(--ink);font-size:15px">' + q[1] + '<textarea class="edit" data-ck="' + q[0] + '" rows="2">' + esc(ck[q[0]] || '') + '</textarea></label>';
      }).join('') + '</div>' +
      '<div class="section"><span class="label">My mantras</span><p class="muted" style="font-size:13px;margin:4px 0 6px">Today\u2019s card picks one each day. Add your own, one per line, and they join the mix.</p><textarea class="edit" id="mantras" rows="3" placeholder="I am building something beautiful.">' + esc((state.mantras || []).join('\n')) + '</textarea></div>' +
      '<div class="section"><span class="label">Low energy? Pick one</span>' + S.refuel.map(function (x) { return '<div style="padding:12px 0;border-bottom:1px solid var(--rule);font-size:15px">' + x + '</div>'; }).join('') + '</div>' +
      '<div class="section"><span class="label">Rewards</span>' + S.rewards.map(function (x) { return '<div style="padding:12px 0;border-bottom:1px solid var(--rule)"><div style="font-size:15px">' + x.when + '</div><div class="italic" style="font-size:18px">' + x.what + '</div></div>'; }).join('') + '</div>' +
      '<div class="section note"><span class="label">New season</span><p style="margin:6px 0 0">' + (newSeason > 0 ? 'Your next 60-day map arrives ' + short(S.end) + ', ' + newSeason + ' days from now. You’ll answer the nine questions again and get a fresh garden.' : 'It’s time for a new season. Answer the nine questions and send them to Dad.') + '</p></div>' +
      '<div class="section"><span class="label">Account and backup</span><div id="acct" style="margin:8px 0 12px;font-size:14px" class="muted"></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="pill small" id="exp">Save a backup</button><label class="pill small" style="cursor:pointer">Restore<input type="file" id="imp" accept="application/json" style="display:none"></label></div></div>' +
      '</div>';
    bindCycle();
    document.getElementById('mantras').addEventListener('change', function (e) { state.mantras = e.target.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); save(); toast('Mantras saved'); });
    document.getElementById('rescue').addEventListener('click', function () {
      if (rescueOn) { state.settings.tier = state.settings.prevTier || 20; } else { state.settings.prevTier = state.settings.tier; state.settings.tier = 4; state.rescue = {}; }
      save(); vMe(); toast(rescueOn ? 'Welcome back.' : 'Rescue Mode on. 4 hours this week.');
    });
    app.querySelectorAll('[data-r]').forEach(function (b) { b.addEventListener('click', function () { var k = b.getAttribute('data-r'); state.rescue[k] = !state.rescue[k]; save(); vMe(); }); });
    app.querySelectorAll('[data-ck]').forEach(function (a) { a.addEventListener('change', function () { state.checkins[mon] = state.checkins[mon] || {}; state.checkins[mon][a.getAttribute('data-ck')] = a.value; save(); }); });
    document.getElementById('exp').addEventListener('click', exportData);
    document.getElementById('imp').addEventListener('change', importData);
    if (window.LuluSync) window.LuluSync.renderAccount(document.getElementById('acct'));
    else document.getElementById('acct').textContent = 'Saved on this device.';
  }
  function cycleSection() {
    var c = state.private.cycle, t = todayStr();
    var h = '<div class="section" style="background:var(--peony);border-radius:24px;padding:18px"><span class="label">Cycle</span>';
    if (!c.on) return h + '<p style="margin:6px 0 12px;font-size:15px;line-height:1.5">Plan around your energy. Flourish can show your cycle day and phase on Today and in your month.</p><button class="pill solid block" id="cycOn">Track a cycle</button></div>';
    var info = cycleInfo(t);
    h += '<p style="margin:6px 0 4px" class="serif"><span style="font-size:24px">' + (info ? 'Cycle day ' + info.cd + ' · ' + info.phase : 'Log your last period to start') + '</span></p>' +
      (info ? '<p style="margin:0 0 10px;font-size:14px">' + info.note.charAt(0).toUpperCase() + info.note.slice(1) + '. Average cycle: ' + cycleLen() + ' days.</p>' : '') +
      '<form id="cycLog" style="display:flex;gap:8px;align-items:flex-end"><label class="field" style="flex:1">My period started<input type="date" id="cycD" value="' + t + '" max="' + t + '"></label><button class="pill solid" type="submit">Log</button></form>' +
      '<div style="margin-top:8px">' + c.starts.slice().sort().reverse().slice(0, 4).map(function (d) { return '<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #E0C3C9"><span style="font-size:14px;padding:8px 0">Started ' + nice(d) + '</span><button class="x" aria-label="Remove ' + nice(d) + '" data-cycdel="' + d + '">\u00D7</button></div>'; }).join('') + '</div>' +
      '<label class="field" style="margin-top:10px">Period length (days)<input type="number" id="cycP" min="2" max="10" value="' + (c.periodLen || 5) + '"></label>' +
      '<p class="muted" style="font-size:12px;line-height:1.5;margin:10px 0 0">Locked with your password before it syncs, so only you can read it. Estimates only: not for birth control or medical decisions.</p>' +
      '<button class="pill small" id="cycOff" style="margin-top:10px">Stop tracking</button></div>';
    return h;
  }
  function bindCycle() {
    var c = state.private.cycle;
    var on = document.getElementById('cycOn'); if (on) on.addEventListener('click', function () { c.on = true; save(); vMe(); });
    var off = document.getElementById('cycOff'); if (off) off.addEventListener('click', function () { c.on = false; save(); vMe(); toast('Cycle tracking off. Your log is kept.'); });
    var f = document.getElementById('cycLog'); if (f) f.addEventListener('submit', function (e) { e.preventDefault(); var d = document.getElementById('cycD').value; if (!d) return; if (c.starts.indexOf(d) < 0) c.starts.push(d); save(); vMe(); toast('Logged'); });
    var p = document.getElementById('cycP'); if (p) p.addEventListener('change', function (e) { c.periodLen = Math.max(2, Math.min(10, +e.target.value || 5)); save(); });
    app.querySelectorAll('[data-cycdel]').forEach(function (b) { b.addEventListener('click', function () { var d = b.getAttribute('data-cycdel'); c.starts = c.starts.filter(function (x) { return x !== d; }); save(); vMe(); }); });
  }
  function exportData() {
    var blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' });
    var name = 'flourish-backup-' + todayStr() + '.json';
    var file;
    try { file = new File([blob], name, { type: 'application/json' }); } catch (e) {}
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: 'Flourish backup' }).catch(function () {}); return; }
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
  function importData(e) {
    var f = e.target.files[0]; if (!f) return;
    var rd = new FileReader();
    rd.onload = function () { try { var s = JSON.parse(rd.result); if (!s.tasks || !s.patterns) throw 0; state = migrate(s); save(); toast('Backup restored'); render(); } catch (x) { toast('That file isn’t a Lulu backup'); } };
    rd.readAsText(f);
  }

  // ---------- ui helpers ----------
  function bind(sel, fn) { var el = app.querySelector(sel); if (el) el.addEventListener('click', fn); }
  function sheet(html, init) {
    overlay.innerHTML = '<div class="scrim" id="scrim"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>' + html + '</div></div>';
    var scrim = document.getElementById('scrim'), root = scrim.querySelector('.sheet');
    function close() { overlay.innerHTML = ''; }
    scrim.addEventListener('click', function (e) { if (e.target === scrim) close(); });
    if (init) init(root, close);
  }
  var tt;
  function toast(msg) {
    document.querySelectorAll('.toast').forEach(function (x) { x.remove(); });
    var el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = msg;
    document.body.appendChild(el); clearTimeout(tt); tt = setTimeout(function () { el.remove(); }, 2600);
  }

  if (CFG.sample) { var pv = document.createElement('div'); pv.textContent = 'Preview · sample data'; pv.setAttribute('style', 'position:fixed;top:calc(env(safe-area-inset-top,0px) + 8px);left:50%;transform:translateX(-50%);z-index:90;background:#111;color:#fff;font-size:11px;letter-spacing:1px;padding:5px 12px;border-radius:99px;pointer-events:none'); document.body.appendChild(pv); }
  render();
  if (!CFG.sample && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
})();
