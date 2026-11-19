// Leonida Trophy Guide — offline tracker for the 55 GTA VI trophies.
// Progress lives in localStorage; the trophy data is data/trophies.json.
// The app fetches nothing else and makes no network request at run time.

const STORE_KEY = 'leonida-trophy-guide-v1';
const DATA_URL = 'data/trophies.json';

// Trophies pre-ticked when the page opens with ?demo=1 (screenshots only).
const DEMO_EARNED = [2, 3, 4, 5, 8, 10, 15, 16, 19, 21, 33, 42, 53, 55];

// The roadmap to the platinum, in order, built from the official descriptions:
// which story chapters and missions, which collectibles and counts.
const ROADMAP = [
  {
    title: 'Story run',
    text: 'Chapters 1 to 4, the named missions, and the finale. Just play the story; these pop as you go. One warning: meditate on Lucia\u2019s balcony in Chapter 1 before the chapter ends (see Positive Mental Attitude).',
    ids: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  },
  {
    title: 'Strangers & side stories',
    text: 'The people of Leonida: Andy, Kenton, Billy, Randy, Tyrone, Bret, and the eight stranger strands. One strand race in Chapter 3 is time-sensitive — do it the moment it appears.',
    ids: [22, 23, 24, 25, 26, 27, 29],
  },
  {
    title: 'Activities sampler',
    text: 'Try everything once and win the races. Nine activity types, drone races at 14 spots, 20 different race wins, a fishing duel with Cal, one arcade game, 50 challenges.',
    ids: [16, 18, 19, 20, 21, 32],
  },
  {
    title: 'Combat, heists & chaos',
    text: 'Wanted levels, robberies and Combat Focus. Four-star escapes with your partner, three shops in a row, five vaults, one truck, one operation per gang — and a stolen jet at VCIA.',
    ids: [33, 34, 36, 37, 38, 39, 40, 41, 43],
  },
  {
    title: 'Collecting & exploring',
    text: 'The long grind. Gold in all 42 shooting-range challenges, 18 meditation spots, three card sets, 100 WAiNK spots, 100 vehicles, all 52 areas of Leonida, eight garages, ten Scooter Bros registrations.',
    ids: [17, 28, 30, 31, 35, 42, 54, 55],
  },
  {
    title: 'Money & the platinum',
    text: 'The cleanup. 250 stunts, $250,000 laundered, $100,000 spent, the gym partnership, 500 choices — plus the five trophies whose triggers were still unconfirmed at launch, marked honestly. Then the 100% checklist and the platinum.',
    ids: [15, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 14, 1],
  },
];

const KIND_LABELS = {
  all: 'All',
  story: 'Story',
  missable: 'Missable',
  collectibles: 'Collectibles',
  activities: 'Activities',
  completion: 'Completion',
};

const params = new URLSearchParams(location.search);

function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null');
    if (raw && Array.isArray(raw.earned)) return raw;
  } catch {
    // A corrupt save is dropped, never shown.
  }
  return { earned: [], spoiler: false };
}

let state = loadState();
if (params.get('demo') === '1' && state.earned.length === 0) {
  state.earned = [...DEMO_EARNED];
}
if (params.get('spoilers') === 'on') state.spoiler = true;

let earned = new Set(state.earned.filter((id) => Number.isInteger(id)));
let spoiler = state.spoiler === true;
let kindFilter = 'all';
let gradeFilter = 'all';
let searchText = '';
let earnedOnly = false;

const doc = await (await fetch(DATA_URL)).json();
const trophies = doc.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));

const listEl = document.getElementById('trophy-list');
const stagesEl = document.getElementById('stages');
const emptyNote = document.getElementById('empty-note');

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify({ earned: [...earned], spoiler }));
}

function isSpoilerHidden(t) {
  return spoiler && t.kinds.includes('story') && !earned.has(t.id);
}

function difficultyLabel(t) {
  return '★'.repeat(t.difficulty) + '☆'.repeat(5 - t.difficulty);
}

function trophyCard(t) {
  const card = document.createElement('article');
  card.className = 'trophy' + (earned.has(t.id) ? ' earned' : '');
  card.id = 'trophy-' + t.id;

  const head = document.createElement('div');
  head.className = 'trophy-head';

  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned.has(t.id);
  box.setAttribute('aria-label', 'Mark ' + t.name + ' earned');
  box.addEventListener('change', () => {
    if (box.checked) earned.add(t.id);
    else earned.delete(t.id);
    save();
    render();
  });
  head.append(box);

  const main = document.createElement('div');
  main.className = 'trophy-main';

  const hidden = isSpoilerHidden(t);
  const nameEl = document.createElement('p');
  nameEl.className = 'trophy-name';
  nameEl.textContent = hidden ? 'Hidden story trophy' : t.name;
  main.append(nameEl);

  const descEl = document.createElement('p');
  if (hidden) {
    descEl.className = 'trophy-spoiler';
    descEl.textContent = 'Spoiler-safe mode hides this story trophy until you earn it.';
  } else {
    descEl.className = 'trophy-desc';
    descEl.textContent = t.description;
  }
  main.append(descEl);

  const badges = document.createElement('div');
  badges.className = 'badges';
  const gradeBadge = document.createElement('span');
  gradeBadge.className = 'badge ' + t.grade;
  gradeBadge.textContent = t.grade;
  badges.append(gradeBadge);
  if (t.hidden) {
    const b = document.createElement('span');
    b.className = 'badge hidden';
    b.textContent = 'hidden';
    badges.append(b);
  }
  if (t.missable) {
    const b = document.createElement('span');
    b.className = 'badge missable';
    b.textContent = 'missable';
    badges.append(b);
  }
  if (t.unconfirmed) {
    const b = document.createElement('span');
    b.className = 'badge unconfirmed';
    b.textContent = 'unconfirmed';
    badges.append(b);
  }
  for (const kind of t.kinds) {
    const b = document.createElement('span');
    b.className = 'badge kind';
    b.textContent = kind;
    badges.append(b);
  }
  main.append(badges);

  const meta = document.createElement('p');
  meta.className = 'trophy-meta';
  meta.innerHTML = '';
  const diff = document.createElement('span');
  diff.innerHTML = 'Difficulty <b></b> · ';
  diff.querySelector('b').textContent = difficultyLabel(t) + ' (' + t.difficulty + '/5)';
  const time = document.createElement('span');
  time.innerHTML = 'Time <b></b>';
  time.querySelector('b').textContent = t.time;
  meta.append(diff, time);
  main.append(meta);

  const details = document.createElement('details');
  details.className = 'guide-box';
  const summary = document.createElement('summary');
  summary.className = 'guide-toggle';
  summary.textContent = 'Guide & sources';
  details.append(summary);
  const guide = document.createElement('div');
  guide.className = 'guide';
  if (t.unconfirmed) {
    const note = document.createElement('p');
    note.className = 'unconfirmed-note';
    note.textContent = 'No confirmed unlock method at launch — this guide does not guess. See the guide text below.';
    guide.append(note);
  }
  const guideText = document.createElement('p');
  guideText.textContent = t.guide;
  guide.append(guideText);
  const src = document.createElement('p');
  src.className = 'sources';
  src.textContent = 'Sources: ';
  t.sources.forEach((s, i) => {
    if (i > 0) src.append(document.createTextNode(' · '));
    const a = document.createElement('a');
    a.href = s.url;
    a.rel = 'noopener';
    a.textContent = s.label;
    src.append(a);
  });
  guide.append(src);
  details.append(guide);
  main.append(details);

  head.append(main);
  card.append(head);
  return { card, details };
}

function matchesFilters(t) {
  if (gradeFilter !== 'all' && t.grade !== gradeFilter) return false;
  if (kindFilter === 'missable') {
    if (!t.missable) return false;
  } else if (kindFilter !== 'all' && !t.kinds.includes(kindFilter)) {
    return false;
  }
  if (earnedOnly && !earned.has(t.id)) return false;
  if (searchText) {
    if (isSpoilerHidden(t)) return false;
    const hay = (t.name + ' ' + t.description).toLowerCase();
    if (!hay.includes(searchText)) return false;
  }
  return true;
}

function renderProgress() {
  const total = trophies.length;
  const count = earned.size;
  document.getElementById('earned-count').textContent = String(count);
  document.getElementById('progress-pct').textContent = Math.round((count / total) * 100) + '%';
  const bar = document.getElementById('progress-bar');
  bar.style.width = (count / total) * 100 + '%';
  document.getElementById('progress-bar-wrap').setAttribute('aria-valuenow', String(count));
  const grades = ['platinum', 'gold', 'silver', 'bronze'];
  const countsEl = document.getElementById('grade-counts');
  countsEl.replaceChildren();
  for (const grade of grades) {
    const ofGrade = trophies.filter((t) => t.grade === grade);
    const done = ofGrade.filter((t) => earned.has(t.id)).length;
    const li = document.createElement('li');
    li.innerHTML = '';
    const label = document.createElement('span');
    label.textContent = grade + ' ';
    const b = document.createElement('b');
    b.textContent = done + '/' + ofGrade.length;
    li.append(label, b);
    countsEl.append(li);
  }
  const left = total - count;
  document.getElementById('progress-note').textContent =
    count === total
      ? 'All 55 earned — Leonida Legend. The platinum is yours.'
      : count === 0
        ? 'Tick a trophy off and it stays ticked — your progress lives in this browser only.'
        : left + ' to go. The two missable trophies are flagged below — do them before their windows close.';
}

function renderRoadmap() {
  stagesEl.replaceChildren();
  ROADMAP.forEach((stage, i) => {
    const li = document.createElement('li');
    li.className = 'stage';
    const h3 = document.createElement('h3');
    const num = document.createElement('span');
    num.className = 'stage-num';
    num.textContent = String(i + 1);
    h3.append(num, document.createTextNode(stage.title));
    li.append(h3);
    const p = document.createElement('p');
    p.textContent = stage.text;
    li.append(p);
    const chips = document.createElement('div');
    chips.className = 'chips';
    for (const id of stage.ids) {
      const t = byId.get(id);
      if (!t) continue;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip' + (earned.has(id) ? ' earned' : '');
      chip.textContent = (earned.has(id) ? '✓ ' : '') + t.name;
      chip.addEventListener('click', () => openTrophy(id));
      chips.append(chip);
    }
    li.append(chips);
    stagesEl.append(li);
  });
}

function renderList() {
  listEl.replaceChildren();
  let shown = 0;
  let openDetails = null;
  const openId = params.get('open');
  for (const t of trophies) {
    if (!matchesFilters(t)) continue;
    shown += 1;
    const { card, details } = trophyCard(t);
    if (openId && Number(openId) === t.id) openDetails = { card, details };
    listEl.append(card);
  }
  document.getElementById('list-count').textContent = shown === trophies.length ? '' : '· showing ' + shown + ' of ' + trophies.length;
  emptyNote.hidden = shown !== 0;
  return openDetails;
}

function render() {
  renderProgress();
  renderRoadmap();
  return renderList();
}

function openTrophy(id) {
  const card = document.getElementById('trophy-' + id);
  if (!card) return;
  const details = card.querySelector('details');
  if (details) details.open = true;
  card.scrollIntoView({ block: 'center' });
}

function buildKindFilters() {
  const wrap = document.getElementById('kind-filters');
  wrap.replaceChildren();
  for (const [value, label] of Object.entries(KIND_LABELS)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.textContent = label;
    btn.setAttribute('aria-pressed', String(kindFilter === value));
    btn.addEventListener('click', () => {
      kindFilter = value;
      buildKindFilters();
      renderList();
    });
    wrap.append(btn);
  }
}

document.getElementById('search').addEventListener('input', (e) => {
  searchText = e.target.value.trim().toLowerCase();
  renderList();
});
document.getElementById('grade-filter').addEventListener('change', (e) => {
  gradeFilter = e.target.value;
  renderList();
});
const spoilerToggle = document.getElementById('spoiler-toggle');
spoilerToggle.checked = spoiler;
spoilerToggle.addEventListener('change', () => {
  spoiler = spoilerToggle.checked;
  save();
  render();
});
document.getElementById('earned-only-btn').addEventListener('click', (e) => {
  earnedOnly = !earnedOnly;
  e.currentTarget.setAttribute('aria-pressed', String(earnedOnly));
  renderList();
});
document.getElementById('export-btn').addEventListener('click', () => {
  const payload = { game: doc.game, platform: doc.platform, earned: [...earned].sort((a, b) => a - b) };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'leonida-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById('import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const ids = Array.isArray(data) ? data : data.earned;
    const valid = new Set(trophies.map((t) => t.id));
    earned = new Set(ids.filter((id) => valid.has(id)));
    save();
    render();
  } catch {
    alert('That file is not a progress export from this guide.');
  }
  e.target.value = '';
});
document.getElementById('reset-btn').addEventListener('click', () => {
  if (!confirm('Clear all earned trophies? This only clears this browser.')) return;
  earned = new Set();
  save();
  render();
});

buildKindFilters();
const opened = render();
if (params.get('view') === 'roadmap') {
  document.getElementById('roadmap').scrollIntoView();
} else if (opened) {
  opened.details.open = true;
  opened.card.scrollIntoView({ block: 'center' });
}
