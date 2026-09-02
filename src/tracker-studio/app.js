/**
 * Musomo Tracker — UI shell
 * Local SQLite via Tauri; live clients/projects/board/timer/reports.
 */

const MUSOMO_URLS = {
  website: 'https://tracker.musomo.net/',
  support: 'https://ko-fi.com/musomo'
};

const HELP_SECTIONS = [
  ['helpSectionWhatsNewTitle', 'helpSectionWhatsNewBody'],
  ['helpSectionOverviewTitle', 'helpSectionOverviewBody'],
  ['helpSectionClientsTitle', 'helpSectionClientsBody'],
  ['helpSectionProjectsTitle', 'helpSectionProjectsBody'],
  ['helpSectionBoardTitle', 'helpSectionBoardBody'],
  ['helpSectionTimerTitle', 'helpSectionTimerBody'],
  ['helpSectionSessionsTitle', 'helpSectionSessionsBody'],
  ['helpSectionReportsTitle', 'helpSectionReportsBody'],
  ['helpSectionSettingsTitle', 'helpSectionSettingsBody'],
  ['helpSectionMiniTimerTitle', 'helpSectionMiniTimerBody'],
  ['helpSectionBackupTitle', 'helpSectionBackupBody'],
  ['helpSectionLocalDataTitle', 'helpSectionLocalDataBody']
];

const NAV = [
  { id: 'overview', labelKey: 'navOverview', icon: 'overview.svg' },
  { id: 'clients', labelKey: 'navClients', icon: 'clients.svg' },
  { id: 'projects', labelKey: 'navProjects', icon: 'project.svg' },
  { id: 'board', labelKey: 'navBoard', icon: 'board.svg' },
  { id: 'timer', labelKey: 'navTimer', icon: 'time_tracker.svg' },
  { id: 'sessions', labelKey: 'navSessions', icon: 'session.svg' },
  { id: 'reports', labelKey: 'navReports', icon: 'report.svg' },
  { id: 'settings', labelKey: 'navSettings', icon: 'setting.svg' }
];

function tr(key, vars) {
  let s = window.MusomoI18n?.t?.(key) ?? key;
  if (vars && typeof vars === 'object') {
    for (const [k, v] of Object.entries(vars)) {
      s = String(s).split(`{${k}}`).join(String(v));
    }
  }
  return s;
}

function applyStaticI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (key) el.textContent = tr(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    if (key) el.placeholder = tr(key);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const key = el.dataset.i18nAria;
    if (key) el.setAttribute('aria-label', tr(key));
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.dataset.i18nTitle;
    if (key) el.title = tr(key);
  });
}

window.applyLang = function applyLang() {
  applyStaticI18n();
  applyVersionDisplay();
  renderHelpModalBody();
  renderFavorites();
  if (typeof setPage === 'function' && state?.page) setPage(state.page);
  else {
    renderNav();
    syncTimerUi?.();
  }
};

const MOCK = {
  clients: 3,
  projects: 4,
  timerSeconds: 1 * 3600 + 42 * 60 + 36,
  monthHours: '42h 35m',
  revenue: '€3,521.25',
  project: 'Acme Website Redesign',
  category: 'Web Design',
  client: 'Acme Corporation',
  rate: '€85.00/h',
  cost: '€145.56',
  deadlines: [
    { name: 'Greenfield Brand Identity', when: 'Sep 15', rel: 'in 23 days' },
    { name: 'Acme Website Redesign', when: 'Sep 30', rel: 'in 38 days' },
    { name: 'Horizon Product Launch', when: 'Oct 15', rel: 'in 53 days' },
    { name: 'Annual Report 2026', when: 'Nov 20', rel: 'in 89 days' }
  ],
  activity: [
    { text: 'Timer started — Acme Website Redesign', when: '2m ago', color: '#22c55e' },
    { text: 'Project updated — Horizon Product Launch', when: '1h ago', color: '#3b82f6' },
    { text: 'Report generated — Acme Corporation', when: 'Yesterday', color: '#8b5cf6' },
    { text: 'Task completed — Brand moodboard', when: 'Yesterday', color: '#f59e0b' }
  ],
  topProjects: [
    { name: 'Acme Website Redesign', hours: '52h / 96h', pct: 54 },
    { name: 'Greenfield Brand Identity', hours: '34h / 50h', pct: 68 },
    { name: 'Horizon Product Launch', hours: '28h / 72h', pct: 39 },
    { name: 'Annual Report 2026', hours: '18h / 40h', pct: 45 }
  ],
  week: [
    { d: 'Mon 13', h: 70, r: 45 },
    { d: 'Tue 14', h: 85, r: 60 },
    { d: 'Wed 15', h: 55, r: 40 },
    { d: 'Thu 16', h: 95, r: 75 },
    { d: 'Fri 17', h: 60, r: 50 },
    { d: 'Sat 18', h: 25, r: 15 },
    { d: 'Sun 19', h: 10, r: 8 }
  ]
};

const LOGO_COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#64748b'];

const CLIENTS_SEED = [
  {
    id: 'c1',
    company: 'Acme Corporation',
    contact: 'Jordan Lee',
    email: 'jordan.lee@example.com',
    phone: '+1 202-555-0148',
    website: 'https://example.com/acme',
    vat: 'DEMO-US-ACME-001',
    address: '100 Market Street',
    zip: '10001',
    city: 'Example City',
    notes: 'Demo client — digital products and corporate communications.',
    rate: 85,
    currency: 'EUR',
    status: 'active',
    tags: ['web', 'corporate'],
    favorite: true,
    archived: false,
    workspaceId: 'demo-acme',
    projects: [
      { name: 'Acme Website Redesign', status: 'In progress' },
      { name: 'Annual Report 2026', status: 'In progress' }
    ],
    updatedAt: '2026-08-20'
  },
  {
    id: 'c2',
    company: 'Greenfield Coffee',
    contact: 'Casey Morgan',
    email: 'casey.morgan@example.com',
    phone: '+1 202-555-0162',
    website: 'https://example.com/greenfield',
    vat: 'DEMO-US-GREEN-002',
    address: '24 Orchard Lane',
    zip: '10002',
    city: 'Example City',
    notes: 'Demo client — specialty coffee brand and retail packaging.',
    rate: 70,
    currency: 'EUR',
    status: 'active',
    tags: ['branding', 'packaging'],
    favorite: true,
    archived: false,
    workspaceId: 'demo-greenfield',
    projects: [{ name: 'Greenfield Brand Identity', status: 'Review' }],
    updatedAt: '2026-08-18'
  },
  {
    id: 'c3',
    company: 'Horizon Labs',
    contact: 'Taylor Nguyen',
    email: 'taylor.nguyen@example.com',
    phone: '+1 202-555-0186',
    website: 'https://example.com/horizon',
    vat: 'DEMO-US-HORIZON-003',
    address: '8 Innovation Drive',
    zip: '10003',
    city: 'Example City',
    notes: 'Demo client — product strategy and launch campaign.',
    rate: 95,
    currency: 'EUR',
    status: 'active',
    tags: ['technology', 'campaign'],
    favorite: false,
    archived: false,
    workspaceId: 'demo-horizon',
    projects: [{ name: 'Horizon Product Launch', status: 'In progress' }],
    updatedAt: '2026-08-16'
  }
];

const PROJECTS_SEED = [
  {
    id: 'p1',
    name: 'Acme Website Redesign',
    clientId: 'c1',
    client: 'Acme Corporation',
    category: 'Web Design',
    status: 'active',
    progress: 54,
    workedMin: 52 * 60,
    estimatedMin: 96 * 60,
    deadline: '2026-09-30',
    accent: '#22c55e'
  },
  {
    id: 'p2',
    name: 'Greenfield Brand Identity',
    clientId: 'c2',
    client: 'Greenfield Coffee',
    category: 'Branding',
    status: 'review',
    progress: 68,
    workedMin: 34 * 60,
    estimatedMin: 50 * 60,
    deadline: '2026-09-15',
    accent: '#8b5cf6'
  },
  {
    id: 'p3',
    name: 'Horizon Product Launch',
    clientId: 'c3',
    client: 'Horizon Labs',
    category: 'Campaign',
    status: 'active',
    progress: 39,
    workedMin: 28 * 60,
    estimatedMin: 72 * 60,
    deadline: '2026-10-15',
    accent: '#3b82f6'
  },
  {
    id: 'p4',
    name: 'Annual Report 2026',
    clientId: 'c1',
    client: 'Acme Corporation',
    category: 'Editorial Design',
    status: 'active',
    progress: 45,
    workedMin: 18 * 60,
    estimatedMin: 40 * 60,
    deadline: '2026-11-20',
    accent: '#f59e0b'
  }
];

const BOARD_COLUMNS = [
  { id: 'todo', labelKey: 'boardColTodo' },
  { id: 'in-progress', labelKey: 'boardColInProgress' },
  { id: 'waiting', labelKey: 'boardColWaiting' },
  { id: 'review', labelKey: 'boardColReview' },
  { id: 'completed', labelKey: 'boardColCompleted' }
];

const TASKS_SEED = [
  {
    id: 't1',
    title: 'Homepage wireframes',
    projectId: 'p1',
    project: 'Acme Website Redesign',
    client: 'Acme Corporation',
    column: 'in-progress',
    priority: 'high',
    workedMin: 120,
    estimatedMin: 300,
    deadline: '2026-08-28'
  },
  {
    id: 't3',
    title: 'Packaging color system',
    projectId: 'p2',
    project: 'Greenfield Brand Identity',
    client: 'Greenfield Coffee',
    column: 'review',
    priority: 'urgent',
    workedMin: 90,
    estimatedMin: 180,
    deadline: '2026-08-27'
  },
  {
    id: 't5',
    title: 'Launch campaign key visual',
    projectId: 'p3',
    project: 'Horizon Product Launch',
    client: 'Horizon Labs',
    column: 'in-progress',
    priority: 'high',
    workedMin: 200,
    estimatedMin: 420,
    deadline: '2026-09-04'
  },
  {
    id: 't7',
    title: 'Financial highlights spread',
    projectId: 'p4',
    project: 'Annual Report 2026',
    client: 'Acme Corporation',
    column: 'todo',
    priority: 'medium',
    workedMin: 0,
    estimatedMin: 240,
    deadline: '2026-09-18'
  }
];

const SESSIONS_SEED = [
  {
    id: 's1',
    projectId: 'p1',
    project: 'Acme Website Redesign',
    client: 'Acme Corporation',
    date: '2026-08-21',
    start: '09:12',
    end: '11:17',
    breakMin: 0,
    description: 'Homepage design system',
    durationMin: 7500,
    cost: 177.08,
    when: '09:12',
    period: 'today'
  },
  {
    id: 's3',
    projectId: 'p2',
    project: 'Greenfield Brand Identity',
    client: 'Greenfield Coffee',
    date: '2026-08-20',
    start: '14:20',
    end: '15:50',
    breakMin: 0,
    description: 'Packaging identity review',
    durationMin: 5400,
    cost: 105,
    when: 'Thu 14:20',
    period: 'week'
  },
  {
    id: 's5',
    projectId: 'p3',
    project: 'Horizon Product Launch',
    client: 'Horizon Labs',
    date: '2026-08-19',
    start: '16:40',
    end: '19:40',
    breakMin: 0,
    description: 'Launch campaign concept',
    durationMin: 10800,
    cost: 285,
    when: 'Wed 16:40',
    period: 'week'
  },
  {
    id: 's7',
    projectId: 'p1',
    project: 'Acme Website Redesign',
    client: 'Acme Corporation',
    date: '2026-08-07',
    start: '10:00',
    end: '15:20',
    breakMin: 0,
    description: 'User journey workshop',
    durationMin: 19200,
    cost: 453.33,
    when: 'Aug 7',
    period: 'month'
  }
];


const state = {
  page: 'overview',
  timerRunning: false,
  /** Frozen elapsed seconds while paused/stopped. While running, use liveTimerSeconds(). */
  timerSeconds: 0,
  /** Date.now() when the current run segment started (wall clock — survives background throttle). */
  timerRunStartedAt: null,
  tickId: null,
  pauseWatchId: null,
  ringRafId: null,
  timer: {
    projectId: 'p1',
    sessions: SESSIONS_SEED.map(s => ({ ...s })),
    /** Local calendar day for the open timer segment (YYYY-MM-DD). */
    day: '',
    /** Start clock HH:MM for the open session (cleared on Stop). */
    dayStart: '',
    /** Pause seconds accumulated in the open session. */
    pauseAccumSec: 0,
    /** Timestamp when current pause began. */
    pauseStartedAt: null,
    /** True while a Stop/commit is persisting — blocks duplicate saves. */
    committing: false,
    /** Guard against overlapping midnight rollovers. */
    midnightRolloverInFlight: false
  },
  clients: {
    items: CLIENTS_SEED.map(c => ({ ...c, projects: [...c.projects] })),
    query: '',
    statusFilter: 'all',
    sortBy: 'company-asc',
    selectedId: CLIENTS_SEED[0]?.id || null,
    editingId: null
  },
  projects: {
    items: PROJECTS_SEED.map(p => ({ ...p })),
    query: '',
    statusFilter: 'all',
    sortBy: 'name-asc',
    editingId: null,
    detailId: null
  },
  sessionEditor: {
    editingId: null,
    movingId: null
  },
  board: {
    items: TASKS_SEED.map(t => ({ ...t })),
    query: '',
    projectFilter: 'all',
    draggingId: null
  },
  reports: {
    dateFrom: '2026-08-01',
    dateTo: '2026-11-30',
    clientId: 'all',
    projectId: 'all'
  },
  sessionsView: {
    dateFrom: '',
    dateTo: '',
    clientId: 'all',
    projectId: 'all',
    query: ''
  },
  settings: {
    company: 'Northstar Creative Studio',
    logoInitials: 'NC',
    logoDataUrl: '',
    avatarDataUrl: '',
    displayName: 'Alex',
    defaultRate: 75,
    currency: 'EUR',
    reportFooter: 'Thank you for your business. Payment due within 30 days.',
    reportHeaderNote: '',
    uiTheme: 'dark',
    dateFormat: 'european'
  },
  inherited: {
    language: 'English',
    currency: 'EUR',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24-hour',
    theme: 'Light'
  }
};

function $(id) {
  return document.getElementById(id);
}

/** Prefer the active page — overview + timer both used renderTimerRing with the same ids. */
function timerUiRoot() {
  if (state.page === 'timer') return $('page-timer');
  if (state.page === 'overview') return $('page-overview');
  return document.querySelector('.page.is-active');
}

function $timer(id) {
  const root = timerUiRoot();
  if (root) {
    const el = root.querySelector('#' + id);
    if (el) return el;
  }
  return document.getElementById(id);
}


function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function clientInitials(company) {
  const parts = String(company || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function clientLogoColor(company) {
  let hash = 0;
  const s = String(company || '');
  for (let i = 0; i < s.length; i += 1) hash = (hash + s.charCodeAt(i) * (i + 1)) % LOGO_COLORS.length;
  return LOGO_COLORS[hash];
}


const CURRENCY_OPTIONS = [
  'EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY',
  'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON',
  'TRY', 'BRL', 'MXN', 'INR', 'CNY', 'KRW', 'SGD', 'HKD', 'NZD', 'ZAR', 'AED'
];

const CURRENCY_SYMBOLS = {
  EUR: '€', USD: '$', GBP: '£', CHF: 'CHF', CAD: 'CA$', AUD: 'A$',
  JPY: '¥', SEK: 'kr', NOK: 'kr', DKK: 'kr', PLN: 'zł', CZK: 'Kč',
  HUF: 'Ft', RON: 'lei', TRY: '₺', BRL: 'R$', MXN: 'MX$', INR: '₹',
  CNY: '¥', KRW: '₩', SGD: 'S$', HKD: 'HK$', NZD: 'NZ$', ZAR: 'R', AED: 'د.إ'
};

function normalizeCurrency(code) {
  const c = String(code || '').trim().toUpperCase();
  return CURRENCY_OPTIONS.includes(c) ? c : '';
}

const UI_THEME_KEY = 'musomo-ui-theme';

function normalizeUiTheme(value) {
  return String(value || '').trim().toLowerCase() === 'dark' ? 'dark' : 'light';
}

function applyUiTheme(theme) {
  const t = normalizeUiTheme(theme);
  document.documentElement.dataset.uiTheme = t;
  state.settings.uiTheme = t;
  try {
    localStorage.setItem(UI_THEME_KEY, t);
  } catch (_) {
    /* ignore */
  }
}

function normalizeDateFormat(value) {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'american' || v === 'mm/dd/yyyy' || v === 'mdy' || v === 'us') return 'american';
  return 'european';
}

function dateFormatDisplayLabel(fmt = state.settings.dateFormat) {
  return normalizeDateFormat(fmt) === 'american' ? 'MM/DD/YYYY' : 'DD/MM/YYYY';
}

function applyDateFormat(fmt) {
  const f = normalizeDateFormat(fmt);
  state.settings.dateFormat = f;
  state.inherited.dateFormat = dateFormatDisplayLabel(f);
}

function isoDateParts(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { y: value.getFullYear(), m: value.getMonth() + 1, d: value.getDate() };
  }
  const raw = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    return { y, m, d };
  }
  return null;
}

function formatDisplayDate(value) {
  const parts = isoDateParts(value);
  if (!parts) {
    const raw = String(value || '').trim();
    return raw || formatDisplayDate(new Date());
  }
  const dd = String(parts.d).padStart(2, '0');
  const mm = String(parts.m).padStart(2, '0');
  const yyyy = parts.y;
  if (normalizeDateFormat(state.settings.dateFormat) === 'american') {
    return `${mm}/${dd}/${yyyy}`;
  }
  return `${dd}/${mm}/${yyyy}`;
}

function formatArchiveDateTime(unixSec) {
  const sec = Number(unixSec);
  if (!Number.isFinite(sec) || sec <= 0) return '';
  const d = new Date(sec * 1000);
  if (Number.isNaN(d.getTime())) return '';
  const date = formatDisplayDate(d);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${date} ${hh}:${mm}`;
}

function formatArchiveOptionLabel(entry) {
  const label = String(entry?.label || entry?.name || '').trim();
  const when = formatArchiveDateTime(entry?.createdAt ?? entry?.created_at);
  return when ? `${label} · ${when}` : label;
}

function refreshAfterDateFormatChange() {
  refreshChrome();
  setPage(state.page);
}

function getStudioCurrency() {
  return normalizeCurrency(state.settings.currency) || 'EUR';
}

function currencySymbol(code) {
  const c = normalizeCurrency(code) || getStudioCurrency();
  return CURRENCY_SYMBOLS[c] || c;
}

function currencyForClient(client) {
  return normalizeCurrency(client?.currency) || getStudioCurrency();
}

function currencyForProjectId(projectId) {
  const project = state.projects.items.find(p => p.id === projectId);
  const client = state.clients.items.find(c => c.id === project?.clientId);
  return currencyForClient(client);
}

function currencyForSession(session) {
  if (session?.projectId) return currencyForProjectId(session.projectId);
  const client = state.clients.items.find(c => c.company === session?.client);
  return currencyForClient(client);
}

function currencySelectOptions(selected, { includeStudioDefault = false } = {}) {
  const studio = getStudioCurrency();
  const sel = selected == null ? '' : String(selected);
  const opts = [];
  if (includeStudioDefault) {
    opts.push(
      `<option value=""${!sel ? ' selected' : ''}>${tr('currencyStudioDefault', { code: studio })}</option>`
    );
  }
  for (const code of CURRENCY_OPTIONS) {
    const label = `${code} (${CURRENCY_SYMBOLS[code] || code})`;
    const isSel = includeStudioDefault ? sel === code : (sel || studio) === code;
    opts.push(`<option value="${code}"${isSel ? ' selected' : ''}>${label}</option>`);
  }
  return opts.join('');
}

function formatRate(rate, currencyCode) {
  if (rate == null || rate === '' || Number.isNaN(Number(rate))) return '—';
  if (!Number(rate) && Number(rate) !== 0) return '—';
  const sym = currencySymbol(currencyCode);
  return `${sym}${Number(rate).toFixed(0)}/h`;
}


function formatMinutes(totalMin) {
  const m = Math.max(0, Math.floor(totalMin || 0));
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (!h) return `${min}m`;
  if (!min) return `${h}h`;
  return `${h}h ${min}m`;
}

function formatDeadline(iso) {
  if (!iso) return '—';
  return formatDisplayDate(iso);
}

function projectStatusLabel(status) {
  const map = {
    active: 'statusActive',
    review: 'statusReview',
    'on-hold': 'statusOnHold',
    done: 'statusDone',
    'in-progress': 'statusInProgress'
  };
  const key = map[status];
  return key ? tr(key) : status;
}

const PROJECT_STATUS_OPTIONS = [
  ['active', 'statusActive'],
  ['review', 'statusReview'],
  ['on-hold', 'statusOnHold'],
  ['done', 'statusDone']
];

const PRIORITY_OPTIONS = [
  ['low', 'priorityLow'],
  ['medium', 'priorityMedium'],
  ['high', 'priorityHigh'],
  ['urgent', 'priorityUrgent']
];

function populateSelectOptions(select, entries, selectedValue) {
  if (!select) return;
  select.innerHTML = entries
    .map(([value, labelKey]) => {
      const selected = selectedValue === value ? ' selected' : '';
      return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(tr(labelKey))}</option>`;
    })
    .join('');
}

function priorityLabel(priority) {
  const map = {
    low: 'priorityLow',
    medium: 'priorityMedium',
    high: 'priorityHigh',
    urgent: 'priorityUrgent'
  };
  const key = map[priority];
  return key ? tr(key) : priority;
}

function askCompleteProjectChoice() {
  return new Promise(resolve => {
    const modal = $('completeProjectModal');
    if (!modal) {
      resolve('keep-tasks');
      return;
    }
    $('completeProjectModalTitle').textContent = tr('completeProjectTitle');
    $('completeProjectModalBody').textContent = tr('completeProjectBody');
    $('completeProjectCancel').textContent = tr('cancel');
    $('completeProjectKeep').textContent = tr('completeProjectKeepTasks');
    $('completeProjectMove').textContent = tr('completeProjectMoveTasks');
    modal.hidden = false;
    const finish = choice => {
      modal.hidden = true;
      $('completeProjectCancel').onclick = null;
      $('completeProjectKeep').onclick = null;
      $('completeProjectMove').onclick = null;
      resolve(choice);
    };
    $('completeProjectCancel').onclick = () => finish('cancel');
    $('completeProjectKeep').onclick = () => finish('keep-tasks');
    $('completeProjectMove').onclick = () => finish('move-tasks');
  });
}

async function moveProjectTasksToCompleted(projectId) {
  for (const task of state.board.items) {
    if (task.projectId !== projectId || task.column === 'completed') continue;
    task.column = 'completed';
    await persistTask(task);
  }
}

function syncProjectModalLabels() {
  const modal = $('projectModal');
  if (!modal) return;
  const setLabel = (forId, key) => {
    const el = modal.querySelector(`label[for="${forId}"]`);
    if (el) el.textContent = tr(key);
  };
  setLabel('pName', 'projectNameLabel');
  setLabel('pClient', 'client');
  setLabel('pCategory', 'categoryLabel');
  setLabel('pEstimated', 'estimatedHours');
  setLabel('pDeadline', 'deadline');
  setLabel('pStatus', 'status');
  const cancelBtn = $('projectModalCancel');
  if (cancelBtn) cancelBtn.textContent = tr('cancel');
  const hint = $('projectStatusHint');
  if (hint) hint.textContent = tr('projectStatusHint');
}

function syncTaskModalLabels() {
  const modal = $('taskModal');
  if (!modal) return;
  const title = $('taskModalTitle');
  const subtitle = modal.querySelector('.modal__head p');
  const saveBtn = $('taskModalSave');
  const cancelBtn = $('taskModalCancel');
  if (title) title.textContent = tr('newTaskTitle');
  if (subtitle) subtitle.textContent = tr('taskModalSubtitle');
  if (saveBtn) saveBtn.textContent = tr('addTask');
  if (cancelBtn) cancelBtn.textContent = tr('cancel');
  const setLabel = (forId, key) => {
    const el = modal.querySelector(`label[for="${forId}"]`);
    if (el) el.textContent = tr(key);
  };
  setLabel('tTitle', 'taskTitleLabel');
  setLabel('tProject', 'project');
  setLabel('tColumn', 'taskColumnLabel');
  setLabel('tPriority', 'taskPriorityLabel');
  setLabel('tEstimated', 'estimatedHours');
  setLabel('tDeadline', 'deadline');
}

function clientStatusLabel(status, archived) {
  if (archived) return tr('statusArchived');
  const map = {
    active: 'statusActive',
    lead: 'statusLead',
    paused: 'statusPaused',
    archived: 'statusArchived'
  };
  const key = map[status];
  return key ? tr(key) : status;
}

function isOverdue(deadline) {
  if (!deadline) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${deadline}T12:00:00`);
  return !Number.isNaN(d.getTime()) && d < today;
}

function daysUntilDeadline(deadline) {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${deadline}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((d - today) / 86400000);
}

function preferredActiveProjectId() {
  const active = state.projects.items.filter(p => p.status !== 'done');
  if (!active.length) return state.projects.items[0]?.id || '';
  for (const item of getFavoriteItems()) {
    if (item.type === 'project' && active.some(p => p.id === item.id)) return item.id;
  }
  return active[0].id;
}

/**
 * Board column Completed drives project status: all tasks completed → project done;
 * any open task → project leaves done (back to active).
 */
function syncProjectStatusFromBoard(projectId) {
  if (!projectId) return;
  const project = state.projects.items.find(p => p.id === projectId);
  if (!project) return;
  const tasks = state.board.items.filter(t => t.projectId === projectId);
  if (!tasks.length) return;
  const allDone = tasks.every(t => t.column === 'completed');
  let next = project.status;
  if (allDone && project.status !== 'done') next = 'done';
  else if (!allDone && project.status === 'done') next = 'active';
  if (next === project.status) return;
  project.status = next;
  void persistProject(project);
  if (next === 'done' && state.timer.projectId === projectId) {
    state.timer.projectId = preferredActiveProjectId();
  }
}

function reconcileProjectStatusesFromBoard() {
  const ids = new Set(state.board.items.map(t => t.projectId).filter(Boolean));
  ids.forEach(id => syncProjectStatusFromBoard(id));
}

/** Drop board tasks / sessions that no longer have a live project. */
function pruneOrphanedData() {
  const projectIds = new Set(state.projects.items.map(p => p.id));
  state.board.items = state.board.items.filter(t => projectIds.has(t.projectId));
  state.timer.sessions = state.timer.sessions.filter(s => {
    if (s.projectId) return projectIds.has(s.projectId);
    return state.projects.items.some(p => p.name === s.project);
  });
}

function removeProjectLocal(projectId) {
  state.projects.items = state.projects.items.filter(p => p.id !== projectId);
  state.board.items = state.board.items.filter(t => t.projectId !== projectId);
  state.timer.sessions = state.timer.sessions.filter(s => s.projectId !== projectId);
  if (state.projects.detailId === projectId) state.projects.detailId = null;
  if (state.reports.projectId === projectId) state.reports.projectId = 'all';
  if (state.board.projectFilter === projectId) state.board.projectFilter = 'all';
  if (state.timer.projectId === projectId) {
    state.timer.projectId = preferredActiveProjectId();
  }
}

function getFavoriteItems() {
  const items = [];
  const favClients = state.clients.items.filter(c => c.favorite && !c.archived);
  for (const c of favClients) {
    const projects = projectsForClient(c.id).filter(p => p.status !== 'done');
    if (projects.length) {
      for (const p of projects) {
        items.push({
          type: 'project',
          id: p.id,
          label: p.name,
          color: p.accent || clientLogoColor(c.company)
        });
      }
    } else {
      items.push({
        type: 'client',
        id: c.id,
        label: c.company,
        color: clientLogoColor(c.company)
      });
    }
  }
  return items.slice(0, 10);
}

function renderFavorites() {
  const root = $('favoritesList');
  if (!root) return;
  const items = getFavoriteItems();
  const body = items.length
    ? items
        .map(
          (it, i) =>
            `<button type="button" class="fav-item" data-fav-type="${escapeHtml(it.type)}" data-fav-id="${escapeHtml(it.id)}"><span class="fav-dot" style="background:${escapeHtml(it.color || LOGO_COLORS[i % LOGO_COLORS.length])}"></span>${escapeHtml(it.label)}</button>`
        )
        .join('')
    : `<p class="fav-empty" style="margin:0;padding:4px 10px;font-size:11px;color:var(--muted)">${tr('favoritesEmpty')}</p>`;
  root.innerHTML = `<div class="nav-label">${tr('favorites')}</div>${body}`;
  root.querySelectorAll('[data-fav-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.favType === 'project') {
        state.projects.detailId = btn.dataset.favId;
        setPage('project-detail');
      } else {
        state.clients.selectedId = btn.dataset.favId;
        setPage('clients');
      }
    });
  });
}

function getReleaseNotification() {
  const version = getAppVersion();
  const storageKey = 'musomo-tracker-seen-release';
  try {
    if (localStorage.getItem(storageKey) === version) return null;
  } catch (_) {
    return null;
  }
  return {
    kind: 'release',
    title: tr('releaseNoticeTitle'),
    name: tr('releaseNoticeName', { version }),
    when: tr('releaseNoticeSummary'),
    go: () => {
      try {
        localStorage.setItem(storageKey, version);
      } catch (_) {
        /* ignore */
      }
      renderNotifications();
      openHelpModal();
    }
  };
}

function getDeadlineNotifications() {
  const notes = [];
  const projectIds = new Set(state.projects.items.map(p => p.id));

  for (const p of state.projects.items) {
    if (!p.deadline || p.status === 'done') continue;
    const days = daysUntilDeadline(p.deadline);
    if (days === null) continue;
    if (days < 0) {
      notes.push({
        kind: 'overdue',
        title: tr('projectOverdue'),
        name: p.name,
        when: formatDeadline(p.deadline),
        go: () => {
          state.projects.detailId = p.id;
          setPage('project-detail');
        }
      });
    } else if (days <= 7) {
      notes.push({
        kind: 'soon',
        title: days === 0 ? tr('dueToday') : tr('deadlineApproaching'),
        name: p.name,
        when: formatDeadline(p.deadline),
        go: () => {
          state.projects.detailId = p.id;
          setPage('project-detail');
        }
      });
    }
  }

  for (const t of state.board.items) {
    if (!t.deadline || t.column === 'completed') continue;
    if (!projectIds.has(t.projectId)) continue;
    const days = daysUntilDeadline(t.deadline);
    if (days === null) continue;
    if (days < 0) {
      notes.push({
        kind: 'overdue',
        title: tr('taskOverdue'),
        name: t.title,
        when: formatDeadline(t.deadline),
        go: () => {
          state.board.projectFilter = t.projectId;
          setPage('board');
        }
      });
    } else if (days <= 7) {
      notes.push({
        kind: 'soon',
        title: days === 0 ? 'Task due today' : 'Task deadline approaching',
        name: t.title,
        when: formatDeadline(t.deadline),
        go: () => {
          state.board.projectFilter = t.projectId;
          setPage('board');
        }
      });
    }
  }

  notes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'overdue' ? -1 : 1;
    return String(a.when).localeCompare(String(b.when));
  });
  return notes.slice(0, 12);
}

function renderNotifications() {
  const list = $('notificationsList');
  const badge = $('notifBadge');
  const release = getReleaseNotification();
  const deadlines = getDeadlineNotifications();
  const notes = release ? [release, ...deadlines] : deadlines;
  if (badge) {
    if (notes.length) {
      badge.hidden = false;
      badge.textContent = String(notes.length);
    } else {
      badge.hidden = true;
      badge.textContent = '0';
    }
  }
  if (!list) return;
  list.innerHTML = notes.length
    ? notes
        .map(
          (n, i) =>
            `<button type="button" class="notifications-popover__item" data-notif-idx="${i}" style="width:100%;text-align:left;background:none;border:0;cursor:pointer;font:inherit;padding:10px 12px">${escapeHtml(n.title)}<strong>${escapeHtml(n.name)}</strong><span>${escapeHtml(n.when)}${n.kind === 'overdue' ? ` · ${tr('overdueLabel')}` : ''}</span></button>`
        )
        .join('')
    : `<div class="notifications-popover__item"><strong>${tr('notifAllClear')}</strong><span>${tr('notifNoDeadlines')}</span></div>`;
  list.querySelectorAll('[data-notif-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const n = notes[Number(btn.dataset.notifIdx)];
      const pop = $('notificationsPopover');
      if (pop) pop.hidden = true;
      n?.go?.();
    });
  });
}

function syncProfileChrome() {
  const av = $('profileAv');
  const name = $('profileName');
  if (name) name.textContent = state.settings.company || 'Studio';
  if (av) {
    av.replaceChildren();
    if (state.settings.avatarDataUrl && state.settings.avatarDataUrl.startsWith('data:image')) {
      const img = document.createElement('img');
      img.alt = '';
      img.src = state.settings.avatarDataUrl;
      av.appendChild(img);
    } else {
      av.textContent = state.settings.logoInitials || 'MD';
    }
  }
}

function refreshChrome() {
  pruneOrphanedData();
  renderFavorites();
  renderNotifications();
  syncProfileChrome();
}

function formatMoney(amount, currencyCode) {
  const code = normalizeCurrency(currencyCode) || getStudioCurrency();
  const n = Number(amount || 0);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: code === 'JPY' || code === 'KRW' ? 0 : 2,
      maximumFractionDigits: code === 'JPY' || code === 'KRW' ? 0 : 2
    }).format(n);
  } catch (_) {
    return `${currencySymbol(code)}${n.toFixed(2)}`;
  }
}


function fileExt(name) {
  const text = String(name || '');
  const idx = text.lastIndexOf('.');
  return idx >= 0 ? text.slice(idx + 1).toLowerCase() : '';
}

function looksLikeImageName(name) {
  return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(fileExt(name));
}

function formatDateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function reportBaseName() {
  return `tracker-report-${formatDateStamp()}`;
}

function todayIsoDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDaysToIsoDate(dateStr, days) {
  const raw = String(dateStr || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return todayIsoDate();
  const d = new Date(`${raw}T12:00:00`);
  d.setDate(d.getDate() + Number(days) || 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Wall clock now as HH:MM:SS (colon, for storage / <input type="time" step=1>). */
function clockNow() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function finalizeOpenPause() {
  if (!state.timer.pauseStartedAt) return;
  const secs = Math.max(0, Math.floor((Date.now() - state.timer.pauseStartedAt) / 1000));
  state.timer.pauseAccumSec += secs;
  state.timer.pauseStartedAt = null;
}

/** Parse HH:MM or HH:MM:SS (also accepts dots) → total seconds, or null. */
function parseClockToSeconds(value) {
  const text = String(value || '').trim().replace(/\./g, ':');
  let m = text.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (m) {
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    const ss = Number(m[3]);
    if (hh === 24) {
      if (mm !== 0 || ss !== 0) return null;
      return 24 * 3600;
    }
    if (hh > 23 || mm > 59 || ss > 59) return null;
    return hh * 3600 + mm * 60 + ss;
  }
  m = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh > 23 || mm > 59) return null;
  return hh * 3600 + mm * 60;
}

/** @deprecated use parseClockToSeconds; kept for sort helpers that only need minute order. */
function parseClockToMinutes(value) {
  const secs = parseClockToSeconds(value);
  return secs == null ? null : Math.floor(secs / 60);
}

/** Store format HH:MM:SS from total seconds. */
function formatClockValueSec(totalSec) {
  const rounded = Math.round(Number(totalSec) || 0);
  if (rounded === 24 * 3600) return '24:00:00';
  const day = 24 * 3600;
  let s = rounded % day;
  if (s < 0) s += day;
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/** Unified display: 00.00.00 */
function formatHmsDisplay(totalSec) {
  const day = 24 * 3600;
  let s = Math.max(0, Math.floor(Number(totalSec) || 0)) % day;
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(hh).padStart(2, '0')}.${String(mm).padStart(2, '0')}.${String(ss).padStart(2, '0')}`;
}

function formatBreakDisplay(breakSec) {
  const s = Math.max(0, Math.floor(Number(breakSec) || 0));
  return s < 1 ? '—' : formatHmsDisplay(s);
}

/** Normalize stored clock to HH:MM:SS. */
function normalizeClockString(value) {
  const secs = parseClockToSeconds(value);
  return secs == null ? '' : formatClockValueSec(secs);
}

/** Seconds from start→end; overnight-safe. */
function spanSeconds(start, end) {
  const a = parseClockToSeconds(start);
  const b = parseClockToSeconds(end);
  if (a == null || b == null) return null;
  let d = b - a;
  if (d < 0) d += 24 * 3600;
  return d;
}

/** Worked seconds = span − break (break in seconds). */
function durationFromClocks(start, end, breakSec) {
  const span = spanSeconds(start, end);
  if (span == null) return null;
  return Math.max(0, span - Math.max(0, Number(breakSec) || 0));
}

function endClockFromParts(start, durationSec, breakSec) {
  const a = parseClockToSeconds(start);
  if (a == null) return '';
  return formatClockValueSec(
    a + Math.max(0, Number(durationSec) || 0) + Math.max(0, Number(breakSec) || 0)
  );
}

function formatClockDisplay(value) {
  const text = String(value || '').trim();
  if (text === '24:00:00' || text === '24.00.00') return '24.00.00';
  const secs = parseClockToSeconds(value);
  if (secs == null) return '—';
  if (secs === 24 * 3600) return '24.00.00';
  return formatHmsDisplay(secs);
}

/** Session worked duration in seconds (durationMin field stores seconds after DB v5). */
function sessionDurationSec(session) {
  return Math.max(0, Math.floor(Number(session?.durationMin) || 0));
}

/**
 * Snapshot + clear the open timer before any await.
 * Pause stays pause; Stop claims once; Start after Stop is a new session.
 */
function claimOpenTimerWork() {
  if (state.timer.committing) return null;
  freezeLiveTimer();
  finalizeOpenPause();
  const secs = Math.max(0, Math.floor(state.timerSeconds || 0));
  if (secs < 1) {
    state.timerSeconds = 0;
    state.timerRunStartedAt = null;
    state.timer.pauseStartedAt = null;
    state.timer.pauseAccumSec = 0;
    state.timer.dayStart = '';
    return null;
  }
  state.timer.committing = true;
  const chunk = {
    secs,
    date: state.timer.day || todayIsoDate(),
    start: normalizeClockString(state.timer.dayStart) || clockNow(),
    breakSec: Math.max(0, Number(state.timer.pauseAccumSec) || 0)
  };
  // Clear immediately so a second Stop/mini event cannot re-save the same work.
  state.timerSeconds = 0;
  state.timerRunStartedAt = null;
  state.timer.pauseStartedAt = null;
  state.timer.pauseAccumSec = 0;
  state.timer.dayStart = '';
  return chunk;
}

/**
 * Persist one claimed timer chunk as a new session row.
 * Invariant: end = start + duration + break (duration = running time; break in seconds).
 */
async function commitClaimedTimerWork(chunk) {
  if (!chunk || chunk.secs < 1) {
    state.timer.committing = false;
    return null;
  }
  try {
    const { project, client, rate } = getTimerContext();
    const durationSec = Math.max(1, Math.floor(chunk.secs));
    const breakSec = Math.max(0, Number(chunk.breakSec) || 0);
    const start = normalizeClockString(chunk.start) || clockNow();
    const end = chunk.end
      ? normalizeClockString(chunk.end) || chunk.end
      : endClockFromParts(start, durationSec, breakSec) || clockNow();
    const cost = computeSessionCost(durationSec, rate);
    return await upsertSessionLocal(
      {
        id: `s${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        projectId: project?.id || '',
        project: project?.name || MOCK.project,
        client: client?.company || MOCK.client,
        date: chunk.date || todayIsoDate(),
        start,
        end,
        breakMin: breakSec,
        description: project?.name || 'Work session',
        durationMin: durationSec,
        rate,
        cost
      },
      { isNew: true }
    );
  } finally {
    state.timer.committing = false;
  }
}

/** Close the open timer run as exactly one new session (or no-op if empty/already committing). */
async function commitTimerSession() {
  const chunk = claimOpenTimerWork();
  if (!chunk) return null;
  return commitClaimedTimerWork(chunk);
}

function timerHasOpenSession() {
  return (
    !!state.timer.dayStart ||
    liveTimerSeconds() > 0 ||
    !!state.timer.pauseStartedAt ||
    !!state.timerRunning
  );
}

/** Wall span from dayStart to 24:00:00 on the same calendar day (seconds). */
function timerDayWallSpanSec(dayStart) {
  const startSec = parseClockToSeconds(dayStart);
  if (startSec == null) return 24 * 3600;
  return Math.max(0, 24 * 3600 - startSec);
}

/** Split open timer work at one midnight boundary (wall clock, sleep-safe). */
function computeTimerMidnightSplit(totalWorkedSec, dayStart, breakSec) {
  const worked = Math.max(0, Math.floor(Number(totalWorkedSec) || 0));
  const brk = Math.max(0, Number(breakSec) || 0);
  const start = normalizeClockString(dayStart) || '00:00:00';
  const span1 = timerDayWallSpanSec(start);
  const span2 = Math.max(0, worked + brk - span1);
  const [break1, break2] = splitOvernightBreakSec(brk, span1, Math.max(span2, 1));
  const dur1 = Math.min(worked, Math.max(0, span1 - break1));
  const dur2 = Math.max(0, worked - dur1);
  return { start, span1, break1, break2, dur1, dur2 };
}

function maybeRolloverTimerDay() {
  const today = todayIsoDate();
  if (!state.timer.day || state.timer.day === today || !timerHasOpenSession()) return;
  void rolloverTimerAtMidnight();
}

/** Ensure every missed midnight boundary is applied before Stop/commit. */
async function ensureTimerRolledThroughToday() {
  await rolloverTimerAtMidnight();
}

/** Midnight: close day-1 session at 24:00, open day-2 segment (running or paused). */
async function rolloverTimerAtMidnight() {
  if (state.timer.committing || state.timer.midnightRolloverInFlight) return;
  const today = todayIsoDate();
  if (!state.timer.day || state.timer.day === today || !timerHasOpenSession()) return;

  state.timer.midnightRolloverInFlight = true;
  try {
    let guard = 0;
    while (
      state.timer.day &&
      state.timer.day !== today &&
      timerHasOpenSession() &&
      guard < 366
    ) {
      guard += 1;
      await rolloverTimerOneDay();
    }
  } finally {
    state.timer.midnightRolloverInFlight = false;
  }
}

/** Apply a single calendar-day split at the next midnight boundary. */
async function rolloverTimerOneDay() {
  const oldDay = state.timer.day;
  const today = todayIsoDate();
  if (!oldDay || oldDay === today || !timerHasOpenSession()) return;

  const wasRunning = !!state.timerRunning;
  const resumePaused = !wasRunning && timerHasOpenSession();

  stopTick();
  stopPausedWatch();
  state.timerRunning = false;

  if (state.timer.pauseStartedAt) finalizeOpenPause();
  freezeLiveTimer();

  const totalWorked = Math.max(0, Math.floor(state.timerSeconds || 0));
  const breakSec = Math.max(0, Number(state.timer.pauseAccumSec) || 0);
  const { start, break1, dur1, dur2 } = computeTimerMidnightSplit(
    totalWorked,
    state.timer.dayStart,
    breakSec
  );

  if (dur1 >= 1) {
    state.timer.committing = true;
    try {
      await commitClaimedTimerWork({
        secs: dur1,
        date: oldDay,
        start,
        breakSec: break1,
        end: '24:00:00'
      });
    } finally {
      state.timer.committing = false;
    }
  }

  const nextDay = addDaysToIsoDate(oldDay, 1);
  state.timer.day = nextDay;
  state.timer.dayStart = dur2 >= 1 || wasRunning || resumePaused ? '00:00:00' : '';
  state.timerSeconds = dur2;
  state.timerRunStartedAt = null;
  state.timer.pauseAccumSec = 0;
  state.timer.pauseStartedAt = null;

  if (wasRunning || resumePaused) {
    if (wasRunning) {
      state.timerRunning = true;
      state.timerRunStartedAt = Date.now();
      syncTimerUi();
      startTick();
    } else {
      state.timerRunning = false;
      state.timer.pauseStartedAt = Date.now();
      syncTimerUi();
      startPausedWatch();
    }
    pushTimerStateToMini(true);
    refreshAfterSessionChange();
    return;
  }

  syncTimerUi();
  pushTimerStateToMini(true);
}

function splitOvernightBreakSec(breakSec, span1, span2) {
  const total = Math.max(0, Number(span1) || 0) + Math.max(0, Number(span2) || 0);
  const brk = Math.max(0, Number(breakSec) || 0);
  if (total < 1 || brk < 1) return [0, 0];
  const break1 = Math.min(brk, Math.round((brk * span1) / total));
  return [break1, Math.max(0, brk - break1)];
}

function manualEntrySpansOvernight(start, end) {
  const a = parseClockToSeconds(start);
  const b = parseClockToSeconds(end);
  return a != null && b != null && b < a;
}

function sessionPeriodFromDate(dateStr) {
  const raw = String(dateStr || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return 'month';
  const d = new Date(`${raw}T12:00:00`);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startWeek = new Date(startToday);
  startWeek.setDate(startWeek.getDate() - 6);
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  if (d >= startToday) return 'today';
  if (d >= startWeek) return 'week';
  if (d >= startMonth) return 'month';
  return 'month';
}

function sessionsForProject(projectId) {
  if (!projectId) return [];
  const project = state.projects.items.find(p => p.id === projectId);
  return state.timer.sessions.filter(
    s => s.projectId === projectId || (!s.projectId && project && s.project === project.name)
  );
}

function projectRate(project) {
  const client = state.clients.items.find(c => c.id === project?.clientId);
  return Number(client?.rate ?? state.settings.defaultRate) || 0;
}

function projectRevenue(projectId) {
  return sessionsForProject(projectId).reduce((sum, s) => sum + (Number(s.cost) || 0), 0);
}

function syncProjectStats(projectId) {
  const project = state.projects.items.find(p => p.id === projectId);
  if (!project) return;
  const sessions = sessionsForProject(projectId);
  // durationMin stores seconds → project.workedMin stays in minutes.
  const workedSec = sessions.reduce((sum, s) => sum + (Number(s.durationMin) || 0), 0);
  const workedMin = Math.round(workedSec / 60);
  project.workedMin = workedMin;
  project.progress =
    project.estimatedMin > 0
      ? Math.min(100, Math.round((workedMin / project.estimatedMin) * 100))
      : 0;
  void persistProject(project);
}

function sessionEffectiveRate(partial, client, durationSec) {
  if (partial.rate != null && partial.rate !== '' && Number.isFinite(Number(partial.rate))) {
    const explicit = Number(partial.rate);
    if (explicit > 0) return explicit;
  }
  const storedCost = Number(partial.cost);
  if (storedCost > 0 && durationSec > 0) {
    return storedCost / (durationSec / 3600);
  }
  return Number(client?.rate ?? state.settings.defaultRate) || 0;
}

function clientRateForProject(projectId) {
  const project = state.projects.items.find(p => p.id === projectId);
  const client = state.clients.items.find(c => c.id === project?.clientId);
  return Number(client?.rate ?? state.settings.defaultRate) || 0;
}

function normalizeSession(partial) {
  const project =
    state.projects.items.find(p => p.id === partial.projectId) ||
    state.projects.items.find(p => p.name === partial.project);
  const client =
    state.clients.items.find(c => c.id === project?.clientId) ||
    state.clients.items.find(c => c.company === partial.client);
  const date = partial.date || todayIsoDate();
  let start = normalizeClockString(partial.start);
  let end = normalizeClockString(partial.end);
  const breakSec = Math.max(0, Number(partial.breakMin) || 0);
  let durationSec = Math.max(0, Number(partial.durationMin) || 0);

  // Hard rule: with Start+End, worked seconds = End − Start − Break (overnight-safe).
  // durationMin / breakMin fields store seconds.
  const fromClocks = durationFromClocks(start, end, breakSec);
  if (fromClocks != null) {
    durationSec = fromClocks;
  } else if (start && durationSec > 0) {
    end = endClockFromParts(start, durationSec, breakSec);
  } else if (!durationSec) {
    durationSec = 1;
  }

  const rate = sessionEffectiveRate(partial, client, durationSec);
  const cost = computeSessionCost(durationSec, rate);
  return {
    id: partial.id || `s${Date.now()}`,
    projectId: project?.id || partial.projectId || '',
    project: project?.name || partial.project || '',
    client: client?.company || project?.client || partial.client || '',
    date,
    start,
    end,
    breakMin: breakSec,
    description: String(partial.description || '').trim(),
    durationMin: durationSec,
    rate,
    cost,
    when: start || partial.when || '',
    period: sessionPeriodFromDate(date)
  };
}

function sessionToApi(session) {
  return {
    id: session.id,
    projectId: session.projectId || '',
    project: session.project,
    client: session.client,
    date: session.date || '',
    start: session.start || '',
    end: session.end || '',
    breakMin: Number(session.breakMin) || 0,
    description: session.description || '',
    durationMin: Number(session.durationMin) || 0,
    cost: Number(session.cost) || 0,
    rate: Number(session.rate) || 0,
    when: session.when || '',
    period: session.period || 'today'
  };
}

async function persistSession(session) {
  try {
    await invoke('tracker_upsert_session', { session: sessionToApi(session) });
  } catch (err) {
    console.warn('persistSession', err);
  }
}

async function deleteSessionRecord(id) {
  try {
    await invoke('tracker_delete_session', { id });
  } catch (err) {
    console.warn('deleteSession', err);
  }
}

async function upsertSessionLocal(session, { isNew = false, previousProjectId = null } = {}) {
  const normalized = normalizeSession(session);
  if (isNew) {
    state.timer.sessions.unshift(normalized);
  } else {
    const idx = state.timer.sessions.findIndex(s => s.id === normalized.id);
    if (idx >= 0) state.timer.sessions[idx] = normalized;
    else state.timer.sessions.unshift(normalized);
  }
  await persistSession(normalized);
  if (normalized.projectId) syncProjectStats(normalized.projectId);
  if (previousProjectId && previousProjectId !== normalized.projectId) {
    syncProjectStats(previousProjectId);
  }
  return normalized;
}

async function removeSessionLocal(id) {
  const existing = state.timer.sessions.find(s => s.id === id);
  const projectId = existing?.projectId || '';
  state.timer.sessions = state.timer.sessions.filter(s => s.id !== id);
  await deleteSessionRecord(id);
  if (projectId) syncProjectStats(projectId);
}

function computeSessionCost(seconds, rate) {
  return (Math.max(0, seconds) / 3600) * (rate || 0);
}

function getTimerContext() {
  let project = state.projects.items.find(p => p.id === state.timer.projectId);
  if (!project || project.status === 'done') {
    const fallbackId = preferredActiveProjectId();
    if (fallbackId && fallbackId !== state.timer.projectId) state.timer.projectId = fallbackId;
    project = state.projects.items.find(p => p.id === state.timer.projectId) || state.projects.items.find(p => p.status !== 'done');
  }
  const client = project ? state.clients.items.find(c => c.id === project.clientId) : null;
  const rate = client?.rate ?? 35;
  return { project, client, rate };
}

function applyTimerContext() {
  const { project, client, rate } = getTimerContext();
  if (project) {
    MOCK.project = project.name;
    MOCK.category = project.category || 'General';
  }
  if (client) MOCK.client = client.company;
  const cur = currencyForClient(client);
  MOCK.rate = formatRate(rate, cur);
  MOCK.cost = formatMoney(computeSessionCost(liveTimerSeconds(), rate), cur);
}

function sumSessionMinutes(period) {
  return state.timer.sessions
    .filter(s => s.period === period)
    .reduce((sum, s) => sum + Math.round((Number(s.durationMin) || 0) / 60), 0);
}

function renderSessionBlock(period, label) {
  const sessions = state.timer.sessions.filter(s => s.period === period);
  const totalMin = sumSessionMinutes(period);
  const rows = sessions.length
    ? sessions
        .map(
          s => `<div class="session-row" data-session-id="${escapeHtml(s.id)}">
            <div>
              <strong>${escapeHtml(s.project)}</strong>
              <span>${escapeHtml(s.client)}${s.description ? ` · ${escapeHtml(s.description)}` : ''}</span>
            </div>
            <div class="session-row__right">
              ${escapeHtml(formatHmsDisplay(sessionDurationSec(s)))}<br>${escapeHtml(formatMoney(s.cost, currencyForSession(s)))}
              <div class="session-row__actions session-actions">
                <button type="button" class="btn" data-session-action="edit" data-session-id="${escapeHtml(s.id)}">${tr('edit')}</button>
                <button type="button" class="btn" data-session-action="move" data-session-id="${escapeHtml(s.id)}">${tr('move')}</button>
                <button type="button" class="btn" data-session-action="delete" data-session-id="${escapeHtml(s.id)}">${tr('delete')}</button>
              </div>
            </div>
          </div>`
        )
        .join('')
    : `<div class="session-row"><div><span>${tr('noSessionsYet')}</span></div></div>`;
  return `<div class="session-block">
    <div class="session-block__head">
      <h3>${escapeHtml(label)}</h3>
      <span>${tr('totalSuffix', { n: formatMinutes(totalMin) })}</span>
    </div>
    <div class="session-list">${rows}</div>
  </div>`;
}

function invoke(cmd, args = {}) {
  const core = window.__TAURI__?.core;
  if (!core?.invoke) return Promise.reject(new Error('Tauri not available'));
  return core.invoke(cmd, args);
}

function projectsForClient(clientId) {
  return state.projects.items.filter(p => p.clientId === clientId);
}

function clientToApi(client) {
  return {
    id: client.id,
    company: client.company,
    contact: client.contact || '',
    email: client.email || '',
    phone: client.phone || '',
    website: client.website || '',
    vat: client.vat || '',
    address: client.address || '',
    zip: client.zip || '',
    city: client.city || '',
    notes: client.notes || '',
    rate: Number(client.rate) || 0,
    currency: normalizeCurrency(client.currency) || '',
    status: client.status || 'active',
    tags: client.tags || [],
    favorite: !!client.favorite,
    archived: !!client.archived,
    workspaceId: client.workspaceId || null,
    updatedAt: client.updatedAt || new Date().toISOString().slice(0, 10)
  };
}

function applySnapshot(snap) {
  if (!snap) return;
  state.clients.items = (snap.clients || []).map(c => ({ ...c }));
  state.clients.selectedId = snap.clients?.length ? snap.clients[0].id : null;
  state.projects.items = snap.projects || [];
  state.board.items = snap.tasks || [];
  const repaired = [];
  state.timer.sessions = (snap.sessions || []).map(s => {
    const rawDur = Number(s.durationMin) || 0;
    const rawCost = Number(s.cost) || 0;
    const normalized = normalizeSession({
      id: s.id,
      projectId: s.projectId || '',
      project: s.project,
      client: s.client,
      date: s.date || '',
      start: s.start || '',
      end: s.end || '',
      breakMin: s.breakMin || 0,
      description: s.description || '',
      durationMin: rawDur,
      cost: s.cost,
      rate: s.rate,
      when: s.when || '',
      period: s.period || 'today'
    });
    // Persist rows where Hours exceeded Start→End (impossible) so DB matches UI.
    if (
      normalized.id &&
      (normalized.durationMin !== rawDur || Math.abs(normalized.cost - rawCost) > 0.009)
    ) {
      repaired.push(normalized);
    }
    return normalized;
  });
  if (repaired.length) {
    void Promise.all(repaired.map(s => persistSession(s)))
      .then(() => {
        const ids = [...new Set(repaired.map(s => s.projectId).filter(Boolean))];
        ids.forEach(id => syncProjectStats(id));
      })
      .catch(err => console.warn('repairSessions', err));
  }
  if (snap.settings) {
    state.settings.company = snap.settings.company;
    state.settings.logoInitials = snap.settings.logoInitials;
    state.settings.logoDataUrl = snap.settings.logoDataUrl || '';
    state.settings.avatarDataUrl = snap.settings.avatarDataUrl || '';
    state.settings.displayName = snap.settings.displayName || state.settings.displayName || tr('greetingNameFallback');
    state.settings.defaultRate = snap.settings.defaultRate;
    if (snap.settings.currency) state.settings.currency = normalizeCurrency(snap.settings.currency) || state.settings.currency;
    state.settings.reportFooter = snap.settings.reportFooter;
    state.settings.reportHeaderNote = snap.settings.reportHeaderNote || '';
    if (snap.settings.uiTheme != null) {
      applyUiTheme(snap.settings.uiTheme);
    }
    if (snap.settings.dateFormat != null) {
      applyDateFormat(snap.settings.dateFormat);
    }
  }
  if (snap.inherited) {
    state.inherited = { ...snap.inherited };
    state.inherited.dateFormat = dateFormatDisplayLabel(state.settings.dateFormat);
  }
  pruneOrphanedData();
  reconcileProjectStatusesFromBoard();
  state.timer.projectId = preferredActiveProjectId();
}

async function bootstrapTracker() {
  try {
    const snap = await invoke('tracker_init');
    applySnapshot(snap);
  } catch (err) {
    console.warn('Tracker DB not loaded — using in-memory mock.', err);
  }
}

function applyRuntimeTimerState(runtime) {
  if (!runtime || typeof runtime !== 'object') return;
  if (runtime.projectId) state.timer.projectId = runtime.projectId;
  state.timer.day = runtime.day || todayIsoDate();
  state.timer.dayStart = runtime.dayStart || '';
  state.timer.pauseAccumSec = Math.max(0, Number(runtime.pauseAccumSec) || 0);
  state.timer.pauseStartedAt = runtime.pauseStartedAt
    ? Number(runtime.pauseStartedAt)
    : null;
  const base = Math.max(0, Number(runtime.baseSeconds ?? runtime.seconds) || 0);
  state.timerSeconds = base;
  state.timerRunning = !!runtime.running;
  state.timerRunStartedAt =
    runtime.running && runtime.runStartedAt ? Number(runtime.runStartedAt) : null;
}

/** Restore in-progress timer / pending mini Stop after Studio was closed. */
async function restoreTimerRuntime() {
  try {
    const runtime = await invoke('tracker_get_timer_state');
    if (!runtime) return;

    if (runtime.pendingCommit && Number(runtime.pendingCommit.secs) > 0) {
      const pc = runtime.pendingCommit;
      if (pc.projectId) state.timer.projectId = pc.projectId;
      await commitClaimedTimerWork({
        secs: pc.secs,
        date: pc.date || todayIsoDate(),
        start: pc.start || clockNow(),
        breakSec: pc.breakSec || 0
      });
      await invoke('tracker_clear_timer_pending_commit');
      refreshAfterSessionChange();
      return;
    }

    const hasOpen =
      Boolean(runtime.dayStart) ||
      Math.max(0, Number(runtime.baseSeconds ?? runtime.seconds) || 0) > 0;
    if (!hasOpen) return;

    applyRuntimeTimerState(runtime);
    syncTimerUi();
    if (state.timerRunning) startTick();
  } catch (err) {
    console.warn('restoreTimerRuntime', err);
  }
}

async function refreshFromDatabase() {
  const page = state.page;
  const detailId = state.projects.detailId;
  await bootstrapTracker();
  if (page === 'project-detail' && !state.projects.items.some(p => p.id === detailId)) {
    state.projects.detailId = null;
  }
  refreshChrome();
  setPage(state.projects.detailId ? page : page === 'project-detail' ? 'projects' : page);
}

async function cleanDatabase({ reseed = false } = {}) {
  const snap = await invoke('tracker_reset_database', { reseed: !!reseed });
  applySnapshot(snap);
  state.timerSeconds = 0;
  state.timerRunStartedAt = null;
  state.timerRunning = false;
  state.clients.selectedId = state.clients.items[0]?.id || null;
  state.projects.detailId = null;
  state.reports.clientId = 'all';
  state.reports.projectId = 'all';
  state.board.projectFilter = 'all';
  stopTick();
  refreshChrome();
  setPage('overview');
}

async function restoreArchive(name) {
  const snap = await invoke('tracker_restore_archive', { name });
  applySnapshot(snap);
  state.timerSeconds = 0;
  state.timerRunStartedAt = null;
  state.timerRunning = false;
  state.projects.detailId = null;
  stopTick();
  refreshChrome();
  setPage('overview');
}

async function persistClient(client) {
  try {
    await invoke('tracker_upsert_client', { client: clientToApi(client) });
  } catch (err) {
    console.warn('persistClient', err);
  }
}

async function persistProject(project) {
  try {
    await invoke('tracker_upsert_project', { project });
  } catch (err) {
    console.warn('persistProject', err);
  }
}

async function persistTask(task) {
  try {
    await invoke('tracker_upsert_task', { task });
  } catch (err) {
    console.warn('persistTask', err);
  }
}

async function persistSettings() {
  try {
    const saved = await invoke('tracker_save_settings', {
      settings: {
        company: state.settings.company,
        logoInitials: state.settings.logoInitials,
        logoDataUrl: '',
        avatarDataUrl: '',
        displayName: state.settings.displayName || 'there',
        defaultRate: state.settings.defaultRate,
        currency: getStudioCurrency(),
        reportFooter: state.settings.reportFooter,
        reportHeaderNote: state.settings.reportHeaderNote || '',
        uiTheme: normalizeUiTheme(state.settings.uiTheme),
        dateFormat: normalizeDateFormat(state.settings.dateFormat)
      }
    });
    // Keep in-memory logos (files are source of truth; DB no longer stores blobs).
    if (saved) {
      state.settings.company = saved.company ?? state.settings.company;
      state.settings.logoInitials = saved.logoInitials ?? state.settings.logoInitials;
      state.settings.displayName = saved.displayName ?? state.settings.displayName;
      state.settings.defaultRate = saved.defaultRate ?? state.settings.defaultRate;
      if (saved.currency) state.settings.currency = normalizeCurrency(saved.currency) || state.settings.currency;
      state.settings.reportFooter = saved.reportFooter ?? state.settings.reportFooter;
      state.settings.reportHeaderNote = saved.reportHeaderNote ?? state.settings.reportHeaderNote;
      if (saved.uiTheme != null) applyUiTheme(saved.uiTheme);
      if (saved.dateFormat != null) applyDateFormat(saved.dateFormat);
      state.inherited.currency = getStudioCurrency();
      if (saved.logoDataUrl) state.settings.logoDataUrl = saved.logoDataUrl;
      if (saved.avatarDataUrl) state.settings.avatarDataUrl = saved.avatarDataUrl;
    }
    return true;
  } catch (err) {
    console.warn('persistSettings', err);
    alert(`Could not save settings: ${String(err?.message || err)}`);
    return false;
  }
}

async function saveBrandImage(kind, dataUrl) {
  // Pass both casings — Tauri command arg is `data_url`.
  const saved = await invoke('tracker_save_brand_image', {
    kind,
    dataUrl,
    data_url: dataUrl
  });
  applyBrandSettings(saved);
  syncProfileChrome();
  return saved;
}

async function importBrandFile(kind, path) {
  const saved = await invoke('tracker_import_brand_file', { kind, path });
  applyBrandSettings(saved);
  syncProfileChrome();
  return saved;
}

function applyBrandSettings(saved) {
  if (!saved) return;
  if (saved.logoDataUrl != null) state.settings.logoDataUrl = saved.logoDataUrl;
  if (saved.avatarDataUrl != null) state.settings.avatarDataUrl = saved.avatarDataUrl;
  if (saved.logoInitials) state.settings.logoInitials = saved.logoInitials;
  if (saved.company) state.settings.company = saved.company;
}

function imgSrcFromDataUrl(url) {
  const s = String(url || '');
  if (!s.startsWith('data:image')) return '';
  // Attribute-safe: strip quotes only (base64 / svg data URLs).
  return s.replace(/"/g, '');
}

function setBrandPreviewEl(el, dataUrl, initials) {
  if (!el) return;
  el.replaceChildren();
  const src = imgSrcFromDataUrl(dataUrl);
  if (src) {
    const img = document.createElement('img');
    img.alt = '';
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;border-radius:12px;display:block;background:#fff';
    img.onerror = () => {
      el.replaceChildren();
      const span = document.createElement('span');
      span.className = 'settings-logo-initials';
      span.textContent = initials || 'MD';
      el.appendChild(span);
    };
    img.src = src;
    el.appendChild(img);
    return;
  }
  const span = document.createElement('span');
  span.className = 'settings-logo-initials';
  span.textContent = initials || 'MD';
  el.appendChild(span);
}

function fileLooksLikeImage(file) {
  if (!file) return false;
  if (file.type && file.type.startsWith('image/')) return true;
  return looksLikeImageName(file.name);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read the selected image.'));
    reader.readAsDataURL(file);
  });
}

async function openBrandFileDialog() {
  const dialog = window.__TAURI__?.dialog;
  if (dialog?.open) {
    const selected = await dialog.open({
      multiple: false,
      title: 'Choose image',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'] }]
    });
    if (!selected) return null;
    return Array.isArray(selected) ? selected[0] : selected;
  }
  return null;
}

function pickBrandFileViaInput() {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,image/gif,.png,.jpg,.jpeg,.svg,.webp,.gif';
    input.addEventListener('change', () => resolve(input.files?.[0] || null));
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

/** Downscale before upload — report logo box is ~165×95px. */
async function prepareBrandDataUrl(file, kind) {
  const raw = await readFileAsDataUrl(file);
  if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) {
    if (raw.length > 400_000) throw new Error('SVG is too large — keep under ~200 KB.');
    return raw;
  }
  const maxEdge = kind === 'avatar' ? 256 : 400;
  try {
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
      let w = Math.max(1, Math.round(bitmap.width * scale));
      let h = Math.max(1, Math.round(bitmap.height * scale));
      if (kind === 'avatar') {
        w = maxEdge;
        h = maxEdge;
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return raw;
      if (kind === 'avatar') {
        const side = Math.min(bitmap.width, bitmap.height);
        const sx = (bitmap.width - side) / 2;
        const sy = (bitmap.height - side) / 2;
        ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, w, h);
      } else {
        ctx.drawImage(bitmap, 0, 0, w, h);
      }
      const preferPng = /png$/i.test(file.type) || /\.png$/i.test(file.name) || kind === 'logo';
      return preferPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.9);
    } finally {
      bitmap.close?.();
    }
  } catch {
    // createImageBitmap unavailable — send original data URL.
    return raw;
  }
}

function formatHms(total) {
  const s = Math.max(0, Math.floor(total));
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return tr('greetingMorning');
  if (h < 18) return tr('greetingAfternoon');
  return tr('greetingEvening');
}

function renderNav() {
  const nav = $('mainNav');
  if (!nav) return;
  const activeId = state.page === 'project-detail' ? 'projects' : state.page;
  nav.innerHTML = NAV.map(
    item => `<button type="button" class="nav-item${item.id === activeId ? ' is-active' : ''}" data-page="${item.id}">
      <span class="nav-item__icon" aria-hidden="true" style="--nav-icon: url('./asset/${item.icon}')"></span>
      <span>${tr(item.labelKey)}</span>
    </button>`
  ).join('');
  nav.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.page === 'projects') state.projects.detailId = null;
      setPage(btn.dataset.page);
    });
  });
}

function setPage(id) {
  state.page = id;
  document.querySelectorAll('.page').forEach(el => {
    el.classList.toggle('is-active', el.dataset.page === id);
  });
  renderNav();
  const greet = $('pageGreeting');
  const sub = $('pageSub');
  if (greet) {
    greet.classList.toggle('is-greeting', id === 'overview');
    greet.classList.toggle('is-project', id === 'project-detail');
  }
  if (id === 'overview') {
    if (greet) greet.textContent = `${greeting()}, ${state.settings.displayName || tr('greetingNameFallback')}!`;
    if (sub) sub.textContent = tr('overviewSub');
  } else if (id === 'project-detail') {
    const project = state.projects.items.find(p => p.id === state.projects.detailId);
    if (greet) greet.textContent = project?.name || tr('project');
    if (sub) {
      sub.textContent = project
        ? `${project.client} · ${tr('projectDetailSub')}`
        : tr('projectDetailSub');
    }
  } else {
    const item = NAV.find(n => n.id === id);
    if (greet) greet.textContent = item ? tr(item.labelKey) : tr('appName');
    if (sub) {
      if (id === 'clients') {
        sub.textContent = tr('clientsSub', {
          n: state.clients.items.filter(c => !c.archived).length
        });
      } else if (id === 'projects') {
        sub.textContent = tr('projectsSub', {
          n: state.projects.items.filter(p => p.status !== 'done').length
        });
      } else if (id === 'board') {
        const open = state.board.items.filter(t => t.column !== 'completed').length;
        sub.textContent = tr('boardSub', { n: open });
      } else if (id === 'timer') {
        const todayMin = sumSessionMinutes('today');
        sub.textContent = tr('timerSub', { n: formatMinutes(todayMin) });
      } else if (id === 'sessions') {
        sub.textContent = tr('sessionsSub');
      } else if (id === 'reports') {
        sub.textContent = tr('reportsSub');
      } else if (id === 'settings') {
        sub.textContent = tr('settingsSub');
      } else {
        sub.textContent = '';
      }
    }
  }
  // Drop inactive timer rings so duplicate ids / stale SVG never steal updates.
  if (id !== 'overview') {
    const ov = $('page-overview');
    if (ov) ov.innerHTML = '';
  }
  if (id !== 'timer') {
    const tp = $('page-timer');
    if (tp) tp.innerHTML = '';
  }
  if (id === 'overview') renderOverview();
  if (id === 'clients') renderClients();
  if (id === 'projects') renderProjects();
  if (id === 'project-detail') renderProjectDetail();
  if (id === 'board') renderBoard();
  if (id === 'timer') renderTimer();
  if (id === 'sessions') renderSessions();
  if (id === 'reports') renderReports();
  if (id === 'settings') renderSettings();
  syncGlobalSearchInput();
}

function pageSearchQuery(page = state.page) {
  if (page === 'clients') return state.clients.query;
  if (page === 'projects') return state.projects.query;
  if (page === 'board') return state.board.query;
  if (page === 'sessions') return state.sessionsView.query;
  return '';
}

function setPageSearchQuery(value, page = state.page) {
  const q = String(value || '');
  if (page === 'clients') state.clients.query = q;
  else if (page === 'projects') state.projects.query = q;
  else if (page === 'board') state.board.query = q;
  else if (page === 'sessions') state.sessionsView.query = q;
}

function applyGlobalSearch(value) {
  setPageSearchQuery(value);
  if (state.page === 'clients') renderClients();
  else if (state.page === 'projects') renderProjects();
  else if (state.page === 'board') renderBoard();
  else if (state.page === 'sessions') renderSessions();
}

function syncGlobalSearchInput() {
  const input = $('globalSearch');
  if (input) input.value = pageSearchQuery();
}

function renderOverview() {
  const root = $('page-overview');
  if (!root) return;
  applyTimerContext();
  const liveSecs = liveTimerSeconds();
  const t = formatHms(liveSecs);
  const { project, client, rate } = getTimerContext();
  const activeClients = state.clients.items.filter(c => !c.archived);
  const activeProjects = state.projects.items.filter(p => p.status !== 'done');
  const monthSessions = sessionsInCurrentMonth();
  const monthMin = monthSessions.reduce(
    (sum, s) => sum + Math.round((Number(s.durationMin) || 0) / 60),
    0
  );
  const monthRev = monthSessions.reduce((sum, s) => sum + (Number(s.cost) || 0), 0);
  const deadlines = upcomingDeadlines();
  const activity = recentActivityItems();
  const topProjects = topProjectsForOverview();
  const week = overviewWeekBars();
  const timerProject = project?.name || tr('noProjectSelected');
  const timerClient = client?.company || '—';
  const timerCategory = project?.category || 'General';
  const timerCur = currencyForClient(client);
  const timerRate = formatRate(rate, timerCur);
  const timerCost = formatMoney(computeSessionCost(liveSecs, rate), timerCur);

  root.innerHTML = `
    <div class="metrics">
      <div class="metric">
        <div class="metric__label">${tr('metricActiveClients')}</div>
        <div class="metric__value">${activeClients.length}</div>
        <div class="metric__sub">${tr('metricTotal', { n: state.clients.items.length })}</div>
      </div>
      <div class="metric">
        <div class="metric__label">${tr('metricActiveProjects')}</div>
        <div class="metric__value">${activeProjects.length}</div>
        <div class="metric__sub">${tr('metricDone', { n: state.projects.items.filter(p => p.status === 'done').length })}</div>
      </div>
      <div class="metric is-timer">
        <div class="metric__label">${tr('metricRunningTimer')}</div>
        <div class="metric__value" id="metricTimer">${t}</div>
        <div class="metric__sub is-muted">${escapeHtml(timerProject)}</div>
      </div>
      <div class="metric">
        <div class="metric__label">${tr('metricHoursMonth')}</div>
        <div class="metric__value">${escapeHtml(formatMinutes(monthMin))}</div>
        <div class="metric__sub">${tr('metricSessions', { n: monthSessions.length })}</div>
      </div>
      <div class="metric">
        <div class="metric__label">${tr('metricRevenueMonth')}</div>
        <div class="metric__value">${escapeHtml(formatMoney(monthRev, getStudioCurrency()))}</div>
        <div class="metric__sub">${tr('metricFromLogged')}</div>
      </div>
    </div>

    <div class="grid">
      <article class="card">
        <div class="card__head">
          <h2 class="card__title">${tr('metricRunningTimer')}</h2>
          <button type="button" class="card__link" id="btnOpenMini">${tr('openMini')}</button>
        </div>
        <div class="timer-hero">
          <div class="timer-hero__ring">
            ${renderTimerRing(liveSecs, { prefix: 'ov', compact: true })}
          </div>
          <div class="timer-meta">
            <h3>${escapeHtml(timerProject)}</h3>
            <span class="tag">${escapeHtml(timerCategory)}</span>
            <dl>
              <dt>${tr('client')}</dt><dd>${escapeHtml(timerClient)}</dd>
              <dt>${tr('hourlyRate')}</dt><dd>${escapeHtml(timerRate)}</dd>
              <dt>${tr('accumulated')}</dt><dd id="accCost">${escapeHtml(timerCost)}</dd>
            </dl>
            <div class="timer-actions">
              <button type="button" class="btn" id="btnPause">${state.timerRunning ? tr('pause') : liveSecs > 0 ? tr('resume') : tr('start')}</button>
              <button type="button" class="btn" id="btnStop">${tr('stop')}</button>
              <button type="button" class="btn btn-primary" id="btnNewSession">${tr('newSession')}</button>
            </div>
          </div>
        </div>
      </article>

      <article class="card">
        <div class="card__head"><h2 class="card__title">${tr('upcomingDeadlines')}</h2></div>
        <div class="list">
          ${
            deadlines.length
              ? deadlines
                  .map(
                    d => `<button type="button" class="list-row" data-deadline-id="${escapeHtml(d.id)}" style="width:100%;text-align:left;background:none;border:0;cursor:pointer;font:inherit">
                <div><strong>${escapeHtml(d.name)}</strong><span>${escapeHtml(d.when)}</span></div>
                <div class="when"${d.days < 0 ? ' style="color:#dc2626"' : ''}>${escapeHtml(d.rel)}</div>
              </button>`
                  )
                  .join('')
              : `<div class="list-row"><div><span>${tr('noUpcomingDeadlines')}</span></div></div>`
          }
        </div>
      </article>

      <article class="card">
        <div class="card__head"><h2 class="card__title">${tr('recentActivity')}</h2></div>
        <div class="list">
          ${
            activity.length
              ? activity
                  .map(
                    a => `<div class="activity-row">
                <span class="activity-dot" style="background:${escapeHtml(a.color)}"></span>
                <div class="activity-row__text">${escapeHtml(a.text)}</div>
                <div class="when">${escapeHtml(a.when)}</div>
              </div>`
                  )
                  .join('')
              : `<div class="activity-row"><div class="activity-row__text">${tr('noSessionsYet')}</div></div>`
          }
        </div>
      </article>
    </div>

    <div class="bottom-grid">
      <article class="card">
        <div class="card__head"><h2 class="card__title">${tr('topProjects')}</h2></div>
        ${
          topProjects.length
            ? topProjects
                .map(
                  p => `<div class="progress-row">
              <div class="progress-row__top"><strong>${escapeHtml(p.name)}</strong><span>${escapeHtml(p.hours)}</span></div>
              <div class="bar"><i style="width:${p.pct}%"></i></div>
            </div>`
                )
                .join('')
            : `<div class="progress-row"><div class="progress-row__top"><span>${tr('noProjectsYet')}</span></div></div>`
        }
      </article>
      <article class="card">
        <div class="card__head"><h2 class="card__title">${tr('thisWeekTitle')}</h2></div>
        <div class="chart" aria-label="Hours and revenue this week">
          ${week
            .map(
              d => `<div class="chart__col" title="${escapeHtml(d.tip)}">
                <div class="chart__bars">
                  <span style="height:${d.h}%"></span>
                  <span class="rev" style="height:${d.r}%"></span>
                </div>
                <div class="chart__label">${escapeHtml(d.d)}</div>
              </div>`
            )
            .join('')}
        </div>
      </article>
    </div>
  `;

  $('btnPause')?.addEventListener('click', () => {
    if (!state.timerRunning && liveTimerSeconds() === 0) {
      timerStart();
      return;
    }
    toggleTimer();
  });
  $('btnStop')?.addEventListener('click', () => stopTimer(true));
  $('btnNewSession')?.addEventListener('click', () => {
    void (async () => {
      await saveCurrentSession();
      state.timerSeconds = 0;
      state.timerRunStartedAt = null;
      state.timer.dayStart = clockNow();
      state.timer.pauseAccumSec = 0;
      state.timer.pauseStartedAt = null;
      state.timer.day = todayIsoDate();
      state.timerRunning = true;
      state.timerRunStartedAt = Date.now();
      syncTimerUi();
      startTick();
      refreshAfterSessionChange();
    })();
  });
  $('btnOpenMini')?.addEventListener('click', () => void openMini());
  root.querySelectorAll('[data-deadline-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.projects.detailId = btn.dataset.deadlineId;
      setPage('project-detail');
    });
  });
}

function sessionsInCurrentMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const mo = now.getMonth() + 1;
  return state.timer.sessions.filter(s => {
    const m = String(s.date || '').match(/^(\d{4})-(\d{2})/);
    if (!m) return s.period === 'month';
    return Number(m[1]) === y && Number(m[2]) === mo;
  });
}

function upcomingDeadlines() {
  return state.projects.items
    .filter(p => p.deadline && p.status !== 'done')
    .map(p => {
      const days = daysUntilDeadline(p.deadline);
      let rel = '';
      if (days === null) rel = '';
      else if (days < 0) rel = tr('daysOverdue', { n: Math.abs(days) });
      else if (days === 0) rel = tr('dueToday');
      else if (days === 1) rel = tr('inOneDay');
      else rel = tr('inDays', { n: days });
      return {
        id: p.id,
        name: p.name,
        when: formatDeadline(p.deadline),
        rel,
        days: days ?? 9999
      };
    })
    .sort((a, b) => a.days - b.days)
    .slice(0, 6);
}

function recentActivityItems() {
  return [...state.timer.sessions]
    .sort((a, b) => {
      const da = String(a.date || '');
      const db = String(b.date || '');
      if (db !== da) return db.localeCompare(da);
      return String(b.start || b.when || '').localeCompare(String(a.start || a.when || ''));
    })
    .slice(0, 6)
    .map(s => ({
      text: tr('loggedActivity', { hours: formatHmsDisplay(sessionDurationSec(s)), project: s.project }),
      when: s.date ? formatDeadline(s.date) : '',
      color: '#22c55e'
    }));
}

function topProjectsForOverview() {
  return [...state.projects.items]
    .filter(p => p.status !== 'done')
    .sort((a, b) => (b.workedMin || 0) - (a.workedMin || 0))
    .slice(0, 4)
    .map(p => {
      const worked = Number(p.workedMin) || 0;
      const est = Number(p.estimatedMin) || 0;
      return {
        name: p.name,
        hours: `${formatMinutes(worked)} / ${formatMinutes(est)}`,
        pct: est > 0 ? Math.min(100, Math.round((worked / est) * 100)) : worked > 0 ? 100 : 0
      };
    });
}

function overviewWeekBars() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const day = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - day);
  const days = [];
  let maxMin = 1;
  let maxRev = 1;
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');
    const label = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
    const sessions = state.timer.sessions.filter(s => s.date === iso);
    const mins = sessions.reduce(
      (sum, s) => sum + Math.round((Number(s.durationMin) || 0) / 60),
      0
    );
    const rev = sessions.reduce((sum, s) => sum + (Number(s.cost) || 0), 0);
    maxMin = Math.max(maxMin, mins);
    maxRev = Math.max(maxRev, rev);
    days.push({ label, mins, rev });
  }
  return days.map(d => ({
    d: d.label,
    h: d.mins ? Math.max(8, Math.round((d.mins / maxMin) * 100)) : 4,
    r: d.rev ? Math.max(8, Math.round((d.rev / maxRev) * 100)) : 4,
    tip: `${formatMinutes(d.mins)} · ${formatMoney(d.rev, getStudioCurrency())}`
  }));
}

function getFilteredClients() {
  const { items, query, statusFilter, sortBy } = state.clients;
  const q = query.trim().toLowerCase();
  let list = items.filter(c => {
    if (statusFilter === 'archived') return c.archived;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (statusFilter === 'all' && c.archived) return false;
    if (!q) return true;
    const hay = [c.company, c.contact, c.email, c.tags?.join(' ')].join(' ').toLowerCase();
    return hay.includes(q);
  });
  list = [...list];
  if (sortBy === 'company-asc') list.sort((a, b) => a.company.localeCompare(b.company));
  else if (sortBy === 'company-desc') list.sort((a, b) => b.company.localeCompare(a.company));
  else if (sortBy === 'rate-desc') list.sort((a, b) => (b.rate || 0) - (a.rate || 0));
  else if (sortBy === 'projects-desc') {
    list.sort((a, b) => projectsForClient(b.id).length - projectsForClient(a.id).length);
  }
  else if (sortBy === 'recent') list.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return list;
}

function renderClientDetail(client) {
  if (!client) {
    return `<div class="clients-detail"><p class="clients-empty">${tr('selectClient')}</p></div>`;
  }
  const color = clientLogoColor(client.company);
  const initials = clientInitials(client.company);
  const statusClass = client.archived ? 'archived' : client.status;
  return `
    <div class="clients-detail">
      <div class="clients-detail__head">
        <div class="clients-detail__logo" style="background:${color}">${escapeHtml(initials)}</div>
        <div>
          <h2>${escapeHtml(client.company)}</h2>
          <span class="status-pill is-${statusClass}">${escapeHtml(clientStatusLabel(client.status, client.archived))}</span>
          <div class="clients-detail__tags">
            ${(client.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
          </div>
        </div>
      </div>
      <div class="detail-section">
        <h3>${tr('contactSection')}</h3>
        <dl class="detail-dl">
          <div><dt>${tr('person')}</dt><dd>${escapeHtml(client.contact || '—')}</dd></div>
          <div><dt>${tr('email')}</dt><dd>${client.email ? `<a href="mailto:${escapeHtml(client.email)}">${escapeHtml(client.email)}</a>` : '—'}</dd></div>
          <div><dt>${tr('phone')}</dt><dd>${escapeHtml(client.phone || '—')}</dd></div>
          <div><dt>${tr('website')}</dt><dd>${client.website ? `<a href="${escapeHtml(client.website)}" target="_blank" rel="noopener">${escapeHtml(client.website.replace(/^https?:\/\//, ''))}</a>` : '—'}</dd></div>
        </dl>
      </div>
      <div class="detail-section">
        <h3>${tr('billingSection')}</h3>
        <dl class="detail-dl">
          <div><dt>${tr('vat')}</dt><dd>${escapeHtml(client.vat || '—')}</dd></div>
          <div><dt>${tr('address')}</dt><dd>${escapeHtml(formatClientAddress(client))}</dd></div>
          <div><dt>${tr('rate')}</dt><dd>${escapeHtml(formatRate(client.rate, currencyForClient(client)))}</dd></div>
          <div><dt>${tr('currency')}</dt><dd>${escapeHtml(currencyForClient(client))}</dd></div>
        </dl>
      </div>
      ${client.notes ? `<div class="detail-section"><h3>${tr('notesSection')}</h3><p style="margin:0;font-size:12px;line-height:1.5;color:var(--text)">${escapeHtml(client.notes)}</p></div>` : ''}
      <div class="detail-section">
        <h3>${tr('projectsCount', { n: projectsForClient(client.id).length })}</h3>
        <div class="detail-projects">
          ${(() => {
            const list = projectsForClient(client.id)
              .slice()
              .sort((a, b) => {
                const ad = a.status === 'done' ? 1 : 0;
                const bd = b.status === 'done' ? 1 : 0;
                if (ad !== bd) return ad - bd;
                return String(a.name).localeCompare(String(b.name));
              });
            if (!list.length) {
              return `<p class="hint" style="margin:0">${tr('noProjectsYet')}</p>`;
            }
            return list
              .map(
                p => `<button type="button" class="detail-project-link" data-open-project="${escapeHtml(p.id)}">
                <strong>${escapeHtml(p.name)}</strong>
                <span>${escapeHtml(projectStatusLabel(p.status))}</span>
              </button>`
              )
              .join('');
          })()}
        </div>
      </div>
      <div class="detail-actions">
        <button type="button" class="btn" data-detail-action="favorite">${client.favorite ? `★ ${tr('favorited')}` : `☆ ${tr('addFavorite')}`}</button>
        <button type="button" class="btn" data-detail-action="archive">${client.archived ? tr('unarchive') : tr('archive')}</button>
        <button type="button" class="btn btn-danger" data-detail-action="delete">${tr('delete')}</button>
        <button type="button" class="btn btn-primary" data-detail-action="edit">${tr('editClientBtn')}</button>
      </div>
    </div>
  `;
}

function renderClients() {
  const root = $('page-clients');
  if (!root) return;
  const filtered = getFilteredClients();
  const { selectedId } = state.clients;
  let selected = state.clients.items.find(c => c.id === selectedId);
  if (selected && !filtered.some(c => c.id === selected.id)) selected = filtered[0] || null;
  if (!selected && filtered.length) {
    selected = filtered[0];
    state.clients.selectedId = selected.id;
  }

  const rows = filtered.length
    ? filtered
        .map(c => {
          const color = clientLogoColor(c.company);
          const initials = clientInitials(c.company);
          const statusClass = c.archived ? 'archived' : c.status;
          const isSelected = selected?.id === c.id;
          return `<tr class="${isSelected ? 'is-selected' : ''}" data-client-id="${escapeHtml(c.id)}">
            <td>
              <div class="client-cell">
                <div class="client-logo" style="background:${color}">${escapeHtml(initials)}</div>
                <div style="min-width:0">
                  <div class="client-cell__name">${escapeHtml(c.company)}${c.favorite ? ' <span style="color:#f59e0b">★</span>' : ''}</div>
                  <div class="client-cell__sub">${escapeHtml(c.email || '')}</div>
                </div>
              </div>
            </td>
            <td>${escapeHtml(c.contact || '—')}</td>
            <td class="clients-projects-cell">${(() => {
              const list = projectsForClient(c.id);
              if (!list.length) return '0';
              return list
                .slice()
                .sort((a, b) => (a.status === 'done' ? 1 : 0) - (b.status === 'done' ? 1 : 0))
                .map(
                  p =>
                    `<button type="button" class="table-proj-link${p.status === 'done' ? ' is-done' : ''}" data-open-project="${escapeHtml(p.id)}" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</button>`
                )
                .join('');
            })()}</td>
            <td>${escapeHtml(formatRate(c.rate, currencyForClient(c)))}</td>
            <td><span class="status-pill is-${statusClass}">${escapeHtml(clientStatusLabel(c.status, c.archived))}</span></td>
            <td>
              <div class="row-actions">
                <button type="button" class="${c.favorite ? 'is-fav' : ''}" data-row-action="favorite" data-client-id="${escapeHtml(c.id)}" title="${tr('addFavorite')}">★</button>
                <button type="button" data-row-action="edit" data-client-id="${escapeHtml(c.id)}" title="${tr('edit')}">${tr('edit')}</button>
              </div>
            </td>
          </tr>`;
        })
        .join('')
    : '';

  root.innerHTML = `
    <div class="clients-layout${selected ? ' has-detail' : ''}">
      <div class="clients-panel">
        <div class="clients-toolbar">
          <input type="search" class="search" id="clientsSearch" placeholder="${tr('searchClients')}" value="${escapeHtml(state.clients.query)}" />
          <select id="clientsFilter" aria-label="${tr('client')}">
            <option value="all"${state.clients.statusFilter === 'all' ? ' selected' : ''}>${tr('filterAllActive')}</option>
            <option value="active"${state.clients.statusFilter === 'active' ? ' selected' : ''}>${tr('filterActive')}</option>
            <option value="lead"${state.clients.statusFilter === 'lead' ? ' selected' : ''}>${tr('filterLeads')}</option>
            <option value="paused"${state.clients.statusFilter === 'paused' ? ' selected' : ''}>${tr('filterPaused')}</option>
            <option value="archived"${state.clients.statusFilter === 'archived' ? ' selected' : ''}>${tr('filterArchived')}</option>
          </select>
          <select id="clientsSort" aria-label="${tr('client')}">
            <option value="company-asc"${state.clients.sortBy === 'company-asc' ? ' selected' : ''}>${tr('sortCompanyAsc')}</option>
            <option value="company-desc"${state.clients.sortBy === 'company-desc' ? ' selected' : ''}>${tr('sortCompanyDesc')}</option>
            <option value="recent"${state.clients.sortBy === 'recent' ? ' selected' : ''}>${tr('sortRecent')}</option>
            <option value="rate-desc"${state.clients.sortBy === 'rate-desc' ? ' selected' : ''}>${tr('sortRateHigh')}</option>
            <option value="projects-desc"${state.clients.sortBy === 'projects-desc' ? ' selected' : ''}>${tr('sortMostProjects')}</option>
          </select>
          <button type="button" class="btn btn-primary" id="btnNewClient">${tr('plusNewClient')}</button>
        </div>
        <div class="clients-table-wrap">
          ${
            filtered.length
              ? `<table class="clients-table">
            <thead>
              <tr>
                <th>${tr('colCompany')}</th>
                <th>${tr('colContact')}</th>
                <th>${tr('colProjects')}</th>
                <th>${tr('rate')}</th>
                <th>${tr('status')}</th>
                <th style="text-align:right">${tr('colActions')}</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>`
              : `<div class="clients-empty"><p>${tr('noClientsMatch')}</p></div>`
          }
        </div>
      </div>
      ${selected ? renderClientDetail(selected) : ''}
    </div>
  `;

  $('clientsSearch')?.addEventListener('input', e => {
    state.clients.query = e.target.value;
    renderClients();
  });
  $('clientsFilter')?.addEventListener('change', e => {
    state.clients.statusFilter = e.target.value;
    renderClients();
  });
  $('clientsSort')?.addEventListener('change', e => {
    state.clients.sortBy = e.target.value;
    renderClients();
  });
  $('btnNewClient')?.addEventListener('click', openClientModal);

  root.querySelectorAll('tbody tr[data-client-id]').forEach(row => {
    row.addEventListener('click', e => {
      if (e.target.closest('[data-row-action]') || e.target.closest('[data-open-project]')) return;
      state.clients.selectedId = row.dataset.clientId;
      renderClients();
    });
  });

  root.querySelectorAll('[data-open-project]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.openProject;
      if (!id) return;
      state.projects.detailId = id;
      setPage('project-detail');
    });
  });

  root.querySelectorAll('[data-row-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.clientId;
      const client = state.clients.items.find(c => c.id === id);
      if (!client) return;
      if (btn.dataset.rowAction === 'favorite') {
        client.favorite = !client.favorite;
        void persistClient(client);
        renderClients();
        refreshChrome();
      } else if (btn.dataset.rowAction === 'edit') {
        state.clients.selectedId = id;
        renderClients();
        openClientModal(client);
      }
    });
  });

  root.querySelectorAll('[data-detail-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!selected) return;
      const action = btn.dataset.detailAction;
      if (action === 'favorite') {
        selected.favorite = !selected.favorite;
        void persistClient(selected);
        renderClients();
        refreshChrome();
      } else if (action === 'archive') {
        selected.archived = !selected.archived;
        if (selected.archived) {
          selected.status = 'archived';
          state.clients.statusFilter = 'archived';
        } else if (selected.status === 'archived') {
          selected.status = 'active';
        }
        void persistClient(selected);
        renderClients();
      } else if (action === 'delete') {
        void deleteClient(selected);
      } else if (action === 'edit') {
        openClientModal(selected);
      }
    });
  });
}

function formatClientAddress(client) {
  const street = String(client?.address || '').trim();
  const zipCity = [client?.zip, client?.city].map(v => String(v || '').trim()).filter(Boolean).join(' ');
  const parts = [street, zipCity].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
}

function openClientModal(client = null) {
  const modal = $('clientModal');
  const form = $('clientForm');
  if (!modal) return;
  state.clients.editingId = client?.id || null;
  const title = $('clientModalTitle');
  const saveBtn = $('clientModalSave');
  const subtitle = modal.querySelector('.modal__head p');
  if (title) title.textContent = client ? tr('editClient') : tr('newClientTitle');
  if (saveBtn) saveBtn.textContent = client ? 'Save changes' : 'Add client';
  if (subtitle) {
    subtitle.textContent = client
      ? 'Changes are saved locally on your device.'
      : 'Add a new client to your studio.';
  }
  form?.reset();
  const fCurrency = $('fCurrency');
  if (fCurrency) {
    fCurrency.innerHTML = currencySelectOptions(client?.currency || '', { includeStudioDefault: true });
  }
  const fRateLabel = $('fRateLabel');
  if (fRateLabel) {
    const cur = currencyForClient(client);
    fRateLabel.textContent = `${tr('hourlyRateLabel')} (${currencySymbol(cur)})`;
  }
  const fCurrencyHint = $('fCurrencyHint');
  if (fCurrencyHint) fCurrencyHint.textContent = tr('clientCurrencyHint');
  if (client) {
    if ($('fCompany')) $('fCompany').value = client.company || '';
    if ($('fContact')) $('fContact').value = client.contact || '';
    if ($('fRate')) $('fRate').value = client.rate || '';
    if ($('fEmail')) $('fEmail').value = client.email || '';
    if ($('fPhone')) $('fPhone').value = client.phone || '';
    if ($('fVat')) $('fVat').value = client.vat || '';
    if ($('fWebsite')) $('fWebsite').value = client.website || '';
    if ($('fAddress')) $('fAddress').value = client.address || '';
    if ($('fZip')) $('fZip').value = client.zip || '';
    if ($('fCity')) $('fCity').value = client.city || '';
    if ($('fStatus')) $('fStatus').value = client.archived ? 'archived' : client.status || 'active';
    if ($('fNotes')) $('fNotes').value = client.notes || '';
  }
  modal.hidden = false;
  $('fCompany')?.focus();
  const delBtn = $('clientModalDelete');
  if (delBtn) {
    delBtn.hidden = !client;
    delBtn.onclick = () => {
      if (!client) return;
      void deleteClient(client);
    };
  }
}

function closeClientModal() {
  const modal = $('clientModal');
  state.clients.editingId = null;
  if (modal) modal.hidden = true;
}

async function saveClient() {
  const form = $('clientForm');
  if (!form || !form.reportValidity()) return;
  const fd = new FormData(form);
  const company = String(fd.get('company') || '').trim();
  if (!company) return;
  const existing = state.clients.editingId
    ? state.clients.items.find(c => c.id === state.clients.editingId)
    : null;
  const id = existing?.id || `c${Date.now()}`;
  const rate = Number(fd.get('rate')) || 0;
  const status = String(fd.get('status') || 'active');
  const client = {
    id,
    company,
    contact: String(fd.get('contact') || '').trim(),
    email: String(fd.get('email') || '').trim(),
    phone: String(fd.get('phone') || '').trim(),
    website: String(fd.get('website') || '').trim(),
    vat: String(fd.get('vat') || '').trim(),
    address: String(fd.get('address') || '').trim(),
    zip: String(fd.get('zip') || '').trim(),
    city: String(fd.get('city') || '').trim(),
    notes: String(fd.get('notes') || '').trim(),
    rate,
    currency: normalizeCurrency(fd.get('currency')) || '',
    status: status === 'archived' ? 'archived' : status,
    tags: existing?.tags || [],
    favorite: existing?.favorite || false,
    archived: status === 'archived' || existing?.archived || false,
    workspaceId: null,
    updatedAt: new Date().toISOString().slice(0, 10)
  };
  await persistClient(client);
  if (existing) {
    const oldCompany = existing.company;
    Object.assign(existing, client);
    // Keep project.client labels in sync when company name changes.
    state.projects.items.forEach(p => {
      if (p.clientId === id) p.client = company;
    });
    state.timer.sessions.forEach(s => {
      if (s.client === oldCompany || state.projects.items.some(p => p.id === s.projectId && p.clientId === id)) {
        s.client = company;
      }
    });
  } else {
    state.clients.items.unshift(client);
  }
  state.clients.selectedId = id;
  if (!existing) state.clients.query = '';
  state.clients.statusFilter = client.archived ? 'archived' : 'all';
  closeClientModal();
  setPage('clients');
}

async function deleteClient(client) {
  if (!client) return;
  const linked = state.projects.items.filter(p => p.clientId === client.id);
  const msg = linked.length
    ? `Delete client "${client.company}"?\n\nThis also permanently deletes ${linked.length} linked project(s), tasks and sessions.\n\nThis cannot be undone.`
    : `Delete client "${client.company}"?\n\nThis cannot be undone.`;
  if (!confirm(msg)) return;
  const confirmAgain = linked.length
    ? `Confirm delete of "${client.company}" and ${linked.length} project(s)?`
    : `Really delete "${client.company}"? Tap OK again to confirm.`;
  if (!confirm(confirmAgain)) return;
  closeClientModal();
  const projectIds = new Set(linked.map(p => p.id));
  try {
    await invoke('tracker_delete_client', { id: client.id });
  } catch (err) {
    console.warn('deleteClient', err);
    alert(`Could not delete client: ${String(err?.message || err)}`);
    return;
  }
  state.clients.items = state.clients.items.filter(c => c.id !== client.id);
  state.projects.items = state.projects.items.filter(p => p.clientId !== client.id);
  state.board.items = state.board.items.filter(t => !projectIds.has(t.projectId));
  state.timer.sessions = state.timer.sessions.filter(
    s => !projectIds.has(s.projectId) && s.client !== client.company
  );
  if (state.clients.selectedId === client.id) {
    state.clients.selectedId = state.clients.items[0]?.id || null;
  }
  if (state.reports.clientId === client.id) state.reports.clientId = 'all';
  if (projectIds.has(state.reports.projectId)) state.reports.projectId = 'all';
  if (projectIds.has(state.projects.detailId)) state.projects.detailId = null;
  if (projectIds.has(state.timer.projectId)) {
    state.timer.projectId = preferredActiveProjectId();
  }
  refreshChrome();
  renderClients();
}

function getFilteredProjects() {
  const { items, query, statusFilter, sortBy } = state.projects;
  const q = query.trim().toLowerCase();
  let list = items.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (!q) return true;
    const hay = [p.name, p.client, p.category].join(' ').toLowerCase();
    return hay.includes(q);
  });
  list = [...list];
  if (sortBy === 'name-asc') list.sort((a, b) => a.name.localeCompare(b.name));
  else if (sortBy === 'name-desc') list.sort((a, b) => b.name.localeCompare(a.name));
  else if (sortBy === 'deadline') list.sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)));
  else if (sortBy === 'progress-desc') list.sort((a, b) => (b.progress || 0) - (a.progress || 0));
  return list;
}

function startProjectTimer(project) {
  state.timer.projectId = project.id;
  MOCK.project = project.name;
  MOCK.client = project.client;
  applyTimerContext();
  freezeLiveTimer();
  state.timerRunning = false;
  state.timerRunStartedAt = null;
  stopTick();
  syncTimerUi();
  setPage('timer');
}

function openProjectWorkspace(project) {
  state.projects.detailId = project.id;
  setPage('project-detail');
}

function renderProjectDetail() {
  const root = $('page-project-detail');
  if (!root) return;
  const project = state.projects.items.find(p => p.id === state.projects.detailId);
  if (!project) {
    root.innerHTML = `<div class="clients-empty"><p>${tr('project')}</p>
      <button type="button" class="btn" id="btnBackProjectsMissing">${tr('backProjects')}</button></div>`;
    $('btnBackProjectsMissing')?.addEventListener('click', () => {
      state.projects.detailId = null;
      setPage('projects');
    });
    return;
  }

  const rate = projectRate(project);
  const sessions = sessionsForProject(project.id).slice().sort((a, b) => {
    const da = String(a.date || '');
    const db = String(b.date || '');
    if (db !== da) return db.localeCompare(da);
    const sa = parseClockToMinutes(a.start) ?? -1;
    const sb = parseClockToMinutes(b.start) ?? -1;
    if (sb !== sa) return sb - sa;
    return String(b.id || '').localeCompare(String(a.id || ''));
  });
  const workedMin = sessions.reduce(
    (s, x) => s + Math.round((Number(x.durationMin) || 0) / 60),
    0
  );
  const revenue = sessions.reduce((s, x) => s + (Number(x.cost) || 0), 0);
  const progress =
    project.estimatedMin > 0 ? Math.min(100, Math.round((workedMin / project.estimatedMin) * 100)) : 0;

  const sessionRows = sessions.length
    ? sessions
        .map(
          s => `<tr data-session-id="${escapeHtml(s.id)}">
            <td>${escapeHtml(s.date ? formatReportDate(s.date) : '—')}</td>
            <td>${escapeHtml(formatClockDisplay(s.start))}</td>
            <td>${escapeHtml(formatClockDisplay(s.end))}</td>
            <td>${escapeHtml(formatBreakDisplay(s.breakMin))}</td>
            <td>${escapeHtml(s.description || '—')}</td>
            <td class="num">${escapeHtml(formatHmsDisplay(sessionDurationSec(s)))}</td>
            <td class="num">${escapeHtml(formatMoney(s.cost, currencyForSession(s)))}</td>
            <td class="session-actions">
              <button type="button" class="btn" data-session-action="edit" data-session-id="${escapeHtml(s.id)}">${tr('edit')}</button>
              <button type="button" class="btn" data-session-action="move" data-session-id="${escapeHtml(s.id)}">${tr('move')}</button>
              <button type="button" class="btn" data-session-action="duplicate" data-session-id="${escapeHtml(s.id)}">${tr('duplicate')}</button>
              <button type="button" class="btn" data-session-action="delete" data-session-id="${escapeHtml(s.id)}">${tr('delete')}</button>
            </td>
          </tr>`
        )
        .join('')
    : `<tr><td colspan="8" class="empty-cell">${tr('noSessionsHint')}</td></tr>`;

  root.innerHTML = `
    <div class="project-detail">
      <div class="project-detail__toolbar">
        <button type="button" class="btn" id="btnBackProjects">${tr('backProjects')}</button>
        <div class="project-detail__toolbar-actions">
          <button type="button" class="btn btn-primary" id="btnDetailTimer">${tr('startTimer')}</button>
          <button type="button" class="btn" id="btnDetailAddSession">${tr('plusSession')}</button>
          <button type="button" class="btn" id="btnDetailEdit">${tr('editProjectBtn')}</button>
          <button type="button" class="btn" id="btnDetailBoard">${tr('board')}</button>
        </div>
      </div>
      <section class="project-detail__hero">
        <div>
          <span class="status-pill is-${project.status === 'on-hold' ? 'on-hold' : escapeHtml(project.status)}">${escapeHtml(projectStatusLabel(project.status))}</span>
          <h2>${escapeHtml(project.name)}</h2>
          <p class="project-detail__client">${escapeHtml(project.client)} · ${escapeHtml(project.category || 'General')}</p>
        </div>
        <div class="project-detail__stats">
          <div><span>${tr('hourlyRate')}</span><strong>${escapeHtml(formatRate(rate, currencyForProjectId(project.id)))}</strong></div>
          <div><span>${tr('estimated')}</span><strong>${escapeHtml(formatMinutes(project.estimatedMin))}</strong></div>
          <div><span>${tr('worked')}</span><strong>${escapeHtml(formatMinutes(workedMin))}</strong></div>
          <div><span>${tr('revenue')}</span><strong>${escapeHtml(formatMoney(revenue, currencyForProjectId(project.id)))}</strong></div>
          <div><span>Deadline</span><strong>${escapeHtml(formatDeadline(project.deadline))}</strong></div>
          <div><span>${tr('progress')}</span><strong>${progress}%</strong></div>
        </div>
        <div class="project-card__bar" aria-hidden="true"><i style="width:${progress}%;background:linear-gradient(90deg,${escapeHtml(project.accent || '#22c55e')},#4ade80)"></i></div>
      </section>
      <section class="project-detail__sessions">
        <div class="project-detail__sessions-head">
          <h3>${tr('sessionHistory')}</h3>
          <span>${tr('metricSessions', { n: sessions.length })}</span>
        </div>
        <div class="table-wrap">
          <table class="session-table">
            <thead>
              <tr>
                <th>${tr('colDate')}</th>
                <th>${tr('colTimeStart')}</th>
                <th>${tr('colTimeEnd')}</th>
                <th>${tr('break')}</th>
                <th>${tr('colDescription')}</th>
                <th class="num">${tr('colHours')}</th>
                <th class="num">${tr('cost')}</th>
                <th>${tr('colActions')}</th>
              </tr>
            </thead>
            <tbody>${sessionRows}</tbody>
          </table>
        </div>
      </section>
    </div>
  `;

  $('btnBackProjects')?.addEventListener('click', () => {
    state.projects.detailId = null;
    setPage('projects');
  });
  $('btnDetailTimer')?.addEventListener('click', () => startProjectTimer(project));
  $('btnDetailAddSession')?.addEventListener('click', () => openSessionEditor({ projectId: project.id }));
  $('btnDetailEdit')?.addEventListener('click', () => openProjectModal(project));
  $('btnDetailBoard')?.addEventListener('click', () => {
    state.board.projectFilter = project.id;
    state.board.query = '';
    setPage('board');
  });
  bindSessionActions(root);
}

/** Move a session to another project (keeps its own row; no same-day merge). */
async function moveSessionToProject(sessionId, targetProjectId) {
  const session = state.timer.sessions.find(s => s.id === sessionId);
  const target = state.projects.items.find(p => p.id === targetProjectId);
  if (!session || !target) return null;
  if (session.projectId === target.id) return session;

  const fromProjectId = session.projectId || '';
  return upsertSessionLocal(
    {
      ...session,
      projectId: target.id,
      project: target.name,
      client: target.client,
      description: session.description || target.name
    },
    { isNew: false, previousProjectId: fromProjectId }
  );
}

function openMoveSessionModal(session) {
  const modal = $('moveSessionModal');
  const select = $('moveSessionProject');
  const summary = $('moveSessionSummary');
  if (!modal || !select || !session) return;
  state.sessionEditor.movingId = session.id;
  const others = state.projects.items.filter(p => p.id !== session.projectId);
  select.innerHTML = others.length
    ? others
        .map(
          p =>
            `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} — ${escapeHtml(p.client)}</option>`
        )
        .join('')
    : `<option value="">No other projects</option>`;
  if (summary) {
    const when = session.date ? formatReportDate(session.date) : '—';
    summary.textContent = `${session.project || 'Session'} · ${when} · ${formatHmsDisplay(sessionDurationSec(session))} · ${formatClockDisplay(session.start)}–${formatClockDisplay(session.end)}`;
  }
  modal.hidden = false;
}

function closeMoveSessionModal() {
  const modal = $('moveSessionModal');
  state.sessionEditor.movingId = null;
  if (modal) modal.hidden = true;
}

async function confirmMoveSession() {
  const id = state.sessionEditor.movingId;
  const targetId = String($('moveSessionProject')?.value || '');
  if (!id || !targetId) return;
  const target = state.projects.items.find(p => p.id === targetId);
  if (!target) return;
  if (!confirm(`Move this session to:\n${target.name} — ${target.client}?`)) return;
  await moveSessionToProject(id, targetId);
  closeMoveSessionModal();
  refreshAfterSessionChange();
}

function bindSessionActions(root) {
  root?.querySelectorAll('[data-session-action]').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const id = btn.dataset.sessionId;
      const action = btn.dataset.sessionAction;
      const session = state.timer.sessions.find(s => s.id === id);
      if (!session) return;
      if (action === 'edit') {
        openSessionEditor(session);
      } else if (action === 'move') {
        openMoveSessionModal(session);
      } else if (action === 'duplicate') {
        await upsertSessionLocal(
          {
            ...session,
            id: `s${Date.now()}`,
            description: session.description ? `${session.description} (copy)` : 'Copy'
          },
          { isNew: true }
        );
        refreshAfterSessionChange();
      } else if (action === 'delete') {
        if (!confirm('Delete this session?')) return;
        await removeSessionLocal(id);
        refreshAfterSessionChange();
      }
    });
  });
}

function refreshAfterSessionChange() {
  if (state.page === 'project-detail') renderProjectDetail();
  else if (state.page === 'timer') updateTimerSessionsPanel();
  else if (state.page === 'projects') renderProjects();
  else if (state.page === 'sessions') renderSessions();
}

function openSessionEditor(sessionOrDefaults = null) {
  const modal = $('manualEntryModal');
  const select = $('mProject');
  if (!modal) return;
  const isEdit = !!(sessionOrDefaults && sessionOrDefaults.id && state.timer.sessions.some(s => s.id === sessionOrDefaults.id));
  state.sessionEditor.editingId = isEdit ? sessionOrDefaults.id : null;
  const title = $('manualEntryTitle');
  const saveBtn = $('manualEntrySave');
  const subtitle = modal.querySelector('.modal__head p');
  if (title) title.textContent = isEdit ? tr('editSession') : tr('newSession');
  if (saveBtn) saveBtn.textContent = isEdit ? tr('saveChanges') : tr('addEntry');
  if (subtitle) {
    subtitle.textContent = isEdit
      ? 'Billable time = (End − Start) − Break. Change project to move this session.'
      : 'Set start and end (HH/MM/SS, 24h). Break optional. Billable = (End − Start) − Break.';
  }
  if (select) {
    select.innerHTML = state.projects.items
      .map(
        p =>
          `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} — ${escapeHtml(p.client)}</option>`
      )
      .join('');
  }
  $('manualEntryForm')?.reset();
  const base = sessionOrDefaults || {};
  const projectId = base.projectId || state.projects.detailId || state.timer.projectId;
  if (select && projectId) select.value = projectId;
  if ($('mDate')) $('mDate').value = base.date || todayIsoDate();
  setManualClockField('mStart', normalizeClockString(base.start) || '');
  setManualClockField('mEnd', normalizeClockString(base.end) || '');
  setManualClockField('mBreak', formatClockValueSec(base.breakMin ?? 0));
  let durSec = Math.max(0, Number(base.durationMin) || 0);
  if (base.start && base.end) {
    const fromClocks = durationFromClocks(base.start, base.end, base.breakMin);
    if (fromClocks != null) durSec = fromClocks;
  }
  if ($('mHours')) $('mHours').value = Math.floor(durSec / 3600);
  if ($('mMinutes')) $('mMinutes').value = Math.floor((durSec % 3600) / 60);
  if ($('mNote')) $('mNote').value = base.description || '';
  const rateFromSession =
    base.rate != null && base.rate !== '' && Number(base.rate) > 0
      ? Number(base.rate)
      : durSec > 0 && Number(base.cost) > 0
        ? Number(base.cost) / (durSec / 3600)
        : clientRateForProject(projectId);
  if ($('mRate')) $('mRate').value = rateFromSession || '';
  syncManualEntryBillableFromWindow();
  modal.hidden = false;
}

function renderProjects() {
  const root = $('page-projects');
  if (!root) return;
  const filtered = getFilteredProjects();

  const cards = filtered.length
    ? filtered
        .map(p => {
          const worked = formatMinutes(p.workedMin);
          const estimated = formatMinutes(p.estimatedMin);
          const statusClass = p.status === 'on-hold' ? 'on-hold' : p.status;
          return `<article class="project-card" data-project-id="${escapeHtml(p.id)}">
            <div class="project-card__top">
              <span class="status-pill is-${statusClass}">${escapeHtml(projectStatusLabel(p.status))}</span>
              <span class="project-card__cat">${escapeHtml(p.category || '')}</span>
            </div>
            <h3>${escapeHtml(p.name)}</h3>
            <p class="project-card__client">${escapeHtml(p.client)}</p>
            <div class="project-card__bar" aria-hidden="true"><i style="width:${Math.min(100, p.progress || 0)}%;background:linear-gradient(90deg,${escapeHtml(p.accent || '#22c55e')},#4ade80)"></i></div>
            <div class="project-card__meta">
              <span>${tr('deadline')} <strong>${escapeHtml(formatDeadline(p.deadline))}</strong></span>
              <span><strong>${escapeHtml(worked)}</strong> / ${escapeHtml(estimated)}</span>
            </div>
            <div class="project-card__actions">
              <button type="button" class="btn" data-project-action="open" data-project-id="${escapeHtml(p.id)}">${tr('open')}</button>
              <button type="button" class="btn btn-primary" data-project-action="timer" data-project-id="${escapeHtml(p.id)}">${tr('timer')}</button>
              <button type="button" class="btn" data-project-action="edit" data-project-id="${escapeHtml(p.id)}">${tr('edit')}</button>
              <button type="button" class="btn" data-project-action="delete" data-project-id="${escapeHtml(p.id)}">${tr('delete')}</button>
            </div>
          </article>`;
        })
        .join('')
    : `<div class="clients-empty" style="grid-column:1/-1"><p>${tr('noProjectsMatch')}</p></div>`;

  root.innerHTML = `
    <div class="projects-panel">
      <div class="projects-toolbar">
        <input type="search" class="search" id="projectsSearch" placeholder="${tr('searchProjects')}" value="${escapeHtml(state.projects.query)}" />
        <select id="projectsFilter" aria-label="${tr('project')}">
          <option value="all"${state.projects.statusFilter === 'all' ? ' selected' : ''}>${tr('filterAll')}</option>
          <option value="active"${state.projects.statusFilter === 'active' ? ' selected' : ''}>${tr('filterActive')}</option>
          <option value="review"${state.projects.statusFilter === 'review' ? ' selected' : ''}>${tr('filterInReview')}</option>
          <option value="on-hold"${state.projects.statusFilter === 'on-hold' ? ' selected' : ''}>${tr('filterOnHold')}</option>
          <option value="done"${state.projects.statusFilter === 'done' ? ' selected' : ''}>${tr('filterDone')}</option>
        </select>
        <select id="projectsSort" aria-label="${tr('project')}">
          <option value="name-asc"${state.projects.sortBy === 'name-asc' ? ' selected' : ''}>${tr('sortNameAsc')}</option>
          <option value="name-desc"${state.projects.sortBy === 'name-desc' ? ' selected' : ''}>${tr('sortNameDesc')}</option>
          <option value="deadline"${state.projects.sortBy === 'deadline' ? ' selected' : ''}>${tr('sortDeadline')}</option>
          <option value="progress-desc"${state.projects.sortBy === 'progress-desc' ? ' selected' : ''}>${tr('sortProgress')}</option>
        </select>
        <button type="button" class="btn btn-primary" id="btnNewProject">${tr('plusNewProject')}</button>
      </div>
      <div class="projects-grid">${cards}</div>
    </div>
  `;

  $('projectsSearch')?.addEventListener('input', e => {
    state.projects.query = e.target.value;
    renderProjects();
  });
  $('projectsFilter')?.addEventListener('change', e => {
    state.projects.statusFilter = e.target.value;
    renderProjects();
  });
  $('projectsSort')?.addEventListener('change', e => {
    state.projects.sortBy = e.target.value;
    renderProjects();
  });
  $('btnNewProject')?.addEventListener('click', openProjectModal);

  root.querySelectorAll('[data-project-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const project = state.projects.items.find(p => p.id === btn.dataset.projectId);
      if (!project) return;
      const action = btn.dataset.projectAction;
      if (action === 'open') {
        openProjectWorkspace(project);
      } else if (action === 'timer') {
        startProjectTimer(project);
      } else if (action === 'edit') {
        openProjectModal(project);
      } else if (action === 'delete') {
        if (confirm(`Delete "${project.name}"?\n\nTasks and sessions for this project will also be removed.`)) {
          void invoke('tracker_delete_project', { id: project.id }).catch(err => console.warn(err));
          removeProjectLocal(project.id);
          refreshChrome();
          renderProjects();
          const sub = $('pageSub');
          if (sub) sub.textContent = `${state.projects.items.filter(p => p.status !== 'done').length} active projects — cards with progress and quick timer.`;
        }
      }
    });
  });
}

function openProjectModal(project = null) {
  const modal = $('projectModal');
  const select = $('pClient');
  if (!modal) return;
  state.projects.editingId = project?.id || null;
  const title = $('projectModalTitle');
  const saveBtn = $('projectModalSave');
  const subtitle = modal.querySelector('.modal__head p');
  if (title) title.textContent = project ? tr('editProject') : tr('newProjectTitle');
  if (saveBtn) saveBtn.textContent = project ? tr('saveChanges') : tr('addProject');
  if (subtitle) {
    subtitle.textContent = project ? tr('projectModalSubtitleEdit') : tr('projectModalSubtitleNew');
  }
  syncProjectModalLabels();
  if (select) {
    const clients = state.clients.items.filter(c => !c.archived);
    select.innerHTML = clients
      .map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.company)}</option>`)
      .join('');
  }
  $('projectForm')?.reset();
  if (project) {
    $('pName').value = project.name || '';
    $('pClient').value = project.clientId || '';
    $('pCategory').value = project.category || '';
    $('pEstimated').value = Math.round((project.estimatedMin || 0) / 60) || '';
    $('pDeadline').value = project.deadline || '';
    if ($('pStatus')) $('pStatus').value = project.status || 'active';
  } else if ($('pStatus')) {
    $('pStatus').value = 'active';
  }
  populateSelectOptions($('pStatus'), PROJECT_STATUS_OPTIONS, $('pStatus')?.value || 'active');
  modal.hidden = false;
  $('pName')?.focus();
}

function closeProjectModal() {
  const modal = $('projectModal');
  state.projects.editingId = null;
  if (modal) modal.hidden = true;
}

async function saveProject() {
  const form = $('projectForm');
  if (!form || !form.reportValidity()) return;
  const fd = new FormData(form);
  const name = String(fd.get('name') || '').trim();
  const clientId = String(fd.get('clientId') || '');
  const client = state.clients.items.find(c => c.id === clientId);
  if (!name || !client) return;
  const existing = state.projects.editingId
    ? state.projects.items.find(p => p.id === state.projects.editingId)
    : null;
  const estimatedH = Number(fd.get('estimated')) || 20;
  const deadline = String(fd.get('deadline') || '') || new Date().toISOString().slice(0, 10);
  const status = String(fd.get('status') || existing?.status || 'active');
  if (existing && status === 'done' && existing.status !== 'done') {
    const choice = await askCompleteProjectChoice();
    if (choice === 'cancel') return;
    if (choice === 'move-tasks') {
      await moveProjectTasksToCompleted(existing.id);
    }
  }
  const accents = LOGO_COLORS;
  const project = {
    id: existing?.id || `p${Date.now()}`,
    name,
    clientId,
    client: client.company,
    category: String(fd.get('category') || '').trim() || 'General',
    status,
    progress: existing?.progress || 0,
    workedMin: existing?.workedMin || 0,
    estimatedMin: estimatedH * 60,
    deadline,
    accent: existing?.accent || accents[Math.floor(Math.random() * accents.length)]
  };
  await persistProject(project);
  if (existing) {
    Object.assign(existing, project);
  } else {
    state.projects.items.unshift(project);
  }
  if (status === 'done' && state.timer.projectId === project.id) {
    state.timer.projectId = preferredActiveProjectId();
  }
  state.projects.query = '';
  closeProjectModal();
  refreshChrome();
  if (state.page === 'board') renderBoard();
  else if (state.projects.detailId === project.id) setPage('project-detail');
  else setPage('projects');
}

function getFilteredTasks() {
  const { items, query, projectFilter } = state.board;
  const projectIds = new Set(state.projects.items.map(p => p.id));
  const q = query.trim().toLowerCase();
  return items.filter(t => {
    if (!projectIds.has(t.projectId)) return false;
    if (projectFilter !== 'all' && t.projectId !== projectFilter) return false;
    if (!q) return true;
    const hay = [t.title, t.project, t.client].join(' ').toLowerCase();
    return hay.includes(q);
  });
}

function renderTaskCard(task) {
  const overdue = isOverdue(task.deadline) && task.column !== 'completed';
  const dragging = state.board.draggingId === task.id;
  return `<article class="kanban-card${dragging ? ' is-dragging' : ''}" data-task-id="${escapeHtml(task.id)}">
    <div class="kanban-card__top">
      <span class="priority-pill is-${escapeHtml(task.priority)}">${escapeHtml(priorityLabel(task.priority))}</span>
      <span class="kanban-card__hours">${escapeHtml(formatMinutes(task.workedMin))} / ${escapeHtml(formatMinutes(task.estimatedMin))}</span>
    </div>
    <h4>${escapeHtml(task.title)}</h4>
    <p class="kanban-card__project">${escapeHtml(task.project)}</p>
    <p class="kanban-card__client">${escapeHtml(task.client)}</p>
    <div class="kanban-card__foot${overdue ? ' is-overdue' : ''}">
      <span>${overdue ? tr('overduePrefix') : ''}${escapeHtml(formatDeadline(task.deadline))}</span>
    </div>
  </article>`;
}

function renderBoard() {
  const root = $('page-board');
  if (!root) return;
  const filtered = getFilteredTasks();
  const columns = BOARD_COLUMNS.map(col => {
    const tasks = filtered.filter(t => t.column === col.id);
    return `<section class="kanban-col" data-column="${escapeHtml(col.id)}">
      <div class="kanban-col__head">
        <h3>${escapeHtml(tr(col.labelKey))}</h3>
        <span class="kanban-col__count">${tasks.length}</span>
      </div>
      <div class="kanban-col__body" data-drop-zone="${escapeHtml(col.id)}">
        ${tasks.map(renderTaskCard).join('')}
      </div>
    </section>`;
  }).join('');

  const projectOptions = [
    `<option value="all"${state.board.projectFilter === 'all' ? ' selected' : ''}>${tr('allProjects')}</option>`,
    ...state.projects.items.map(p => {
      const suffix = p.status === 'done' ? ` (${tr('statusDone')})` : '';
      return `<option value="${escapeHtml(p.id)}"${state.board.projectFilter === p.id ? ' selected' : ''}>${escapeHtml(p.name + suffix)}</option>`;
    })
  ].join('');

  const filteredProject =
    state.board.projectFilter !== 'all'
      ? state.projects.items.find(p => p.id === state.board.projectFilter)
      : null;
  let boardExtraHint = '';
  if (filteredProject?.status === 'done') {
    boardExtraHint = tr('boardProjectCompletedHint');
  } else if (state.projects.items.length && !state.projects.items.some(p => p.status !== 'done')) {
    boardExtraHint = tr('boardNoActiveProjects');
  }
  const boardHintHtml = boardExtraHint
    ? `${escapeHtml(tr('boardHelperHint'))}<br>${escapeHtml(boardExtraHint)}`
    : escapeHtml(tr('boardHelperHint'));

  root.innerHTML = `
    <div class="board-panel">
      <div class="board-toolbar">
        <input type="search" class="search" id="boardSearch" placeholder="${tr('searchTasks')}" value="${escapeHtml(state.board.query)}" />
        <select id="boardProjectFilter" aria-label="${tr('project')}">${projectOptions}</select>
        <button type="button" class="btn" id="btnRefreshBoard" title="${tr('refresh')}">${tr('refresh')}</button>
        <button type="button" class="btn btn-primary" id="btnNewTask">${tr('plusNewTask')}</button>
      </div>
      <p class="board-hint">${boardHintHtml}</p>
      <div class="kanban" aria-label="Task board">${columns}</div>
    </div>
  `;

  $('boardSearch')?.addEventListener('input', e => {
    state.board.query = e.target.value;
    renderBoard();
  });
  $('boardProjectFilter')?.addEventListener('change', e => {
    state.board.projectFilter = e.target.value;
    renderBoard();
  });
  $('btnRefreshBoard')?.addEventListener('click', async () => {
    await bootstrapTracker();
    refreshChrome();
    renderBoard();
  });
  $('btnNewTask')?.addEventListener('click', openTaskModal);
  bindBoardPointerDrag(root);
}

function bindBoardPointerDrag(root) {
  let activeTaskId = null;

  const clearHighlight = () => {
    root.querySelectorAll('.kanban-col').forEach(col => col.classList.remove('is-drag-over'));
  };

  const columnAt = (x, y) => {
    const el = document.elementFromPoint(x, y);
    return el?.closest('[data-drop-zone]')?.dataset?.dropZone || null;
  };

  const finishDrag = (taskId, column, card) => {
    const task = state.board.items.find(t => t.id === taskId);
    if (task && column && task.column !== column) {
      task.column = column;
      void persistTask(task);
      syncProjectStatusFromBoard(task.projectId);
      refreshChrome();
    }
    state.board.draggingId = null;
    card?.classList.remove('is-dragging');
    clearHighlight();
    renderBoard();
  };

  root.querySelectorAll('.kanban-card').forEach(card => {
    card.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      activeTaskId = card.dataset.taskId;
      state.board.draggingId = activeTaskId;
      card.classList.add('is-dragging');
      card.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    card.addEventListener('pointermove', e => {
      if (!activeTaskId || !card.hasPointerCapture(e.pointerId)) return;
      clearHighlight();
      const col = columnAt(e.clientX, e.clientY);
      if (col) {
        root.querySelector(`[data-drop-zone="${col}"]`)?.closest('.kanban-col')?.classList.add('is-drag-over');
      }
    });

    card.addEventListener('pointerup', e => {
      if (!activeTaskId) return;
      const col = columnAt(e.clientX, e.clientY);
      finishDrag(activeTaskId, col, card);
      activeTaskId = null;
      try {
        card.releasePointerCapture(e.pointerId);
      } catch (_) {
        /* ignore */
      }
    });

    card.addEventListener('pointercancel', () => {
      activeTaskId = null;
      state.board.draggingId = null;
      card.classList.remove('is-dragging');
      clearHighlight();
    });
  });
}

function openTaskModal() {
  const modal = $('taskModal');
  const projectSelect = $('tProject');
  const columnSelect = $('tColumn');
  const saveBtn = $('taskModalSave');
  if (!modal) return;
  syncTaskModalLabels();
  const activeProjects = state.projects.items.filter(p => p.status !== 'done');
  if (projectSelect) {
    if (activeProjects.length) {
      projectSelect.innerHTML = activeProjects
        .map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`)
        .join('');
      projectSelect.disabled = false;
    } else {
      projectSelect.innerHTML = `<option value="">${escapeHtml(tr('boardNoActiveProjects'))}</option>`;
      projectSelect.disabled = true;
    }
  }
  if (saveBtn) saveBtn.disabled = activeProjects.length === 0;
  if (columnSelect) {
    columnSelect.innerHTML = BOARD_COLUMNS.map(
      c => `<option value="${escapeHtml(c.id)}">${escapeHtml(tr(c.labelKey))}</option>`
    ).join('');
  }
  populateSelectOptions($('tPriority'), PRIORITY_OPTIONS, 'medium');
  $('taskForm')?.reset();
  if (columnSelect) columnSelect.value = 'todo';
  if ($('tPriority')) $('tPriority').value = 'medium';
  if (projectSelect && activeProjects.length) {
    const preferred =
      state.board.projectFilter !== 'all' && activeProjects.some(p => p.id === state.board.projectFilter)
        ? state.board.projectFilter
        : activeProjects[0].id;
    projectSelect.value = preferred;
  }
  modal.hidden = false;
  $('tTitle')?.focus();
}

function closeTaskModal() {
  const modal = $('taskModal');
  if (modal) modal.hidden = true;
}

async function saveNewTask() {
  const form = $('taskForm');
  if (!form || !form.reportValidity()) return;
  const fd = new FormData(form);
  const title = String(fd.get('title') || '').trim();
  const projectId = String(fd.get('projectId') || '');
  const project = state.projects.items.find(p => p.id === projectId);
  if (!title || !project) return;
  const estimatedH = Number(fd.get('estimated')) || 2;
  const newTask = {
    id: `t${Date.now()}`,
    title,
    projectId,
    project: project.name,
    client: project.client,
    column: String(fd.get('column') || 'todo'),
    priority: String(fd.get('priority') || 'medium'),
    workedMin: 0,
    estimatedMin: Math.round(estimatedH * 60),
    deadline: String(fd.get('deadline') || '') || new Date().toISOString().slice(0, 10)
  };
  await persistTask(newTask);
  state.board.items.unshift(newTask);
  syncProjectStatusFromBoard(projectId);
  state.board.query = '';
  closeTaskModal();
  refreshChrome();
  setPage('board');
}

/** Elapsed seconds from wall clock — correct even if JS timers were throttled in background. */
function liveTimerSeconds() {
  const base = Math.max(0, Math.floor(state.timerSeconds || 0));
  if (!state.timerRunning || !state.timerRunStartedAt) return base;
  const extra = Math.max(0, Math.floor((Date.now() - state.timerRunStartedAt) / 1000));
  return base + extra;
}

function freezeLiveTimer() {
  state.timerSeconds = liveTimerSeconds();
  state.timerRunStartedAt = null;
}

async function saveCurrentSession() {
  await ensureTimerRolledThroughToday();
  return commitTimerSession();
}

let stopTimerInFlight = null;

/** Stop = close session once. Further Stop/mini echoes are ignored until done. */
function stopTimer(reset = true) {
  if (stopTimerInFlight) return stopTimerInFlight;
  stopTimerInFlight = (async () => {
    try {
      state.timerRunning = false;
      stopTick();
      await saveCurrentSession();
      state.timerRunStartedAt = null;
      state.timer.pauseStartedAt = null;
      if (reset) {
        state.timerSeconds = 0;
        state.timer.dayStart = '';
        state.timer.pauseAccumSec = 0;
      }
      applyTimerContext();
      syncTimerUi();
      refreshAfterSessionChange();
    } finally {
      stopTimerInFlight = null;
    }
  })();
  return stopTimerInFlight;
}

function timerStart() {
  const today = todayIsoDate();
  if (state.timer.day && state.timer.day !== today && timerHasOpenSession()) {
    void rolloverTimerAtMidnight();
    return;
  }
  finalizeOpenPause();
  state.timer.day = today;
  // Start after Stop → new session. Resume after Pause keeps the same dayStart.
  if (!state.timer.dayStart) state.timer.dayStart = clockNow();
  if (!state.timerRunning) {
    state.timerRunning = true;
    state.timerRunStartedAt = Date.now();
  } else if (!state.timerRunStartedAt) {
    state.timerRunStartedAt = Date.now();
  }
  syncTimerUi();
  startTick();
}

function timerResume() {
  timerStart();
}

function timerPause() {
  freezeLiveTimer();
  state.timerRunning = false;
  state.timer.pauseStartedAt = Date.now();
  syncTimerUi();
  stopTick();
  if (timerHasOpenSession()) startPausedWatch();
}

function updateTimerSessionsPanel() {
  const panel = $('timerSessionsPanel');
  if (!panel) return;
  panel.innerHTML = `
    ${renderSessionBlock('today', tr('todaySessions'))}
    ${renderSessionBlock('week', tr('thisWeek'))}
    ${renderSessionBlock('month', tr('thisMonth'))}
  `;
  bindSessionActions(panel);
  const sub = $('pageSub');
  if (sub && state.page === 'timer') {
    sub.textContent = tr('timerSub', { n: formatMinutes(sumSessionMinutes('today')) });
  }
}


function liveTimerSecondsFloat() {
  const base = Math.max(0, Number(state.timerSeconds) || 0);
  if (!state.timerRunning || !state.timerRunStartedAt) return base;
  const extra = Math.max(0, (Date.now() - state.timerRunStartedAt) / 1000);
  return base + extra;
}

function timerRingGeometry(secs) {
  // example.svg proportions (viewBox 640): track mid-radius ~262.5, beads ~228
  const cx = 320;
  const cy = 320;
  const r = 262.5;
  const c = 2 * Math.PI * r;
  const raw = Number(secs) || 0;
  // One full orbit per hour; idle preview arc matches mockup when stopped at 0
  const pct =
    raw <= 0 && !state.timerRunning
      ? 0.2
      : Math.min(0.995, Math.max(0.015, (raw % 3600) / 3600));
  const offset = c * (1 - pct);
  // SVG circle path starts at 3 o'clock; rotate group -90deg so 0 is at top
  const angle = pct * 2 * Math.PI;
  const startX = cx + r;
  const startY = cy;
  const endX = cx + r * Math.cos(angle);
  const endY = cy + r * Math.sin(angle);
  return { cx, cy, r, c, offset, pct, startX, startY, endX, endY };
}

function timerBeadMarks() {
  const cx = 320;
  const cy = 320;
  const br = 227.8;
  const n = 36;
  let out = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const x = cx + br * Math.cos(a);
    const y = cy + br * Math.sin(a);
    out += `<circle class="bead" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4.2"></circle>`;
  }
  return out;
}

function timerStatusClass(running, secs) {
  if (running) return 'is-running';
  if (secs > 0) return 'is-paused';
  return 'is-stopped';
}

function applyTimerRingGeometry(g, prefix = activeRingPrefix()) {
  const ringProg = $timer(prefix + 'RingProgress');
  const ringGlow = $timer(prefix + 'RingGlow');
  const knobStart = $timer(prefix + 'RingKnobStart');
  const knobEnd = $timer(prefix + 'RingKnobEnd');
  if (ringProg) {
    ringProg.setAttribute('stroke-dasharray', g.c.toFixed(2));
    ringProg.setAttribute('stroke-dashoffset', g.offset.toFixed(2));
  }
  if (ringGlow) {
    ringGlow.setAttribute('stroke-dasharray', g.c.toFixed(2));
    ringGlow.setAttribute('stroke-dashoffset', g.offset.toFixed(2));
  }
  if (knobStart) {
    knobStart.setAttribute('cx', g.startX.toFixed(2));
    knobStart.setAttribute('cy', g.startY.toFixed(2));
  }
  if (knobEnd) {
    knobEnd.setAttribute('cx', g.endX.toFixed(2));
    knobEnd.setAttribute('cy', g.endY.toFixed(2));
  }
  const wrap = $timer(prefix + 'RingWrap');
  if (wrap) wrap.style.setProperty('--ring-pct', String(g.pct));
}

function renderTimerRing(secs, opts = {}) {
  const g = timerRingGeometry(secs);
  const prefix = opts.prefix || 'timer';
  const compact = opts.compact ? ' is-compact' : '';
  // Unique SVG paint-server ids per instance (duplicate grads break rendering).
  const gradId = prefix + 'ArcGrad';
  const blurId = prefix + 'GlowBlur';
  return `
    <div class="timer-ring-wrap${compact}" id="${prefix}RingWrap" data-ring-prefix="${prefix}" style="--ring-pct:${g.pct}">
      <div class="timer-ring-glass" aria-hidden="true"></div>
      <svg class="timer-ring-svg" viewBox="0 0 640 640" aria-hidden="true">
        <defs>
          <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#86efac" stop-opacity="0.55"/>
            <stop offset="42%" stop-color="#4ade80" stop-opacity="0.95"/>
            <stop offset="100%" stop-color="#16a34a" stop-opacity="1"/>
          </linearGradient>
          <filter id="${blurId}" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g transform="rotate(-90 320 320)">
          <circle class="ring-outer-soft" cx="320" cy="320" r="262.5"></circle>
          <circle class="ring-outer" cx="320" cy="320" r="262.5"></circle>
          <circle class="ring-inner-line" cx="320" cy="320" r="248"></circle>
          <circle class="progress-glow" id="${prefix}RingGlow" cx="320" cy="320" r="262.5"
            stroke="url(#${gradId})" filter="url(#${blurId})"
            stroke-dasharray="${g.c.toFixed(2)}" stroke-dashoffset="${g.offset.toFixed(2)}"></circle>
          <circle class="progress" id="${prefix}RingProgress" cx="320" cy="320" r="262.5"
            stroke="url(#${gradId})"
            stroke-dasharray="${g.c.toFixed(2)}" stroke-dashoffset="${g.offset.toFixed(2)}"></circle>
          <circle class="knob" id="${prefix}RingKnobStart" cx="${g.startX.toFixed(2)}" cy="${g.startY.toFixed(2)}" r="11"></circle>
          <circle class="knob" id="${prefix}RingKnobEnd" cx="${g.endX.toFixed(2)}" cy="${g.endY.toFixed(2)}" r="11"></circle>
        </g>
        ${timerBeadMarks()}
      </svg>
      <div class="timer-ring-lg__inner">
        <div class="timer-ring-lg__status ${timerStatusClass(state.timerRunning, secs)}" id="${prefix}MainStatus">
          <span class="dot" aria-hidden="true"></span>
          <span class="timer-ring-lg__status-label">${state.timerRunning ? tr('running') : secs > 0 ? tr('paused') : tr('stopped')}</span>
        </div>
        <div class="timer-ring-lg__time" id="${prefix}MainTime">${formatHms(Math.floor(secs))}</div>
        <div class="timer-ring-lg__units">${tr('timerUnits')}</div>
      </div>
    </div>
  `;
}

function activeRingPrefix() {
  return state.page === 'overview' ? 'ov' : 'timer';
}

function renderTimer() {
  const root = $('page-timer');
  if (!root) return;
  applyTimerContext();
  const { project, client, rate } = getTimerContext();
  const liveSecs = liveTimerSeconds();
  const timerCur = currencyForClient(client);
  const cost = formatMoney(computeSessionCost(liveSecs, rate), timerCur);
  const projectOptions = state.projects.items
    .filter(p => p.status !== 'done')
    .map(
      p =>
        `<option value="${escapeHtml(p.id)}"${p.id === state.timer.projectId ? ' selected' : ''}>${escapeHtml(p.name)} — ${escapeHtml(p.client)}</option>`
    )
    .join('');

  root.innerHTML = `
    <div class="timer-page">
      <div class="timer-main">
        <div class="timer-main__head">
          <div>
            <h2>${tr('timerInProgress')}</h2>
            <p>${tr('timerCardSub')}</p>
          </div>
          <button type="button" class="timer-main__settings" id="btnTimerSettings">
            <span class="timer-ico" style="--ico:url('./asset/setting.svg')" aria-hidden="true"></span>
            <span>${tr('navSettings')}</span>
          </button>
        </div>
        <div class="timer-main__select">
          <label class="timer-main__select-label" for="timerProjectSelect">${tr('currentProject')}</label>
          <div class="timer-project-picker">
            <span class="timer-project-picker__mark" aria-hidden="true">
              <span class="timer-ico" style="--ico:url('./asset/project.svg')"></span>
            </span>
            <select id="timerProjectSelect">${projectOptions}</select>
            <span class="timer-ico timer-project-picker__chevron" style="--ico:url('./asset/chevron-down.svg')" aria-hidden="true"></span>
          </div>
        </div>
        ${renderTimerRing(liveSecs, { prefix: 'timer' })}
        <div class="timer-main__actions">
          <button type="button" class="btn btn-primary" id="btnTimerStart"${state.timerRunning || liveSecs > 0 ? ' hidden' : ''}>
            <span class="timer-ico" style="--ico:url('./asset/play.svg')" aria-hidden="true"></span>
            <span class="timer-btn-label">${tr('start')}</span>
          </button>
          <button type="button" class="btn" id="btnTimerPause"${state.timerRunning ? '' : ' hidden'}>
            <span class="timer-ico" style="--ico:url('./asset/pause.svg')" aria-hidden="true"></span>
            <span class="timer-btn-label">${tr('pause')}</span>
          </button>
          <button type="button" class="btn btn-primary" id="btnTimerResume"${!state.timerRunning && liveSecs > 0 ? '' : ' hidden'}>
            <span class="timer-ico" style="--ico:url('./asset/play.svg')" aria-hidden="true"></span>
            <span class="timer-btn-label">${tr('resume')}</span>
          </button>
          <button type="button" class="btn" id="btnTimerStop">
            <span class="timer-ico" style="--ico:url('./asset/stop.svg')" aria-hidden="true"></span>
            <span class="timer-btn-label">${tr('stop')}</span>
          </button>
        </div>
        <div class="timer-main__links">
          <button type="button" id="btnTimerMini">
            <span class="timer-ico" style="--ico:url('./asset/time_tracker.svg')" aria-hidden="true"></span>
            <span>${tr('openMiniTimerLink')}</span>
          </button>
          <span class="timer-main__links-sep" aria-hidden="true"></span>
          <button type="button" id="btnTimerCloseMini">
            <span class="timer-ico" style="--ico:url('./asset/time_tracker.svg')" aria-hidden="true"></span>
            <span>${tr('closeMiniTimerLink')}</span>
          </button>
          <span class="timer-main__links-sep" aria-hidden="true"></span>
          <button type="button" id="btnManualEntry">
            <span class="timer-ico" style="--ico:url('./asset/session.svg')" aria-hidden="true"></span>
            <span>${tr('manualEntry')}</span>
          </button>
        </div>
      </div>
      <div class="timer-side">
        <div class="timer-meta-card">
          <h3>${tr('currentSession')}</h3>
          <dl>
            <dt>${tr('project')}</dt><dd id="timerMetaProject">${escapeHtml(project?.name || MOCK.project)}</dd>
            <dt>${tr('client')}</dt><dd id="timerMetaClient">${escapeHtml(client?.company || MOCK.client)}</dd>
            <dt>${tr('hourlyRate')}</dt><dd id="timerMetaRate">${escapeHtml(formatRate(rate, timerCur))}</dd>
            <dt>${tr('accumulated')}</dt><dd id="timerMainCost">${escapeHtml(cost)}</dd>
          </dl>
        </div>
        <div id="timerSessionsPanel">
          ${renderSessionBlock('today', tr('todaySessions'))}
          ${renderSessionBlock('week', tr('thisWeek'))}
          ${renderSessionBlock('month', tr('thisMonth'))}
        </div>
      </div>
    </div>
  `;

  $('timerProjectSelect')?.addEventListener('change', e => {
    const nextId = e.target.value;
    if (nextId !== state.timer.projectId && (liveTimerSeconds() > 0 || state.timer.dayStart)) {
      void commitTimerSession().then(() => {
        state.timer.projectId = nextId;
        state.timer.dayStart = '';
        state.timer.pauseAccumSec = 0;
        state.timer.pauseStartedAt = null;
        applyTimerContext();
        syncTimerUi();
        refreshAfterSessionChange();
      });
      return;
    }
    state.timer.projectId = nextId;
    state.timer.dayStart = '';
    applyTimerContext();
    syncTimerUi();
    const metaProject = $('timerMetaProject');
    const metaClient = $('timerMetaClient');
    const metaRate = $('timerMetaRate');
    const ctx = getTimerContext();
    if (metaProject) metaProject.textContent = ctx.project?.name || '';
    if (metaClient) metaClient.textContent = ctx.client?.company || '';
    if (metaRate) metaRate.textContent = formatRate(ctx.rate, currencyForClient(ctx.client));
  });
  $('btnTimerSettings')?.addEventListener('click', () => setPage('settings'));
  $('btnTimerStart')?.addEventListener('click', timerStart);
  $('btnTimerPause')?.addEventListener('click', timerPause);
  $('btnTimerResume')?.addEventListener('click', timerResume);
  $('btnTimerStop')?.addEventListener('click', () => stopTimer(true));
  $('btnTimerMini')?.addEventListener('click', () => void openMini());
  $('btnTimerCloseMini')?.addEventListener('click', () => void closeMini());
  $('btnManualEntry')?.addEventListener('click', openManualEntryModal);
  bindSessionActions($('timerSessionsPanel'));
}

function openManualEntryModal() {
  openSessionEditor({
    projectId: state.timer.projectId,
    date: todayIsoDate(),
    breakMin: 0,
    description: ''
  });
}

function closeManualEntryModal() {
  const modal = $('manualEntryModal');
  state.sessionEditor.editingId = null;
  if (modal) modal.hidden = true;
}

function manualEntrySpanSec() {
  return spanSeconds(clockFieldValue('mStart'), clockFieldValue('mEnd'));
}

function validateManualEntryBreak(breakSec, spanSec) {
  if (breakSec > 0 && spanSec != null && breakSec > spanSec) {
    alert('Break cannot be longer than the time between start and end.');
    return false;
  }
  return true;
}

function breakSecFromInput() {
  return parseClockToSeconds(clockFieldValue('mBreak')) ?? 0;
}

function fixedClockDigits(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 6);
}

function fixedClockSlotsFromDigits(digits) {
  const slots = '000000'.split('');
  const d = fixedClockDigits(digits);
  for (let i = 0; i < d.length && i < 6; i++) slots[i] = d[i];
  return slots;
}

function fixedClockDigitsFromSlots(slots) {
  return slots.join('').slice(0, 6);
}

function fixedClockMaskFromSlots(slots) {
  return `${slots[0]}${slots[1]}/${slots[2]}${slots[3]}/${slots[4]}${slots[5]}`;
}

function fixedClockMaskDisplay(digits) {
  return fixedClockMaskFromSlots(fixedClockSlotsFromDigits(digits));
}

function fixedClockValueFromDigits(digits) {
  const d = fixedClockDigits(digits);
  if (!d) return '';
  const padded = d.padEnd(6, '0');
  return `${padded.slice(0, 2)}:${padded.slice(2, 4)}:${padded.slice(4, 6)}`;
}

function fixedClockDigitIndexFromCursor(pos) {
  const p = Math.max(0, Math.min(7, Number(pos) || 0));
  if (p <= 1) return p;
  if (p === 2) return 2;
  if (p <= 4) return p - 1;
  if (p === 5) return 4;
  return p - 2;
}

function fixedClockCursorFromDigitIndex(idx) {
  const i = Math.max(0, Math.min(5, idx));
  if (i <= 1) return i;
  if (i <= 3) return i + 1;
  return i + 2;
}

function getFixedClockDigits(el) {
  return el?.dataset.clockDigits || '';
}

function isFixedClockAllZeros(digits) {
  return !fixedClockDigits(digits) || /^0+$/.test(fixedClockDigits(digits));
}

function applyFixedClockDisplay(el, digits, { empty = false } = {}) {
  if (!el) return;
  el.dataset.clockDigits = fixedClockDigits(digits);
  el.dataset.clockEmpty = empty ? '1' : '0';
  el.value = fixedClockMaskDisplay(el.dataset.clockDigits);
}

function clockFieldValue(id) {
  const el = $(id);
  if (!el) return '';
  if (el.dataset.clockEmpty === '1') return '';
  const d = getFixedClockDigits(el);
  if (!d) return '';
  const normalized = normalizeClockString(fixedClockValueFromDigits(d));
  return normalized || '';
}

function setManualClockField(id, value) {
  const el = $(id);
  if (!el) return;
  const normalized = value ? normalizeClockString(value) || '' : '';
  if (!normalized) {
    el.dataset.clockDigits = '';
    el.dataset.clockEmpty = '1';
    el.value = '';
    return;
  }
  const digits = normalized.replace(/\D/g, '').slice(0, 6).padEnd(6, '0');
  applyFixedClockDisplay(el, digits, { empty: false });
}

function bindFixedClockInput(el, syncFn) {
  if (!el || el.dataset.fixedClockBound) return;
  el.dataset.fixedClockBound = '1';

  const renderMask = (selectIdx = 0) => {
    const d = getFixedClockDigits(el);
    el.value = fixedClockMaskDisplay(d);
    const idx = Math.max(0, Math.min(5, selectIdx));
    const pos = fixedClockCursorFromDigitIndex(idx);
    requestAnimationFrame(() => el.setSelectionRange(pos, pos + 1));
  };

  el.addEventListener('focus', () => {
    el.dataset.clockEmpty = '0';
    renderMask(0);
  });

  el.addEventListener('keydown', e => {
    if (e.key === 'Tab') return;
    if (e.ctrlKey || e.metaKey) return;

    const idx = fixedClockDigitIndexFromCursor(el.selectionStart ?? 0);

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      renderMask(Math.max(0, idx - 1));
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      renderMask(Math.min(5, idx + 1));
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      renderMask(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      renderMask(5);
      return;
    }

    if (e.key.length === 1 && /\d/.test(e.key)) {
      e.preventDefault();
      const slots = fixedClockSlotsFromDigits(getFixedClockDigits(el));
      slots[idx] = e.key;
      applyFixedClockDisplay(el, fixedClockDigitsFromSlots(slots), { empty: false });
      renderMask(Math.min(idx + 1, 5));
      syncFn();
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      const d = fixedClockDigits(getFixedClockDigits(el));
      if (!d.length) {
        renderMask(0);
        syncFn();
        return;
      }
      const slots = fixedClockSlotsFromDigits(d);
      const clearIdx = Math.min(idx, Math.max(0, d.length - 1));
      slots[clearIdx] = '0';
      let nextDigits = fixedClockDigitsFromSlots(slots).replace(/0+$/, '');
      if (nextDigits && /^0+$/.test(nextDigits)) nextDigits = '';
      applyFixedClockDisplay(el, nextDigits, { empty: !nextDigits });
      renderMask(Math.max(0, clearIdx - 1));
      syncFn();
      return;
    }

    if (e.key === 'Delete') {
      e.preventDefault();
      applyFixedClockDisplay(el, '', { empty: true });
      renderMask(0);
      syncFn();
      return;
    }

    if (e.key.length === 1) e.preventDefault();
  });

  el.addEventListener('paste', e => {
    e.preventDefault();
    const text = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    applyFixedClockDisplay(el, text, { empty: !text });
    renderMask(Math.min(text.length, 5));
    syncFn();
  });

  el.addEventListener('click', () => {
    requestAnimationFrame(() => {
      const idx = fixedClockDigitIndexFromCursor(el.selectionStart ?? 0);
      renderMask(idx);
    });
  });

  el.addEventListener('select', () => {
    requestAnimationFrame(() => {
      if (el.selectionStart !== el.selectionEnd) return;
      const idx = fixedClockDigitIndexFromCursor(el.selectionStart ?? 0);
      renderMask(idx);
    });
  });

  el.addEventListener('blur', () => {
    normalizeManualEntryClockField(el.id);
    syncFn();
  });
}

function normalizeManualEntryClockField(id) {
  const el = $(id);
  if (!el) return;
  if (el.dataset.clockEmpty === '1') {
    if (id === 'mBreak') setManualClockField(id, '00:00:00');
    else setManualClockField(id, '');
    return;
  }
  const d = getFixedClockDigits(el);
  if (!d) {
    if (id === 'mBreak') setManualClockField(id, '00:00:00');
    else setManualClockField(id, '');
    return;
  }
  const normalized = normalizeClockString(fixedClockValueFromDigits(d));
  if (normalized) {
    setManualClockField(id, normalized);
    return;
  }
  if (id === 'mBreak') setManualClockField(id, '00:00:00');
  else setManualClockField(id, '');
}

function syncManualEntryBillableFromWindow() {
  const start = clockFieldValue('mStart');
  const end = clockFieldValue('mEnd');
  let breakSec = breakSecFromInput();
  const spanSec = spanSeconds(start, end);
  if (spanSec == null) {
    if ($('mHours')) $('mHours').value = 0;
    if ($('mMinutes')) $('mMinutes').value = 0;
    return false;
  }
  if (breakSec > spanSec) {
    breakSec = spanSec;
    setManualClockField('mBreak', formatClockValueSec(spanSec));
  }
  const billable = Math.max(0, spanSec - breakSec);
  if ($('mHours')) $('mHours').value = Math.floor(billable / 3600);
  if ($('mMinutes')) $('mMinutes').value = Math.floor((billable % 3600) / 60);
  return true;
}

async function saveManualEntry() {
  const form = $('manualEntryForm');
  if (!form) return;
  const projectId = String($('mProject')?.value || '');
  const project = state.projects.items.find(p => p.id === projectId);
  if (!project) {
    alert('Select a project.');
    return;
  }

  normalizeManualEntryClockField('mStart');
  normalizeManualEntryClockField('mEnd');
  normalizeManualEntryClockField('mBreak');
  syncManualEntryBillableFromWindow();

  const start = clockFieldValue('mStart');
  const end = clockFieldValue('mEnd');
  const breakMin = breakSecFromInput();

  if (!start || !end) {
    alert('Enter both start and end times.');
    return;
  }

  const spanSec = spanSeconds(start, end);
  if (spanSec == null || spanSec < 1) {
    alert('End must be after start.');
    return;
  }
  if (!validateManualEntryBreak(breakMin, spanSec)) return;

  const durationMin = spanSec - breakMin;
  if (durationMin < 1) {
    alert('No billable time left after break. Reduce break or widen start/end.');
    return;
  }
  const rateRaw = $('mRate')?.value;
  const rate =
    rateRaw !== '' && rateRaw != null && Number.isFinite(Number(rateRaw))
      ? Math.max(0, Number(rateRaw))
      : undefined;
  const note = String($('mNote')?.value || '').trim();
  const startDate = $('mDate')?.value || todayIsoDate();

  const editingId = state.sessionEditor.editingId;
  const previous =
    editingId ? state.timer.sessions.find(s => s.id === editingId) : null;
  const previousProjectId = previous?.projectId || null;

  if (!editingId && manualEntrySpansOvernight(start, end)) {
    const startSec = parseClockToSeconds(start);
    const endSec = parseClockToSeconds(end);
    const span1 = 24 * 3600 - startSec;
    const span2 = endSec;
    const [break1, break2] = splitOvernightBreakSec(breakMin, span1, span2);
    const dur1 = span1 - break1;
    const dur2 = span2 - break2;
    if (dur1 < 1 && dur2 < 1) {
      alert('No billable time left after break. Reduce break or widen start/end.');
      return;
    }
    const stamp = Date.now();
    if (dur1 >= 1) {
      await upsertSessionLocal(
        {
          id: `s${stamp}-1`,
          projectId: project.id,
          project: project.name,
          client: project.client,
          date: startDate,
          start,
          end: '24:00:00',
          breakMin: break1,
          description: note,
          durationMin: dur1,
          ...(rate != null ? { rate } : {})
        },
        { isNew: true }
      );
    }
    if (dur2 >= 1) {
      await upsertSessionLocal(
        {
          id: `s${stamp}-2`,
          projectId: project.id,
          project: project.name,
          client: project.client,
          date: addDaysToIsoDate(startDate, 1),
          start: '00:00:00',
          end,
          breakMin: break2,
          description: note,
          durationMin: dur2,
          ...(rate != null ? { rate } : {})
        },
        { isNew: true }
      );
    }
    closeManualEntryModal();
    refreshAfterSessionChange();
    if (state.page !== 'project-detail' && state.page !== 'timer' && state.page !== 'sessions') {
      setPage('timer');
    }
    return;
  }

  // If editing and project changed → save edits, then reassign the same session row.
  if (editingId && previousProjectId && previousProjectId !== project.id) {
    const payloadForMove = {
      ...previous,
      ...{
        date: $('mDate')?.value || previous.date || todayIsoDate(),
        start,
        end,
        breakMin,
        description: String($('mNote')?.value || '').trim(),
        durationMin,
        ...(rate != null ? { rate } : {})
      }
    };
    await upsertSessionLocal(payloadForMove, { isNew: false });
    await moveSessionToProject(editingId, project.id);
    closeManualEntryModal();
    refreshAfterSessionChange();
    return;
  }

  const payload = {
    id: editingId || `s${Date.now()}`,
    projectId: project.id,
    project: project.name,
    client: project.client,
    date: $('mDate')?.value || todayIsoDate(),
    start,
    end,
    breakMin,
    description: String($('mNote')?.value || '').trim(),
    durationMin,
    ...(rate != null ? { rate } : {})
  };
  await upsertSessionLocal(payload, {
    isNew: !editingId,
    previousProjectId
  });
  closeManualEntryModal();
  refreshAfterSessionChange();
  if (state.page !== 'project-detail' && state.page !== 'timer' && state.page !== 'sessions') {
    setPage('timer');
  }
}

function formatReportDate(value) {
  return formatDisplayDate(value);
}

function reportPeriodLabel() {
  return `${formatReportDate(state.reports.dateFrom)} – ${formatReportDate(state.reports.dateTo)}`;
}

function reportScopeLabels() {
  const clientLabel =
    state.reports.clientId === 'all'
      ? tr('allClients')
      : state.clients.items.find(c => c.id === state.reports.clientId)?.company || tr('client');
  const projectLabel =
    state.reports.projectId === 'all'
      ? tr('allProjects')
      : state.projects.items.find(p => p.id === state.reports.projectId)?.name || tr('project');
  return { clientLabel, projectLabel };
}

/** Single client for report contact (selected client, or client of selected project). */
function reportMoneyCurrency(entries) {
  const scoped = reportCustomerClient();
  if (scoped) return currencyForClient(scoped);
  const codes = [...new Set((entries || []).map(e => e.currency).filter(Boolean))];
  if (codes.length === 1) return codes[0];
  return getStudioCurrency();
}

function reportCustomerClient() {
  if (state.reports.clientId !== 'all') {
    return state.clients.items.find(c => c.id === state.reports.clientId) || null;
  }
  if (state.reports.projectId !== 'all') {
    const proj = state.projects.items.find(p => p.id === state.reports.projectId);
    return state.clients.items.find(c => c.id === proj?.clientId) || null;
  }
  return null;
}

function looksLikeClock(value) {
  return /^\d{1,2}[:.]\d{2}/.test(String(value || '').trim());
}

function formatClock(value) {
  return formatClockDisplay(value);
}

/** Resolve project/client for a session row (orphans return null project/client). */
function resolveSessionContext(session) {
  const proj =
    (session.projectId && state.projects.items.find(p => p.id === session.projectId)) ||
    state.projects.items.find(p => p.name === session.project);
  const client = proj
    ? state.clients.items.find(c => c.id === proj.clientId)
    : state.clients.items.find(c => c.company === session.client);
  return { session, project: proj || null, client: client || null };
}

function sortSessionRows(rows) {
  return rows.slice().sort((a, b) => {
    const da = String(a.session.date || '');
    const db = String(b.session.date || '');
    if (db !== da) return db.localeCompare(da);
    const sa = parseClockToMinutes(a.session.start) ?? -1;
    const sb = parseClockToMinutes(b.session.start) ?? -1;
    if (sb !== sa) return sb - sa;
    return String(b.session.id || '').localeCompare(String(a.session.id || ''));
  });
}

/** Filter sessions for the Sessions view (includes orphans; empty dates = no date limit). */
function filterSessions(criteria = state.sessionsView) {
  const { clientId, projectId, dateFrom, dateTo, query } = criteria;
  const q = String(query || '').trim().toLowerCase();
  const rows = [];

  state.timer.sessions.forEach(s => {
    const ctx = resolveSessionContext(s);
    const { project, client } = ctx;

    if (clientId !== 'all') {
      const wantedClient = state.clients.items.find(c => c.id === clientId);
      if (!wantedClient) return;
      const clientMatch =
        (client && client.id === clientId) || s.client === wantedClient.company;
      if (!clientMatch) return;
    }
    if (projectId !== 'all') {
      const wantedProject = state.projects.items.find(p => p.id === projectId);
      if (!wantedProject) return;
      const projectMatch =
        (project && project.id === projectId) || s.project === wantedProject.name;
      if (!projectMatch) return;
    }

    const iso = String(s.date || '').trim();
    if (iso && dateFrom && iso < dateFrom) return;
    if (iso && dateTo && iso > dateTo) return;

    if (q) {
      const clientLabel = client?.company || s.client || '';
      const projectLabel = project?.name || s.project || '';
      const hay = [clientLabel, projectLabel, s.description || ''].join(' ').toLowerCase();
      if (!hay.includes(q)) return;
    }

    rows.push(ctx);
  });

  return sortSessionRows(rows);
}

function projectsForSessionsFilter() {
  if (state.sessionsView.clientId === 'all') return state.projects.items;
  return state.projects.items.filter(p => p.clientId === state.sessionsView.clientId);
}

function computeSessionsSummary(rows) {
  const count = rows.length;
  const totalSec = rows.reduce((sum, r) => sum + sessionDurationSec(r.session), 0);
  const currencies = new Set();
  rows.forEach(r => {
    const cur = r.client ? currencyForClient(r.client) : getStudioCurrency();
    currencies.add(cur);
  });

  let valueLabel;
  if (currencies.size <= 1) {
    const cur = currencies.size === 1 ? [...currencies][0] : getStudioCurrency();
    const totalValue = rows.reduce((sum, r) => sum + (Number(r.session.cost) || 0), 0);
    valueLabel = formatMoney(totalValue, cur);
  } else {
    valueLabel = tr('mixedCurrencies');
  }

  return {
    count,
    totalHours: formatHmsDisplay(totalSec),
    valueLabel
  };
}

function renderSessions() {
  const root = $('page-sessions');
  if (!root) return;

  if (
    state.sessionsView.projectId !== 'all' &&
    !projectsForSessionsFilter().some(p => p.id === state.sessionsView.projectId)
  ) {
    state.sessionsView.projectId = 'all';
  }

  const rows = filterSessions();
  const summary = computeSessionsSummary(rows);

  const clientOptions = [
    `<option value="all"${state.sessionsView.clientId === 'all' ? ' selected' : ''}>${tr('allClients')}</option>`,
    ...state.clients.items
      .filter(c => !c.archived)
      .map(
        c =>
          `<option value="${escapeHtml(c.id)}"${state.sessionsView.clientId === c.id ? ' selected' : ''}>${escapeHtml(c.company)}</option>`
      )
  ].join('');

  const projectOptions = [
    `<option value="all"${state.sessionsView.projectId === 'all' ? ' selected' : ''}>${tr('allProjects')}</option>`,
    ...projectsForSessionsFilter().map(
      p =>
        `<option value="${escapeHtml(p.id)}"${state.sessionsView.projectId === p.id ? ' selected' : ''}>${escapeHtml(p.name)}</option>`
    )
  ].join('');

  const sessionRows = rows.length
    ? rows
        .map(({ session: s, project, client }) => {
          const clientLabel = client?.company || s.client || '—';
          const projectLabel = project?.name || s.project || '—';
          const sessionCur = client ? currencyForClient(client) : getStudioCurrency();
          return `<tr data-session-id="${escapeHtml(s.id)}">
            <td>${escapeHtml(s.date ? formatReportDate(s.date) : '—')}</td>
            <td>${escapeHtml(clientLabel)}</td>
            <td>${escapeHtml(projectLabel)}</td>
            <td>${escapeHtml(formatClockDisplay(s.start))}</td>
            <td>${escapeHtml(formatClockDisplay(s.end))}</td>
            <td>${escapeHtml(formatBreakDisplay(s.breakMin))}</td>
            <td class="num">${escapeHtml(formatHmsDisplay(sessionDurationSec(s)))}</td>
            <td class="num">${escapeHtml(formatRate(s.rate, sessionCur))}</td>
            <td class="num">${escapeHtml(formatMoney(s.cost, sessionCur))}</td>
            <td class="session-actions">
              <button type="button" class="btn" data-session-action="edit" data-session-id="${escapeHtml(s.id)}">${tr('edit')}</button>
              <button type="button" class="btn" data-session-action="move" data-session-id="${escapeHtml(s.id)}">${tr('move')}</button>
              <button type="button" class="btn" data-session-action="duplicate" data-session-id="${escapeHtml(s.id)}">${tr('duplicate')}</button>
              <button type="button" class="btn" data-session-action="delete" data-session-id="${escapeHtml(s.id)}">${tr('delete')}</button>
            </td>
          </tr>`;
        })
        .join('')
    : `<tr><td colspan="10" class="empty-cell">${tr('noSessionsFilter')}</td></tr>`;

  root.innerHTML = `
    <div class="reports-layout sessions-layout">
      <div class="reports-filters">
        <h3>${tr('sessionsFilters')}</h3>
        <div class="field">
          <label for="svDateFrom">${tr('dateFrom')}</label>
          <input type="date" id="svDateFrom" value="${escapeHtml(state.sessionsView.dateFrom)}" />
        </div>
        <div class="field">
          <label for="svDateTo">${tr('dateTo')}</label>
          <input type="date" id="svDateTo" value="${escapeHtml(state.sessionsView.dateTo)}" />
        </div>
        <div class="field">
          <label for="svClient">${tr('client')}</label>
          <select id="svClient">${clientOptions}</select>
        </div>
        <div class="field">
          <label for="svProject">${tr('project')}</label>
          <select id="svProject">${projectOptions}</select>
        </div>
        <div class="field">
          <label for="svSearch">${tr('searchPlaceholder')}</label>
          <input type="search" id="svSearch" placeholder="${tr('sessionsSearchPlaceholder')}" value="${escapeHtml(state.sessionsView.query)}" />
        </div>
      </div>
      <div class="sessions-main">
        <div class="sessions-main__head">
          <button type="button" class="btn btn-primary" id="btnSessionsManualEntry">${tr('sessionsAddManualEntry')}</button>
        </div>
        <div class="metrics">
          <div class="metric">
            <div class="metric__label">${tr('sessionsTotalSessions')}</div>
            <div class="metric__value">${summary.count}</div>
          </div>
          <div class="metric">
            <div class="metric__label">${tr('sessionsTotalHours')}</div>
            <div class="metric__value">${escapeHtml(summary.totalHours)}</div>
          </div>
          <div class="metric">
            <div class="metric__label">${tr('sessionsTotalValue')}</div>
            <div class="metric__value">${escapeHtml(summary.valueLabel)}</div>
          </div>
        </div>
        <div class="table-wrap">
          <table class="session-table">
            <thead>
              <tr>
                <th>${tr('colDate')}</th>
                <th>${tr('client')}</th>
                <th>${tr('project')}</th>
                <th>${tr('colTimeStart')}</th>
                <th>${tr('colTimeEnd')}</th>
                <th>${tr('break')}</th>
                <th class="num">${tr('colHours')}</th>
                <th class="num">${tr('hourlyRate')}</th>
                <th class="num">${tr('cost')}</th>
                <th>${tr('colActions')}</th>
              </tr>
            </thead>
            <tbody>${sessionRows}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const rebuildProjectOptions = () => {
    const select = $('svProject');
    if (!select) return;
    if (
      state.sessionsView.projectId !== 'all' &&
      !projectsForSessionsFilter().some(p => p.id === state.sessionsView.projectId)
    ) {
      state.sessionsView.projectId = 'all';
    }
    select.innerHTML = [
      `<option value="all"${state.sessionsView.projectId === 'all' ? ' selected' : ''}>${tr('allProjects')}</option>`,
      ...projectsForSessionsFilter().map(
        p =>
          `<option value="${escapeHtml(p.id)}"${state.sessionsView.projectId === p.id ? ' selected' : ''}>${escapeHtml(p.name)}</option>`
      )
    ].join('');
  };

  $('svDateFrom')?.addEventListener('change', e => {
    state.sessionsView.dateFrom = e.target.value;
    renderSessions();
  });
  $('svDateTo')?.addEventListener('change', e => {
    state.sessionsView.dateTo = e.target.value;
    renderSessions();
  });
  $('svClient')?.addEventListener('change', e => {
    state.sessionsView.clientId = e.target.value;
    rebuildProjectOptions();
    renderSessions();
  });
  $('svProject')?.addEventListener('change', e => {
    state.sessionsView.projectId = e.target.value;
    renderSessions();
  });
  $('svSearch')?.addEventListener('input', e => {
    state.sessionsView.query = e.target.value;
    syncGlobalSearchInput();
    renderSessions();
  });
  $('btnSessionsManualEntry')?.addEventListener('click', () => openSessionEditor());
  bindSessionActions(root);
}

/** Session rows for the single HTML Time & Billing template. */
function getReportEntries() {
  const { clientId, projectId, dateFrom, dateTo } = state.reports;
  const entries = [];

  state.timer.sessions.forEach(s => {
    const proj =
      (s.projectId && state.projects.items.find(p => p.id === s.projectId)) ||
      state.projects.items.find(p => p.name === s.project);
    // Skip orphan sessions (project deleted).
    if (!proj) return;
    const client = state.clients.items.find(c => c.id === proj.clientId);
    if (!client) return;
    if (clientId !== 'all' && client.id !== clientId) return;
    if (projectId !== 'all' && proj.id !== projectId) return;
    const iso = String(s.date || '').trim();
    if (iso && dateFrom && iso < dateFrom) return;
    if (iso && dateTo && iso > dateTo) return;
    const durationSec = sessionDurationSec(s);
    const rate = sessionEffectiveRate(s, client, durationSec);
    const hoursDecimal = durationSec / 3600;
    entries.push({
      date: s.date ? formatReportDate(s.date) : formatReportDate(new Date()),
      start: formatClockDisplay(s.start),
      end: formatClockDisplay(s.end),
      pause: formatBreakDisplay(s.breakMin),
      description: s.description || s.project || 'Session',
      hours: formatHmsDisplay(durationSec),
      hoursDecimal,
      rate,
      total: Number(s.cost) || hoursDecimal * rate,
      currency: currencyForClient(client),
      client: client.company,
      project: proj.name
    });
  });

  return entries;
}

function projectsForReportFilter() {
  if (state.reports.clientId === 'all') return state.projects.items;
  return state.projects.items.filter(p => p.clientId === state.reports.clientId);
}

function sanitizeReportHtml(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (!/<[a-z][\s\S]*>/i.test(s)) {
    return escapeHtml(s).replace(/\n/g, '<br>');
  }
  const doc = new DOMParser().parseFromString(s, 'text/html');
  const allowed = new Set(['BR', 'B', 'STRONG', 'I', 'EM', 'A', 'SPAN', 'P', 'DIV', 'SMALL']);
  const walk = node => {
    [...node.childNodes].forEach(child => {
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      if (!allowed.has(child.tagName)) {
        child.replaceWith(doc.createTextNode(child.textContent || ''));
        return;
      }
      [...child.attributes].forEach(attr => {
        const name = attr.name.toLowerCase();
        if (child.tagName === 'A' && name === 'href') {
          const href = String(attr.value || '').trim();
          if (!/^(https?:|mailto:|tel:)/i.test(href)) child.removeAttribute('href');
          return;
        }
        if (name === 'class') return;
        child.removeAttribute(attr.name);
      });
      walk(child);
    });
  };
  walk(doc.body);
  return doc.body.innerHTML.trim();
}

function reportHeaderNoteHtml() {
  const html = sanitizeReportHtml(state.settings.reportHeaderNote);
  return html ? `<div class="report-header__note">${html}</div>` : '';
}

function reportFooterNoteHtml() {
  const html = sanitizeReportHtml(state.settings.reportFooter);
  return html ? `<div class="footer__note">${html}</div>` : '';
}

function reportTemplateCss() {
  return `
    :root {
      --page-bg: #ffffff;
      --canvas-bg: #666666;
      --text: #111111;
      --muted: #6b7280;
      --line: #d7d7d7;
      --table-head: #f2f2f2;
      --accent: #111111;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 28px;
      background: var(--canvas-bg);
      color: var(--text);
      font-family: Arial, Helvetica, sans-serif;
    }
    .artboard-label {
      width: min(1120px, calc(100vw - 56px));
      margin: 0 auto 8px;
      color: #f3f4f6;
      font-size: 14px;
      font-weight: 700;
    }
    .page {
      width: min(1120px, calc(100vw - 56px));
      height: 794px;
      min-height: 794px;
      max-height: 794px;
      margin: 0 auto;
      background: var(--page-bg);
      border: none;
      padding: 28px 30px 22px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .report-document .page + .page { margin-top: 18px; }
    .report-header--compact {
      margin-bottom: 14px;
      gap: 6px;
    }
    .report-header__subtitle {
      text-align: center;
      font-size: 11px;
      color: var(--muted);
      font-weight: 400;
    }
    .report-header {
      display: flex;
      flex-direction: column;
      gap: 18px;
      margin-bottom: 28px;
    }
    .report-header__title {
      text-align: center;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .report-header__row2 {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
    }
    .report-header__brand {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;
      max-width: 280px;
    }
    .report-header__note {
      font-size: 10px;
      line-height: 1.45;
      color: var(--muted);
    }
    .report-header__note a { color: inherit; }
    .logo-box {
      width: auto;
      max-width: 200px;
      height: auto;
      max-height: 72px;
      border: none;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      font-size: 12px;
      overflow: visible;
      background: transparent;
      flex-shrink: 0;
    }
    .logo-box img {
      max-width: 200px;
      max-height: 72px;
      width: auto;
      height: auto;
      object-fit: contain;
      display: block;
    }
    .title {
      font-size: 20px;
      font-weight: 700;
      margin-top: 8px;
    }
    .meta {
      display: grid;
      grid-template-columns: 92px 1fr;
      row-gap: 10px;
      column-gap: 12px;
      font-size: 12px;
      line-height: 1.25;
      margin: 0;
      min-width: 220px;
    }
    .meta dt { font-style: italic; font-weight: 400; font-size: 12px; }
    .meta dd { margin: 0; min-height: 16px; font-size: 12px; font-weight: 400; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; table-layout: fixed; }
    .col-date { width: 9%; }
    .col-time { width: 7%; }
    .col-pause { width: 6%; }
    .col-desc { width: 42%; }
    .col-num { width: 9%; }
    thead th {
      background: var(--table-head);
      padding: 6px 5px;
      text-align: left;
      font-weight: 500;
      font-size: 10px;
      white-space: nowrap;
    }
    tbody td { padding: 6px 5px; vertical-align: top; font-size: 10px; }
    td.description, th.description {
      padding-left: 8px;
      padding-right: 8px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .description { width: 42%; }
    .spacer { flex: 1 1 auto; min-height: 40px; }
    .totals { width: 270px; margin-left: auto; font-size: 12px; }
    .total-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 24px;
      padding: 5px 0;
      font-size: 12px;
      font-weight: 400;
    }
    .grand { font-weight: 700; font-size: 12px; }
    .footer {
      margin-top: 10px;
      padding-top: 8px;
      font-size: 10px;
      color: #111;
      flex-shrink: 0;
      border-top: 1px solid var(--line);
    }
    .footer__inner {
      position: relative;
      min-height: 28px;
      padding-top: 6px;
    }
    .footer__note {
      text-align: center;
      color: var(--muted);
      font-size: 10px;
      line-height: 1.4;
      margin-bottom: 4px;
    }
    .footer__note a { color: inherit; }
    .page-number { text-align: center; font-size: 10px; }
    .generated {
      text-align: center;
      margin-top: 2px;
      color: var(--muted);
      font-size: 9px;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .artboard-label { display: none; }
      .report-document .page + .page { margin-top: 0; page-break-before: always; }
      .page {
        width: 100%;
        height: auto;
        min-height: auto;
        max-height: none;
        border: none;
        margin: 0;
      }
    }
  `;
}

const REPORT_PAGE_WIDTH_PX = 1123;
const REPORT_PAGE_HEIGHT_PX = 794;
/** Max chars on one report description line (~42% col @ 10px Arial). */
const REPORT_DESCRIPTION_MAX_CHARS = 84;
/** Rows per A4 landscape page (conservative — room for header, thead, footer, totals). */
const REPORT_PAGINATION = { first: 16, middle: 20, last: 14 };

function paginateReportEntries(entries) {
  if (!entries.length) return [[]];
  const { first, middle, last } = REPORT_PAGINATION;
  if (entries.length <= last) return [entries.slice()];

  const pages = [];
  let i = 0;
  pages.push(entries.slice(i, i + first));
  i += first;

  while (i < entries.length) {
    const rem = entries.length - i;
    if (rem <= last) {
      pages.push(entries.slice(i));
      break;
    }
    if (rem <= last + middle) {
      const splitAt = rem - last;
      pages.push(entries.slice(i, i + splitAt));
      i += splitAt;
      pages.push(entries.slice(i));
      break;
    }
    pages.push(entries.slice(i, i + middle));
    i += middle;
  }
  return pages;
}

function formatReportPageNumber(pageNum, totalPages) {
  const width = Math.max(2, String(totalPages).length);
  return String(pageNum).padStart(width, '0');
}

function reportTableColgroupHtml() {
  return `<colgroup>
    <col class="col-date" />
    <col class="col-time" />
    <col class="col-time" />
    <col class="col-pause" />
    <col class="col-desc" />
    <col class="col-num" />
    <col class="col-num" />
    <col class="col-num" />
  </colgroup>`;
}

function reportTableHeadHtml() {
  return `${reportTableColgroupHtml()}<thead>
          <tr>
            <th>${escapeHtml(tr('colDate'))}</th>
            <th>${escapeHtml(tr('colTimeStart'))}</th>
            <th>${escapeHtml(tr('colTimeEnd'))}</th>
            <th>${escapeHtml(tr('colTimePause'))}</th>
            <th class="description">${escapeHtml(tr('colDescription'))}</th>
            <th class="num">${escapeHtml(tr('colHours'))}</th>
            <th class="num">${escapeHtml(tr('colRate'))}</th>
            <th class="num">${escapeHtml(tr('colTotal'))}</th>
          </tr>
        </thead>`;
}

function truncateReportDescription(text) {
  const s = String(text ?? '');
  if (s.length <= REPORT_DESCRIPTION_MAX_CHARS) return s;
  return `${s.slice(0, REPORT_DESCRIPTION_MAX_CHARS - 1)}…`;
}

function reportEntryRowHtml(e) {
  return `<tr>
        <td>${escapeHtml(e.date)}</td>
        <td>${escapeHtml(e.start)}</td>
        <td>${escapeHtml(e.end)}</td>
        <td>${escapeHtml(e.pause)}</td>
        <td class="description">${escapeHtml(truncateReportDescription(e.description))}</td>
        <td class="num">${escapeHtml(e.hours)}</td>
        <td class="num">${escapeHtml(formatMoney(e.rate, e.currency))}</td>
        <td class="num">${escapeHtml(formatMoney(e.total, e.currency))}</td>
      </tr>`;
}

function reportFullHeaderHtml({ logoMarkup, clientLabel, projectLabel, printDate }) {
  return `<header class="report-header">
      <div class="report-header__title">${escapeHtml(tr('reportTitle'))}</div>
      <div class="report-header__row2">
        <div class="report-header__brand">
          <div class="logo-box">${logoMarkup}</div>
          ${reportHeaderNoteHtml()}
        </div>
        <dl class="meta">
          <dt>${escapeHtml(tr('customer'))}</dt>
          <dd>${escapeHtml(clientLabel)}</dd>
          <dt>${escapeHtml(tr('project'))}</dt>
          <dd>${escapeHtml(projectLabel)}</dd>
          <dt>${escapeHtml(tr('period'))}</dt>
          <dd>${escapeHtml(reportPeriodLabel())}</dd>
          <dt>${escapeHtml(tr('printDate'))}</dt>
          <dd>${escapeHtml(printDate)}</dd>
        </dl>
      </div>
    </header>`;
}

function reportCompactHeaderHtml({ clientLabel, projectLabel }) {
  return `<header class="report-header report-header--compact">
      <div class="report-header__title">${escapeHtml(tr('reportTitle'))}</div>
      <div class="report-header__subtitle">${escapeHtml(clientLabel)} · ${escapeHtml(projectLabel)} · ${escapeHtml(reportPeriodLabel())}</div>
    </header>`;
}

function reportTotalsHtml(subtotal, reportCur) {
  return `<section class="totals">
      <div class="total-row">
        <span>${escapeHtml(tr('subtotal'))}</span>
        <span>${escapeHtml(formatMoney(subtotal, reportCur))}</span>
      </div>
      <div class="total-row grand">
        <span>${escapeHtml(tr('grandTotal'))}</span>
        <span>${escapeHtml(formatMoney(subtotal, reportCur))}</span>
      </div>
    </section>`;
}

function reportFooterHtml(pageNum, totalPages) {
  return `<footer class="footer">
      <div class="footer__inner">
        ${reportFooterNoteHtml()}
        <div class="page-number">${escapeHtml(tr('pageLabel', { n: formatReportPageNumber(pageNum, totalPages) }))}</div>
        <div class="generated">${escapeHtml(tr('generatedBy'))}</div>
      </div>
    </footer>`;
}

function prepareReportPageForCapture(pageEl) {
  const spacer = pageEl.querySelector('.spacer');
  const prev = {
    width: pageEl.style.width,
    minHeight: pageEl.style.minHeight,
    height: pageEl.style.height,
    maxHeight: pageEl.style.maxHeight,
    border: pageEl.style.border,
    spacerMin: spacer?.style.minHeight ?? '',
    spacerFlex: spacer?.style.flex ?? ''
  };
  pageEl.style.width = `${REPORT_PAGE_WIDTH_PX}px`;
  pageEl.style.minHeight = `${REPORT_PAGE_HEIGHT_PX}px`;
  pageEl.style.height = `${REPORT_PAGE_HEIGHT_PX}px`;
  pageEl.style.maxHeight = `${REPORT_PAGE_HEIGHT_PX}px`;
  pageEl.style.border = 'none';
  if (spacer) {
    spacer.style.minHeight = '0';
    spacer.style.flex = '1 1 auto';
  }
  return prev;
}

function restoreReportPageAfterCapture(pageEl, prev) {
  pageEl.style.width = prev.width;
  pageEl.style.minHeight = prev.minHeight;
  pageEl.style.height = prev.height;
  pageEl.style.maxHeight = prev.maxHeight;
  pageEl.style.border = prev.border;
  const spacer = pageEl.querySelector('.spacer');
  if (spacer) {
    spacer.style.minHeight = prev.spacerMin;
    spacer.style.flex = prev.spacerFlex;
  }
}

function renderReportDocument() {
  const entries = getReportEntries();
  const subtotal = entries.reduce((s, e) => s + e.total, 0);
  const reportCur = reportMoneyCurrency(entries);
  const { clientLabel, projectLabel } = reportScopeLabels();
  const printDate = formatReportDate(new Date());
  const logoSrc = imgSrcFromDataUrl(state.settings.logoDataUrl);
  const logoMarkup = logoSrc
    ? `<img src="${logoSrc}" alt="Logo" />`
    : escapeHtml(state.settings.company || 'Logo');

  const headerCtx = { logoMarkup, clientLabel, projectLabel, printDate };
  const pageChunks = paginateReportEntries(entries);
  const totalPages = pageChunks.length;

  const pagesHtml = pageChunks
    .map((chunk, idx) => {
      const pageNum = idx + 1;
      const isFirst = idx === 0;
      const isLast = idx === totalPages - 1;
      const header = isFirst ? reportFullHeaderHtml(headerCtx) : reportCompactHeaderHtml(headerCtx);
      const tbody = chunk.length
        ? chunk.map(reportEntryRowHtml).join('')
        : isFirst
          ? `<tr><td colspan="8" style="text-align:center;color:#6b7280;padding:24px 10px">${escapeHtml(tr('noSessionsFilter'))}</td></tr>`
          : '';
      const flashClass = isFirst ? ' report-page--flash-target' : '';
      return `<main class="page${flashClass}" data-page="${pageNum}">
    ${header}
    <section class="table-wrap">
      <table aria-label="${escapeHtml(tr('reportTitle'))}">
        ${reportTableHeadHtml()}
        <tbody>${tbody}</tbody>
      </table>
    </section>
    <div class="spacer"></div>
    ${isLast ? reportTotalsHtml(subtotal, reportCur) : ''}
    ${reportFooterHtml(pageNum, totalPages)}
  </main>`;
    })
    .join('\n');

  return `<div class="artboard-label">${escapeHtml(tr('reportTitle'))}</div>
  <div class="report-document" id="reportDoc">${pagesHtml}</div>`;
}

function reportHtmlDocument() {
  const lang = window.MusomoI18n?.getLocale?.() || 'en';
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${tr('reportTitle')}</title>
  <style>${reportTemplateCss()}</style>
</head>
<body>
${renderReportDocument()}
</body>
</html>`;
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function reportCsvDocument() {
  const entries = getReportEntries();
  const subtotal = entries.reduce((s, e) => s + e.total, 0);
  const { clientLabel, projectLabel } = reportScopeLabels();
  const escapeCell = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = [
    [tr('companyName'), state.settings.company],
    [tr('customer'), clientLabel],
    [tr('project'), projectLabel],
    [tr('period'), reportPeriodLabel()],
    [],
    [tr('colDate'), tr('colTimeStart'), tr('colTimeEnd'), tr('colTimePause'), tr('colDescription'), tr('colHours'), tr('colRate'), tr('colTotal')],
    ...entries.map(e => [
      e.date,
      e.start,
      e.end,
      e.pause,
      e.description,
      e.hours,
      Number(e.rate).toFixed(2),
      Number(e.total).toFixed(2)
    ]),
    [],
    ['', '', '', '', tr('grandTotal'), '', '', Number(subtotal).toFixed(2)]
  ];
  return `\uFEFF${lines.map(row => row.map(escapeCell).join(',')).join('\n')}`;
}

/** Minimal real .xlsx (OOXML) — opens in Excel and Numbers on Mac. */
function reportXlsxBytes() {
  const entries = getReportEntries();
  const subtotal = entries.reduce((s, e) => s + e.total, 0);
  const { clientLabel, projectLabel } = reportScopeLabels();
  const cell = (ref, value, type = 'inlineStr') => {
    if (type === 'n') {
      return `<c r="${ref}"><v>${value}</v></c>`;
    }
    return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
  };
  const rowXml = (r, values, types) => {
    const cells = values
      .map((v, i) => {
        const col = String.fromCharCode(65 + i);
        return cell(`${col}${r}`, v, types[i] || 'inlineStr');
      })
      .join('');
    return `<row r="${r}">${cells}</row>`;
  };

  const sessionRows = [
    rowXml(1, [tr('colDate'), tr('colTimeStart'), tr('colTimeEnd'), tr('colTimePause'), tr('colDescription'), tr('colHours'), tr('colRate'), tr('colTotal')], []),
    ...entries.map((e, idx) =>
      rowXml(
        idx + 2,
        [
          e.date,
          e.start,
          e.end,
          e.pause,
          e.description,
          e.hours,
          Number(e.rate).toFixed(2),
          Number(e.total).toFixed(2)
        ],
        ['s', 's', 's', 's', 's', 's', 'n', 'n']
      )
    ),
    rowXml(
      entries.length + 2,
      ['', '', '', '', tr('grandTotal'), '', '', Number(subtotal).toFixed(2)],
      ['s', 's', 's', 's', 's', 's', 's', 'n']
    )
  ].join('');

  const summaryRows = [
    rowXml(1, [tr('companyName'), state.settings.company], []),
    rowXml(2, [tr('customer'), clientLabel], []),
    rowXml(3, [tr('project'), projectLabel], []),
    rowXml(4, [tr('period'), reportPeriodLabel()], []),
    rowXml(5, [tr('grandTotal'), Number(subtotal).toFixed(2)], ['s', 'n'])
  ].join('');

  const sheet = (rowsXml, colsXml = '') =>
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `${colsXml}<sheetData>${rowsXml}</sheetData></worksheet>`;

  const sessionCols =
    `<cols>` +
    `<col min="1" max="1" width="14" customWidth="1"/>` +
    `<col min="2" max="4" width="12" customWidth="1"/>` +
    `<col min="5" max="5" width="42" customWidth="1"/>` +
    `<col min="6" max="8" width="12" customWidth="1"/>` +
    `</cols>`;
  const summaryCols =
    `<cols>` +
    `<col min="1" max="1" width="16" customWidth="1"/>` +
    `<col min="2" max="2" width="36" customWidth="1"/>` +
    `</cols>`;

  const files = {
    '[Content_Types].xml':
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
      `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
      `<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
      `</Types>`,
    '_rels/.rels':
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
      `</Relationships>`,
    'xl/workbook.xml':
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
      `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
      `<sheets>` +
      `<sheet name="Summary" sheetId="1" r:id="rId1"/>` +
      `<sheet name="Sessions" sheetId="2" r:id="rId2"/>` +
      `</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels':
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
      `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>` +
      `</Relationships>`,
    'xl/worksheets/sheet1.xml': sheet(summaryRows, summaryCols),
    'xl/worksheets/sheet2.xml': sheet(sessionRows, sessionCols)
  };

  return zipStore(files);
}

function crc32(bytes) {
  let c = ~0;
  for (let i = 0; i < bytes.length; i++) {
    c ^= bytes[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function u16(n) {
  return [n & 255, (n >>> 8) & 255];
}
function u32(n) {
  return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
}

function zipStore(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  let count = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(name);
    const data = typeof content === 'string' ? encoder.encode(content) : content;
    const crc = crc32(data);
    const local = [
      0x50, 0x4b, 0x03, 0x04,
      ...u16(20),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(crc),
      ...u32(data.length),
      ...u32(data.length),
      ...u16(nameBytes.length),
      ...u16(0),
      ...nameBytes,
      ...data
    ];
    const central = [
      0x50, 0x4b, 0x01, 0x02,
      ...u16(20),
      ...u16(20),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(crc),
      ...u32(data.length),
      ...u32(data.length),
      ...u16(nameBytes.length),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(offset),
      ...nameBytes
    ];
    localParts.push(Uint8Array.from(local));
    centralParts.push(Uint8Array.from(central));
    offset += local.length;
    count += 1;
  }
  const centralSize = centralParts.reduce((s, p) => s + p.length, 0);
  const end = Uint8Array.from([
    0x50, 0x4b, 0x05, 0x06,
    ...u16(0),
    ...u16(0),
    ...u16(count),
    ...u16(count),
    ...u32(centralSize),
    ...u32(offset),
    ...u16(0)
  ]);
  const total = offset + centralSize + end.length;
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of localParts) {
    out.set(p, pos);
    pos += p.length;
  }
  for (const p of centralParts) {
    out.set(p, pos);
    pos += p.length;
  }
  out.set(end, pos);
  return out;
}

async function saveTextFile(fileName, text, mime = 'text/plain;charset=utf-8') {
  const bytes = Array.from(new TextEncoder().encode(text));
  if (window.__TAURI__?.core?.invoke) {
    return invoke('save_downloaded_file', { fileName, bytes });
  }
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return fileName;
}

async function saveBytesFile(fileName, bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (window.__TAURI__?.core?.invoke) {
    return invoke('save_downloaded_file', { fileName, bytes: Array.from(arr) });
  }
  const blob = new Blob([arr]);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return fileName;
}

async function openSavedFile(path) {
  if (!path || !window.__TAURI__?.core?.invoke) return;
  try {
    await invoke('open_file', { path });
  } catch (err) {
    console.warn('openSavedFile', err);
  }
}

function savedFileName(path) {
  const text = String(path || '');
  const parts = text.split(/[/\\]/);
  return parts[parts.length - 1] || text;
}

function loadJsPdf() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-tracker-jspdf]');
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.jspdf?.jsPDF) resolve(window.jspdf.jsPDF);
        else reject(new Error('jsPDF loaded without global object.'));
      });
      existing.addEventListener('error', () => reject(new Error('Failed to load jsPDF.')));
      return;
    }
    const script = document.createElement('script');
    script.dataset.trackerJspdf = '1';
    script.src = '../vendor/jspdf.umd.min.js';
    script.onload = () => {
      if (window.jspdf?.jsPDF) resolve(window.jspdf.jsPDF);
      else reject(new Error('jsPDF loaded without global object.'));
    };
    script.onerror = () => reject(new Error('Failed to load jsPDF.'));
    document.head.appendChild(script);
  });
}

function loadHtml2Canvas() {
  if (typeof window.html2canvas === 'function') return Promise.resolve(window.html2canvas);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-tracker-html2canvas]');
    if (existing) {
      existing.addEventListener('load', () => {
        if (typeof window.html2canvas === 'function') resolve(window.html2canvas);
        else reject(new Error('html2canvas loaded without global.'));
      });
      existing.addEventListener('error', () => reject(new Error('Failed to load html2canvas.')));
      return;
    }
    const script = document.createElement('script');
    script.dataset.trackerHtml2canvas = '1';
    script.src = '../vendor/html2canvas.min.js';
    script.onload = () => {
      if (typeof window.html2canvas === 'function') resolve(window.html2canvas);
      else reject(new Error('html2canvas loaded without global.'));
    };
    script.onerror = () => reject(new Error('Failed to load html2canvas.'));
    document.head.appendChild(script);
  });
}

/** PDF from the live HTML preview — one A4 landscape page per report sheet. */
async function exportReportPdf(opts = {}) {
  const openAfter = opts.openAfter !== false;
  const previewHost = $('reportPreview');
  if (previewHost) previewHost.innerHTML = renderReportDocument();
  const doc = $('reportDoc');
  const pages = doc ? [...doc.querySelectorAll('.page')] : [];
  if (!pages.length) throw new Error('Preview not ready. Click Generate preview first.');

  const html2canvas = await loadHtml2Canvas();
  const JsPdfCtor = await loadJsPdf();
  const pdf = new JsPdfCtor({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const usableW = pageW - margin * 2;
  const usableH = pageH - margin * 2;

  try {
    for (let i = 0; i < pages.length; i += 1) {
      const el = pages[i];
      const prev = prepareReportPageForCapture(el);
      try {
        const canvas = await html2canvas(el, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
          width: REPORT_PAGE_WIDTH_PX,
          height: REPORT_PAGE_HEIGHT_PX,
          windowWidth: REPORT_PAGE_WIDTH_PX,
          windowHeight: REPORT_PAGE_HEIGHT_PX
        });
        if (i > 0) pdf.addPage('a4', 'landscape');
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', margin, margin, usableW, usableH, undefined, 'FAST');
      } finally {
        restoreReportPageAfterCapture(el, prev);
      }
    }

    const bytes = new Uint8Array(pdf.output('arraybuffer'));
    const savedPath = await saveBytesFile(`${reportBaseName()}.pdf`, bytes);
    if (openAfter) await openSavedFile(savedPath);
    return savedPath;
  } catch (err) {
    throw err;
  }
}

async function exportReportExcel(opts = {}) {
  const openAfter = opts.openAfter !== false;
  const bytes = reportXlsxBytes();
  const savedPath = await saveBytesFile(`${reportBaseName()}.xlsx`, bytes);
  if (openAfter) await openSavedFile(savedPath);
  return savedPath;
}

async function exportReport(kind) {
  try {
    if (kind === 'pdf') {
      const savedPath = await exportReportPdf();
      alert(`PDF saved to Downloads:\n${savedFileName(savedPath)}`);
      return;
    }
    if (kind === 'excel') {
      const savedPath = await exportReportExcel();
      alert(`Excel saved to Downloads:\n${savedFileName(savedPath)}`);
    }
  } catch (err) {
    alert(`Report export failed: ${String(err?.message || err || 'unknown error')}`);
  }
}

async function sendReportByEmail() {
  const client = reportCustomerClient();
  const email = String(client?.email || '').trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    alert('Select a client (or project) that has an email address, then try again.');
    return;
  }
  const kind = String($('rSendFormat')?.value || 'pdf');
  const status = $('reportGenerateStatus');
  try {
    if (status) status.textContent = kind === 'excel' ? 'Preparing Excel…' : 'Preparing PDF…';
    const savedPath =
      kind === 'excel'
        ? await exportReportExcel({ openAfter: false })
        : await exportReportPdf({ openAfter: false });
    const { clientLabel, projectLabel } = reportScopeLabels();
    const company = state.settings.company || 'Studio';
    const subject = `${tr('reportTitle')} — ${projectLabel}`;
    const body = [
      'Hi,',
      '',
      `Please find attached the time & billing report for ${clientLabel} / ${projectLabel}.`,
      `Period: ${reportPeriodLabel()}`,
      '',
      'Best regards,',
      company
    ].join('\n');
    if (status) status.textContent = 'Opening Mail…';
    await invoke('compose_mail_with_attachment', {
      to: email,
      subject,
      body,
      attachmentPath: savedPath
    });
    if (status) {
      status.textContent = `Mail draft ready for ${email} · ${savedFileName(savedPath)}`;
    }
  } catch (err) {
    if (status) status.textContent = '';
    alert(`Send report failed: ${String(err?.message || err || 'unknown error')}`);
  }
}


function renderReports() {
  const root = $('page-reports');
  if (!root) return;
  // Keep project filter coherent with selected client.
  if (
    state.reports.projectId !== 'all' &&
    !projectsForReportFilter().some(p => p.id === state.reports.projectId)
  ) {
    state.reports.projectId = 'all';
  }
  const clientOptions = [
    `<option value="all"${state.reports.clientId === 'all' ? ' selected' : ''}>${tr('allClients')}</option>`,
    ...state.clients.items
      .filter(c => !c.archived)
      .map(c => `<option value="${escapeHtml(c.id)}"${state.reports.clientId === c.id ? ' selected' : ''}>${escapeHtml(c.company)}</option>`)
  ].join('');
  const projectOptions = [
    `<option value="all"${state.reports.projectId === 'all' ? ' selected' : ''}>${tr('allProjects')}</option>`,
    ...projectsForReportFilter().map(
      p => `<option value="${escapeHtml(p.id)}"${state.reports.projectId === p.id ? ' selected' : ''}>${escapeHtml(p.name)}</option>`
    )
  ].join('');

  root.innerHTML = `
    <div class="reports-layout">
      <div class="reports-filters">
        <h3>${tr('reportFilters')}</h3>
        <div class="field">
          <label for="rDateFrom">${tr('dateFrom')}</label>
          <input type="date" id="rDateFrom" value="${escapeHtml(state.reports.dateFrom)}" />
        </div>
        <div class="field">
          <label for="rDateTo">${tr('dateTo')}</label>
          <input type="date" id="rDateTo" value="${escapeHtml(state.reports.dateTo)}" />
        </div>
        <div class="field">
          <label for="rClient">${tr('client')}</label>
          <select id="rClient">${clientOptions}</select>
        </div>
        <div class="field">
          <label for="rProject">${tr('project')}</label>
          <select id="rProject">${projectOptions}</select>
        </div>
        <button type="button" class="btn btn-primary" id="btnGenerateReport">${tr('generatePreview')}</button>
        <p class="report-generate-status" id="reportGenerateStatus" aria-live="polite"></p>
        <div class="export-bar">
          <button type="button" class="btn" data-export="pdf">${tr('pdf')}</button>
          <button type="button" class="btn" data-export="excel">${tr('excel')}</button>
        </div>
        <div class="export-bar export-bar--send">
          <button type="button" class="btn btn-primary" id="btnSendReport">${tr('sendReport')}</button>
          <select id="rSendFormat" aria-label="Attachment format">
            <option value="pdf" selected>${tr('pdf')}</option>
            <option value="excel">${tr('excel')}</option>
          </select>
        </div>
      </div>
      <div class="report-preview-wrap">
        <div class="report-preview__toolbar">
          <span>${tr('preview')}</span>
          <span>${tr('htmlTemplate')}</span>
        </div>
        <div id="reportPreview" class="report-preview-host">${renderReportDocument()}</div>
      </div>
    </div>
  `;

  const refreshPreview = (opts = {}) => {
    const preview = $('reportPreview');
    if (preview) preview.innerHTML = renderReportDocument();
    if (opts.flash) {
      const docEl = $('reportDoc');
      docEl?.querySelectorAll('.page').forEach(page => page.classList.remove('report-page--flash'));
      void docEl?.offsetWidth;
      docEl?.querySelector('.page')?.classList.add('report-page--flash');
      const entries = getReportEntries();
      const total = entries.reduce((s, e) => s + e.total, 0);
      const pageCount = paginateReportEntries(entries).length;
      const status = $('reportGenerateStatus');
      if (status) {
        status.textContent = entries.length
          ? `${tr('reportPreviewUpdated', { entries: entries.length, pages: pageCount, total: formatMoney(total, reportMoneyCurrency(entries)) })}`
          : tr('noSessionsFilter');
      }
    }
  };

  const rebuildProjectOptions = () => {
    const select = $('rProject');
    if (!select) return;
    if (
      state.reports.projectId !== 'all' &&
      !projectsForReportFilter().some(p => p.id === state.reports.projectId)
    ) {
      state.reports.projectId = 'all';
    }
    select.innerHTML = [
      `<option value="all"${state.reports.projectId === 'all' ? ' selected' : ''}>${tr('allProjects')}</option>`,
      ...projectsForReportFilter().map(
        p => `<option value="${escapeHtml(p.id)}"${state.reports.projectId === p.id ? ' selected' : ''}>${escapeHtml(p.name)}</option>`
      )
    ].join('');
  };

  $('rDateFrom')?.addEventListener('change', e => {
    state.reports.dateFrom = e.target.value;
    refreshPreview();
  });
  $('rDateTo')?.addEventListener('change', e => {
    state.reports.dateTo = e.target.value;
    refreshPreview();
  });
  $('rClient')?.addEventListener('change', e => {
    state.reports.clientId = e.target.value;
    rebuildProjectOptions();
    refreshPreview();
  });
  $('rProject')?.addEventListener('change', e => {
    state.reports.projectId = e.target.value;
    refreshPreview();
  });
  $('btnGenerateReport')?.addEventListener('click', () => refreshPreview({ flash: true }));
  root.querySelectorAll('[data-export]').forEach(btn => {
    btn.addEventListener('click', () => {
      void exportReport(btn.dataset.export);
    });
  });
  $('btnSendReport')?.addEventListener('click', () => {
    void sendReportByEmail();
  });
}

function renderSettings() {
  const root = $('page-settings');
  if (!root) return;
  const inh = state.inherited;
  const locPref = window.MusomoI18n?.getStoredPreference?.() || 'system';
  const uiTheme = normalizeUiTheme(state.settings.uiTheme);
  const dateFmt = normalizeDateFormat(state.settings.dateFormat);
  const locOpts = [
    ['system', 'languageSystem'],
    ['en', 'languageEn'],
    ['it', 'languageIt'],
    ['fr', 'languageFr'],
    ['es', 'languageEs'],
    ['de', 'languageDe']
  ]
    .map(
      ([v, k]) =>
        `<option value="${v}"${locPref === v ? ' selected' : ''}>${tr(k)}</option>`
    )
    .join('');
  root.innerHTML = `
    <div class="settings-layout">
      <div class="settings-layout__col settings-layout__col--main">
      <div class="settings-section">
        <h3>${tr('studioProfile')}</h3>
        <p class="hint">${tr('studioProfileHint')}</p>
        <div class="field">
          <label>${tr('companyLogo')}</label>
          <div class="settings-logo-row">
            <div class="settings-logo-preview" id="settingsLogoPreview"></div>
            <div>
              <button type="button" class="btn" id="btnUploadLogo">${tr('uploadPrintLogo')}</button>
              <p class="hint" style="margin:6px 0 0">${tr('logoHint')}</p>
            </div>
          </div>
        </div>
        <div class="field">
          <label>${tr('avatarLabel')}</label>
          <div class="settings-logo-row">
            <div class="settings-logo-preview" id="settingsAvatarPreview"></div>
            <div>
              <button type="button" class="btn" id="btnUploadAvatar">${tr('uploadAvatar')}</button>
              <p class="hint" style="margin:6px 0 0">${tr('avatarHint')}</p>
            </div>
          </div>
        </div>
        <div class="field">
          <label for="sCompany">${tr('companyName')}</label>
          <input id="sCompany" value="${escapeHtml(state.settings.company)}" />
        </div>
        <div class="field">
          <label for="sDisplayName">${tr('displayName')}</label>
          <input id="sDisplayName" value="${escapeHtml(state.settings.displayName || '')}" placeholder="e.g. Alex" />
        </div>
        <div class="field">
          <label for="sDefaultRate">${tr('defaultRate')}</label>
          <input id="sDefaultRate" type="number" min="0" step="1" value="${state.settings.defaultRate}" />
        </div>
        <div class="field">
          <label for="sCurrency">${tr('currencyDefault')}</label>
          <select id="sCurrency">${currencySelectOptions(getStudioCurrency())}</select>
          <p class="hint" style="margin:6px 0 0">${tr('currencyHint')}</p>
        </div>
        <div class="field">
          <label for="sReportHeaderNote">${tr('reportHeaderNote')}</label>
          <textarea id="sReportHeaderNote" rows="3" placeholder="${escapeHtml(tr('reportHeaderNotePlaceholder'))}">${escapeHtml(state.settings.reportHeaderNote || '')}</textarea>
          <p class="hint" style="margin:6px 0 0">${tr('reportHeaderNoteHint')}</p>
        </div>
        <div class="field">
          <label for="sFooter">${tr('reportFooter')}</label>
          <textarea id="sFooter" rows="3" placeholder="${escapeHtml(tr('reportFooterPlaceholder'))}">${escapeHtml(state.settings.reportFooter)}</textarea>
          <p class="hint" style="margin:6px 0 0">${tr('reportFooterHint')}</p>
        </div>
        <button type="button" class="btn btn-primary" id="btnSaveSettings">${tr('saveSettings')}</button>
      </div>
      <div class="settings-section">
        <h3>${tr('appearanceSection')}</h3>
        <p class="hint">${tr('appearanceHint')}</p>
        <div class="field">
          <label for="sUiTheme">${tr('uiThemeLabel')}</label>
          <select id="sUiTheme">
            <option value="light"${uiTheme === 'light' ? ' selected' : ''}>${tr('uiThemeLight')}</option>
            <option value="dark"${uiTheme === 'dark' ? ' selected' : ''}>${tr('uiThemeDark')}</option>
          </select>
        </div>
      </div>
      </div>
      <div class="settings-layout__col settings-layout__col--side">
      <div class="settings-section">
        <h3>${tr('languageSection')}</h3>
        <p class="hint">${tr('languageHint')}</p>
        <div class="field">
          <label for="sLocale">${tr('languageSection')}</label>
          <select id="sLocale">${locOpts}</select>
        </div>
        <div class="field">
          <label for="sDateFormat">${tr('dateFormat')}</label>
          <select id="sDateFormat">
            <option value="european"${dateFmt === 'european' ? ' selected' : ''}>${tr('dateFormatEuropean')}</option>
            <option value="american"${dateFmt === 'american' ? ' selected' : ''}>${tr('dateFormatAmerican')}</option>
          </select>
          <p class="hint" style="margin:6px 0 0">${tr('dateFormatHint')}</p>
        </div>
        <div class="settings-inherited" style="margin-top:12px">
          <dl>
            <div><dt>${tr('timeFormat')}</dt><dd>${escapeHtml(inh.timeFormat)}</dd></div>
          </dl>
        </div>
      </div>
      <div class="settings-section">
        <h3>${tr('dataSection')}</h3>
        <p class="hint">${tr('dataHint')}</p>
        <div class="field" style="display:flex;flex-wrap:wrap;gap:8px">
          <button type="button" class="btn" id="btnSettingsRefresh">${tr('refreshFromDb')}</button>
          <button type="button" class="btn" id="btnCleanDatabase">${tr('cleanDatabase')}</button>
          <button type="button" class="btn" id="btnRestoreDemo">${tr('restoreDemo')}</button>
        </div>
        <div class="field" style="margin-top:14px">
          <label for="sBackupName">${tr('backupName')}</label>
          <p class="hint" style="margin:4px 0 8px">${tr('backupNameHint')}</p>
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
            <input id="sBackupName" type="text" maxlength="64" placeholder="${escapeHtml(tr('backupNamePlaceholder'))}" style="flex:1;min-width:180px">
            <button type="button" class="btn" id="btnCreateBackup">${tr('createBackup')}</button>
          </div>
        </div>
        <div class="field" style="margin-top:14px">
          <label for="sArchiveList">${tr('restoreArchive')}</label>
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
            <select id="sArchiveList" style="flex:1;min-width:180px">
              <option value="">${tr('loading')}</option>
            </select>
            <button type="button" class="btn" id="btnRestoreArchive">${tr('restoreSelected')}</button>
            <button type="button" class="btn" id="btnDeleteArchive">${tr('deleteArchive')}</button>
          </div>
        </div>
      </div>
      </div>
    </div>
  `;

  const syncLogoPreview = () => {
    setBrandPreviewEl($('settingsLogoPreview'), state.settings.logoDataUrl, state.settings.logoInitials);
  };
  const syncAvatarPreview = () => {
    setBrandPreviewEl($('settingsAvatarPreview'), state.settings.avatarDataUrl, state.settings.logoInitials);
  };
  syncLogoPreview();
  syncAvatarPreview();

  const pickBrandImage = kind => {
    void (async () => {
      try {
        const path = await openBrandFileDialog();
        if (path) {
          await importBrandFile(kind, path);
        } else {
          const file = await pickBrandFileViaInput();
          if (!file) return;
          if (!fileLooksLikeImage(file)) {
            alert('Please choose PNG, JPEG or SVG.');
            return;
          }
          const dataUrl = await prepareBrandDataUrl(file, kind);
          await saveBrandImage(kind, dataUrl);
        }
        syncLogoPreview();
        syncAvatarPreview();
        syncProfileChrome();
        if (state.page === 'reports') renderReports();
      } catch (err) {
        alert(`Could not upload image: ${String(err?.message || err)}`);
      }
    })();
  };

  $('sLocale')?.addEventListener('change', e => {
    const pref = e.target.value || 'system';
    window.MusomoI18n?.setLocale?.(pref);
  });
  $('sUiTheme')?.addEventListener('change', e => {
    applyUiTheme(e.target.value);
    void persistSettings();
  });
  $('sDateFormat')?.addEventListener('change', e => {
    applyDateFormat(e.target.value);
    void persistSettings().then(() => refreshAfterDateFormatChange());
  });
  $('btnUploadLogo')?.addEventListener('click', () => pickBrandImage('logo'));
  $('btnUploadAvatar')?.addEventListener('click', () => pickBrandImage('avatar'));
  $('btnSaveSettings')?.addEventListener('click', async () => {
    state.settings.company = String($('sCompany')?.value || '').trim() || state.settings.company;
    state.settings.displayName = String($('sDisplayName')?.value || '').trim() || 'there';
    state.settings.defaultRate = Number($('sDefaultRate')?.value) || state.settings.defaultRate;
    state.settings.currency = normalizeCurrency($('sCurrency')?.value) || getStudioCurrency();
    state.inherited.currency = state.settings.currency;
    state.settings.reportFooter = String($('sFooter')?.value || '').trim();
    state.settings.reportHeaderNote = String($('sReportHeaderNote')?.value || '').trim();
    const words = state.settings.company.split(/\s+/).filter(Boolean);
    state.settings.logoInitials =
      words.length >= 2 ? (words[0][0] + words[1][0]).toUpperCase() : (words[0]?.slice(0, 2) || 'MD').toUpperCase();
    syncLogoPreview();
    syncAvatarPreview();
    const ok = await persistSettings();
    syncProfileChrome();
    if (state.page === 'reports') renderReports();
    if (ok) alert(tr('settingsSaved'));
  });
  $('btnSettingsRefresh')?.addEventListener('click', async () => {
    try {
      await refreshFromDatabase();
      alert('Data reloaded from local database.');
    } catch (err) {
      alert(`Refresh failed: ${String(err?.message || err)}`);
    }
  });
  $('btnCleanDatabase')?.addEventListener('click', async () => {
    const ok = confirm(tr('cleanDatabaseConfirm')) && confirm(tr('cleanDatabaseConfirm2'));
    if (!ok) return;
    try {
      await cleanDatabase({ reseed: false });
      alert(tr('cleanDatabaseDone'));
      renderSettings();
    } catch (err) {
      alert(tr('cleanDatabaseFailed', { error: String(err?.message || err) }));
    }
  });
  $('btnRestoreDemo')?.addEventListener('click', async () => {
    const ok = confirm(tr('restoreDemoConfirm'));
    if (!ok) return;
    try {
      await cleanDatabase({ reseed: true });
      alert(tr('restoreDemoDone'));
      renderSettings();
    } catch (err) {
      alert(tr('restoreDemoFailed', { error: String(err?.message || err) }));
    }
  });

  const archiveSelect = $('sArchiveList');
  let archiveEntries = [];
  const refreshArchiveList = async (selectName) => {
    if (!archiveSelect) return;
    try {
      archiveEntries = (await invoke('tracker_list_archives')) || [];
      if (!archiveEntries.length) {
        archiveSelect.innerHTML = `<option value="">${tr('noArchivesYet')}</option>`;
        return;
      }
      archiveSelect.innerHTML = archiveEntries
        .map(entry => {
          const display = formatArchiveOptionLabel(entry);
          return `<option value="${escapeHtml(entry.name)}"${entry.name === selectName ? ' selected' : ''}>${escapeHtml(display)}</option>`;
        })
        .join('');
    } catch (err) {
      archiveEntries = [];
      archiveSelect.innerHTML = `<option value="">${tr('archivesListFailed')}</option>`;
      console.warn(err);
    }
  };
  void refreshArchiveList();
  $('btnCreateBackup')?.addEventListener('click', async () => {
    const label = String($('sBackupName')?.value || '').trim();
    if (!label) {
      alert(tr('backupNameRequired'));
      return;
    }
    try {
      const name = await invoke('tracker_create_backup', { label });
      $('sBackupName').value = '';
      await refreshArchiveList(name);
      alert(tr('backupCreated', { name }));
    } catch (err) {
      alert(tr('backupCreateFailed', { error: String(err?.message || err) }));
    }
  });
  $('btnRestoreArchive')?.addEventListener('click', async () => {
    const name = String(archiveSelect?.value || '').trim();
    if (!name) {
      alert(tr('selectArchiveFirst'));
      return;
    }
    const entry = archiveEntries.find(item => item.name === name);
    const display = formatArchiveOptionLabel(entry || { name });
    const ok = confirm(tr('restoreArchiveConfirm', { name: display }));
    if (!ok) return;
    try {
      await restoreArchive(name);
      alert(tr('archiveRestored'));
      await refreshArchiveList();
    } catch (err) {
      alert(tr('restoreFailed', { error: String(err?.message || err) }));
    }
  });
  $('btnDeleteArchive')?.addEventListener('click', async () => {
    const name = String(archiveSelect?.value || '').trim();
    if (!name) {
      alert(tr('selectArchiveFirst'));
      return;
    }
    const entry = archiveEntries.find(item => item.name === name);
    const display = formatArchiveOptionLabel(entry || { name });
    const ok = confirm(tr('deleteArchiveConfirm', { name: display }));
    if (!ok) return;
    try {
      await invoke('tracker_delete_archive', { name });
      await refreshArchiveList();
      alert(tr('archiveDeleted'));
    } catch (err) {
      alert(tr('deleteArchiveFailed', { error: String(err?.message || err) }));
    }
  });
}


let _pushMiniTimer = null;
function timerStatePayload() {
  const secs = liveTimerSeconds();
  const { project, client } = getTimerContext();
  return {
    running: !!state.timerRunning,
    seconds: secs,
    baseSeconds: Math.max(0, Math.floor(state.timerSeconds || 0)),
    runStartedAt: state.timerRunning ? state.timerRunStartedAt : null,
    project: project?.name || '',
    client: client?.company || '',
    projectId: project?.id || state.timer.projectId || '',
    day: state.timer.day || todayIsoDate(),
    dayStart: state.timer.dayStart || '',
    pauseAccumSec: state.timer.pauseAccumSec || 0
  };
}

/** Studio → Mini: Tauri event (localStorage is NOT reliable across webviews). */
function pushTimerStateToMini(immediate = false) {
  const send = () => {
    _pushMiniTimer = null;
    void invoke('tracker_push_timer_state', { state: timerStatePayload() }).catch(() => {});
  };
  if (immediate) {
    if (_pushMiniTimer) {
      clearTimeout(_pushMiniTimer);
      _pushMiniTimer = null;
    }
    send();
    return;
  }
  if (_pushMiniTimer) return;
  _pushMiniTimer = window.setTimeout(send, 180);
}

function syncTimerUi() {
  applyTimerContext();
  const secs = liveTimerSeconds();
  const t = formatHms(secs);
  const { project, client, rate } = getTimerContext();
  const cost = formatMoney(computeSessionCost(secs, rate), currencyForClient(client));
  const metric = $('metricTimer');
  const ring = $('ringTime');
  const pause = $('btnPause');
  const accCost = $('accCost');
  const ringPrefix = activeRingPrefix();
  const timerMain = $timer(ringPrefix + 'MainTime') || $('timerMainTime');
  const timerCost = $('timerMainCost') || $timer('timerMainCost');
  const timerStatus = $timer(ringPrefix + 'MainStatus') || $('timerMainStatus');
  const btnStart = $('btnTimerStart');
  const btnPause = $('btnTimerPause');
  const btnResume = $('btnTimerResume');
  if (metric) metric.textContent = t;
  if (ring) ring.textContent = t;
  if (pause) pause.textContent = state.timerRunning ? tr('pause') : tr('resume');
  const btnStop = $('btnStop');
  const btnTimerStop = $('btnTimerStop');
  if (btnStop) btnStop.textContent = tr('stop');
  if (accCost) accCost.textContent = cost;
  if (timerMain) timerMain.textContent = t;
  if (timerCost) timerCost.textContent = cost;
  if (timerStatus) {
    const label = timerStatus.querySelector('.timer-ring-lg__status-label');
    const statusText = state.timerRunning ? tr('running') : secs > 0 ? tr('paused') : tr('stopped');
    if (label) label.textContent = statusText;
    else timerStatus.textContent = statusText;
    timerStatus.classList.remove('is-running', 'is-paused', 'is-stopped');
    timerStatus.classList.add(timerStatusClass(state.timerRunning, secs));
  }
  applyTimerRingGeometry(timerRingGeometry(liveTimerSecondsFloat()), ringPrefix);
  const setBtnLabel = (btn, key) => {
    if (!btn) return;
    const lab = btn.querySelector('.timer-btn-label');
    if (lab) lab.textContent = tr(key);
    else btn.textContent = tr(key);
  };
  setBtnLabel(btnTimerStop, 'stop');
  setBtnLabel(btnPause, 'pause');
  setBtnLabel(btnStart, 'start');
  setBtnLabel(btnResume, 'resume');
  if (btnStart) btnStart.hidden = state.timerRunning || secs > 0;
  if (btnPause) btnPause.hidden = !state.timerRunning;
  if (btnResume) btnResume.hidden = state.timerRunning || secs === 0;
  try {
    // Preserve pending mini actions so the UI tick does not wipe Pause/Stop before Studio handles them.
    let pendingAction = null;
    let pendingActionAt = null;
    try {
      const prev = JSON.parse(localStorage.getItem('tracker-studio-timer') || '{}');
      if (prev.action && prev.actionAt) {
        pendingAction = prev.action;
        pendingActionAt = prev.actionAt;
      }
    } catch (_) {
      /* ignore */
    }
    localStorage.setItem(
      'tracker-studio-timer',
      JSON.stringify({
        running: state.timerRunning,
        seconds: secs,
        baseSeconds: Math.max(0, Math.floor(state.timerSeconds || 0)),
        runStartedAt: state.timerRunning ? state.timerRunStartedAt : null,
        project: project?.name || MOCK.project,
        client: client?.company || MOCK.client,
        projectId: project?.id || state.timer.projectId || '',
        day: state.timer.day || todayIsoDate(),
        dayStart: state.timer.dayStart || '',
        pauseAccumSec: state.timer.pauseAccumSec || 0,
        action: pendingAction,
        actionAt: pendingActionAt
      })
    );
  } catch (_) {
    /* ignore */
  }
  pushTimerStateToMini(false);
}


function stopRingAnim() {
  if (state.ringRafId) {
    cancelAnimationFrame(state.ringRafId);
    state.ringRafId = null;
  }
}

function startRingAnim() {
  stopRingAnim();
  const frame = () => {
    if (!state.timerRunning) {
      state.ringRafId = null;
      return;
    }
    const floatSecs = liveTimerSecondsFloat();
    const prefix = activeRingPrefix();
    applyTimerRingGeometry(timerRingGeometry(floatSecs), prefix);
    const timerMain = $timer(prefix + 'MainTime');
    if (timerMain) timerMain.textContent = formatHms(Math.floor(floatSecs));
    const metric = $('metricTimer');
    if (metric) metric.textContent = formatHms(Math.floor(floatSecs));
    state.ringRafId = requestAnimationFrame(frame);
  };
  state.ringRafId = requestAnimationFrame(frame);
}

/** UI refresh only — elapsed comes from wall clock, not +1 counting. */
function startTick() {
  stopTick();
  startRingAnim();
  state.tickId = window.setInterval(() => {
    maybeRolloverTimerDay();
    if (!state.timerRunning) return;
    syncTimerUi();
  }, 1000);
  // Catch up immediately when returning from background (throttled intervals).
  syncTimerUi();
}

function stopTick() {
  stopRingAnim();
  stopPausedWatch();
  if (state.tickId) {
    clearInterval(state.tickId);
    state.tickId = null;
  }
}

function stopPausedWatch() {
  if (state.pauseWatchId) {
    clearInterval(state.pauseWatchId);
    state.pauseWatchId = null;
  }
}

function startPausedWatch() {
  if (state.pauseWatchId) return;
  state.pauseWatchId = window.setInterval(() => {
    maybeRolloverTimerDay();
  }, 1000);
}

function resetOpenTimerLocal() {
  state.timerRunning = false;
  state.timerRunStartedAt = null;
  state.timerSeconds = 0;
  state.timer.pauseStartedAt = null;
  state.timer.pauseAccumSec = 0;
  state.timer.dayStart = '';
  stopTick();
  syncTimerUi();
}

async function discardOpenTimerSession() {
  try {
    await invoke('tracker_discard_open_timer');
  } catch (_) {
    /* ignore */
  }
  resetOpenTimerLocal();
}

function toggleTimer() {
  if (state.timerRunning) timerPause();
  else timerStart();
}

function bindMiniTimerSync() {
  if (state._miniSyncBound) return;
  state._miniSyncBound = true;
  let lastActionAt = 0;

  const clearPendingAction = () => {
    try {
      const raw = localStorage.getItem('tracker-studio-timer');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data.action) return;
      localStorage.setItem(
        'tracker-studio-timer',
        JSON.stringify({ ...data, action: null, actionAt: null })
      );
    } catch (_) {
      /* ignore */
    }
  };

  const applyMiniSecondsHint = hint => {
    // Never reinflate seconds while a commit is in flight or after Stop cleared the session.
    if (state.timer.committing || stopTimerInFlight) return;
    const secs = Math.floor(Number(hint));
    if (!Number.isFinite(secs) || secs < 0) return;
    state.timerSeconds = secs;
    state.timerRunStartedAt = null;
  };

  const handlePayload = data => {
    if (!data || typeof data !== 'object') return;
    const actionAt = Number(data.actionAt) || 0;
    if (!data.action || !actionAt || actionAt === lastActionAt) return;
    lastActionAt = actionAt;
    clearPendingAction();
    if (data.action === 'pause') {
      applyMiniSecondsHint(data.seconds);
      if (state.timerRunning) timerPause();
      else {
        state.timerRunning = false;
        state.timerRunStartedAt = null;
        if (!state.timer.pauseStartedAt) state.timer.pauseStartedAt = Date.now();
        stopTick();
        syncTimerUi();
      }
      pushTimerStateToMini(true);
    } else if (data.action === 'resume' || data.action === 'start') {
      if (state.timer.committing || stopTimerInFlight) return;
      applyMiniSecondsHint(data.seconds);
      timerResume();
      pushTimerStateToMini(true);
    } else if (data.action === 'stop') {
      if (state.timer.committing || stopTimerInFlight) return;
      const hasOpen =
        state.timerRunning ||
        !!state.timer.dayStart ||
        liveTimerSeconds() > 0 ||
        Math.floor(state.timerSeconds || 0) > 0;
      if (!hasOpen) return;
      applyMiniSecondsHint(data.seconds);
      void stopTimer(true).then(async () => {
        pushTimerStateToMini(true);
        try {
          await invoke('tracker_clear_timer_pending_commit');
        } catch (_) {
          /* ignore */
        }
      });
    } else if (data.action === 'discard') {
      resetOpenTimerLocal();
    }
  };

  const drainPendingMiniAction = () => {
    try {
      const raw = localStorage.getItem('tracker-studio-timer');
      if (!raw) return;
      handlePayload(JSON.parse(raw));
    } catch (_) {
      /* ignore */
    }
  };

  window.addEventListener('storage', e => {
    if (e.key !== 'tracker-studio-timer' || !e.newValue) return;
    try {
      handlePayload(JSON.parse(e.newValue));
    } catch (_) {
      /* ignore */
    }
  });

  // Storage events can miss same-origin edge cases — poll pending mini actions.
  window.setInterval(drainPendingMiniAction, 400);

  // When returning from InDesign/Blender, process pending Pause/Stop immediately (intervals are throttled).
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      drainPendingMiniAction();
      maybeRolloverTimerDay();
      syncTimerUi();
    }
  });
  window.addEventListener('focus', () => {
    drainPendingMiniAction();
    maybeRolloverTimerDay();
    syncTimerUi();
  });

  // Direct wake from mini (not throttled with background timers).
  const listen = window.__TAURI__?.event?.listen;
  if (typeof listen === 'function') {
    void listen('tracker-mini-action', event => {
      const payload = event?.payload ?? event;
      handlePayload(payload);
    });
  }

  drainPendingMiniAction();
}

async function openMini() {
  syncTimerUi();
  pushTimerStateToMini(true);
  try {
    await invoke('open_tracker_mini');
    // Mini webview may boot a moment later — push again.
    window.setTimeout(() => pushTimerStateToMini(true), 120);
    window.setTimeout(() => pushTimerStateToMini(true), 400);
  } catch (err) {
    alert(String(err?.message || err || 'Unable to open mini timer'));
  }
}

async function closeMini() {
  try {
    const runtime = await runtimeGetTimerState();
    if (runtime?.pendingCommit && Number(runtime.pendingCommit.secs) > 0) {
      await restoreTimerRuntime();
    }

    const active =
      runtimeHasActiveOpenSession(runtime) ||
      !!state.timerRunning ||
      liveTimerSeconds() > 0 ||
      !!state.timer.dayStart;
    if (!active) {
      await invoke('close_tracker_mini');
      return;
    }

    if (closeDialogOpen) return;
    closeDialogOpen = true;
    try {
      const choice = await sessionCloseChoiceDialog();
      if (!choice) return;
      if (choice === 'save_close') {
        await stopTimer(true);
        pushTimerStateToMini(true);
      } else if (choice === 'save_pause') {
        timerPause();
        pushTimerStateToMini(true);
      } else if (choice === 'discard') {
        await discardOpenTimerSession();
      }
      await invoke('close_tracker_mini');
    } finally {
      closeDialogOpen = false;
    }
  } catch (err) {
    console.warn('closeMini', err);
  }
}

function getAppVersion() {
  return window.MUSOMO_APP_VERSION || '1.1.0';
}

function versionLabelText() {
  return tr('versionLabel', { version: getAppVersion() });
}

function applyVersionDisplay() {
  const badge = $('appVersionBadge');
  if (badge) badge.textContent = `v${getAppVersion()}`;
  const aboutLine = $('aboutVersionLine');
  if (aboutLine) aboutLine.textContent = versionLabelText();
  const helpLine = $('helpVersionLine');
  if (helpLine) helpLine.textContent = versionLabelText();
}

function renderHelpModalBody() {
  const body = $('helpModalBody');
  if (!body) return;
  body.innerHTML = HELP_SECTIONS.map(([titleKey, bodyKey]) => `
    <section class="help-section">
      <h3>${escapeHtml(tr(titleKey))}</h3>
      <p>${escapeHtml(tr(bodyKey))}</p>
    </section>
  `).join('');
}

async function openExternalUrl(urlKey) {
  const url = MUSOMO_URLS[urlKey] || urlKey;
  if (!url || typeof url !== 'string') return;
  try {
    await invoke('open_url', { url });
  } catch (err) {
    alert(String(err?.message || err || 'Unable to open link'));
  }
}

function openAboutModal() {
  applyVersionDisplay();
  applyStaticI18n();
  const modal = $('aboutModal');
  if (modal) modal.hidden = false;
}

function closeAboutModal() {
  const modal = $('aboutModal');
  if (modal) modal.hidden = true;
}

function openHelpModal() {
  applyVersionDisplay();
  applyStaticI18n();
  renderHelpModalBody();
  const modal = $('helpModal');
  if (modal) modal.hidden = false;
}

function closeHelpModal() {
  const modal = $('helpModal');
  if (modal) modal.hidden = true;
}

function openPrivacyModal() {
  applyStaticI18n();
  const modal = $('privacyModal');
  if (modal) modal.hidden = false;
}

function closePrivacyModal() {
  const modal = $('privacyModal');
  if (modal) modal.hidden = true;
}

function bindAboutHelpModals() {
  $('btnHelp')?.addEventListener('click', openHelpModal);
  $('btnAbout')?.addEventListener('click', openAboutModal);
  $('aboutModalClose')?.addEventListener('click', closeAboutModal);
  $('helpModalClose')?.addEventListener('click', closeHelpModal);
  $('privacyModalClose')?.addEventListener('click', closePrivacyModal);

  $('aboutModal')?.addEventListener('click', e => {
    if (e.target === $('aboutModal')) closeAboutModal();
  });
  $('helpModal')?.addEventListener('click', e => {
    if (e.target === $('helpModal')) closeHelpModal();
  });
  $('privacyModal')?.addEventListener('click', e => {
    if (e.target === $('privacyModal')) closePrivacyModal();
  });

  document.querySelectorAll('[data-external-url]').forEach(btn => {
    btn.addEventListener('click', () => {
      void openExternalUrl(btn.dataset.externalUrl);
    });
  });

  document.querySelectorAll('[data-about-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.aboutAction;
      closeAboutModal();
      if (action === 'help') openHelpModal();
      else if (action === 'privacy') openPrivacyModal();
    });
  });
}

function bindQuickActions() {
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const a = btn.dataset.action;
      if (a === 'mini-timer') void openMini();
      else if (a === 'start-timer') {
        setPage('timer');
      } else if (a === 'new-client') {
        setPage('clients');
        openClientModal();
      } else if (a === 'new-project') {
        setPage('projects');
        openProjectModal();
      } else if (a === 'report') setPage('reports');
    });
  });
}

function bindClientModal() {
  $('clientModalCancel')?.addEventListener('click', closeClientModal);
  $('clientModalSave')?.addEventListener('click', () => void saveClient());
}

function bindProjectModal() {
  $('projectModalCancel')?.addEventListener('click', closeProjectModal);
  $('projectModalSave')?.addEventListener('click', () => void saveProject());
}

function bindTaskModal() {
  $('taskModalCancel')?.addEventListener('click', closeTaskModal);
  $('taskModalSave')?.addEventListener('click', saveNewTask);
}

function bindTopbar() {
  $('btnProfile')?.addEventListener('click', () => setPage('settings'));
  $('btnRefreshData')?.addEventListener('click', async () => {
    const btn = $('btnRefreshData');
    if (btn) btn.disabled = true;
    try {
      await refreshFromDatabase();
    } catch (err) {
      alert(`Refresh failed: ${String(err?.message || err)}`);
    } finally {
      if (btn) btn.disabled = false;
    }
  });
  $('btnNotifications')?.addEventListener('click', e => {
    e.stopPropagation();
    const pop = $('notificationsPopover');
    if (!pop) return;
    pop.hidden = !pop.hidden;
  });
  document.addEventListener('click', e => {
    const pop = $('notificationsPopover');
    if (!pop || pop.hidden) return;
    if (e.target.closest('#btnNotifications') || e.target.closest('#notificationsPopover')) return;
    pop.hidden = true;
  });
  $('globalSearch')?.addEventListener('input', e => applyGlobalSearch(e.target.value));
}

function syncManualEntryBreakField() {
  const spanSec = manualEntrySpanSec();
  const breakSec = breakSecFromInput();
  if (spanSec != null && breakSec > spanSec) {
    alert('Break cannot be longer than the time between start and end.');
    setManualClockField('mBreak', formatClockValueSec(spanSec));
  }
  syncManualEntryBillableFromWindow();
}

function bindManualEntryModal() {
  $('manualEntryCancel')?.addEventListener('click', closeManualEntryModal);
  $('manualEntrySave')?.addEventListener('click', () => void saveManualEntry());
  $('moveSessionCancel')?.addEventListener('click', closeMoveSessionModal);
  $('moveSessionConfirm')?.addEventListener('click', () => void confirmMoveSession());

  for (const id of ['mStart', 'mEnd', 'mBreak']) {
    bindFixedClockInput($(id), id === 'mBreak' ? syncManualEntryBreakField : syncManualEntryBillableFromWindow);
  }
  $('mProject')?.addEventListener('change', () => {
    if (state.sessionEditor.editingId) return;
    const projectId = $('mProject')?.value;
    if ($('mRate') && projectId) $('mRate').value = clientRateForProject(projectId) || '';
  });
}

const MENU_LABEL_KEYS = [
  'menuApp',
  'menuFile',
  'menuEdit',
  'menuWindow',
  'menuHelp',
  'menuLanguage',
  'menuSettings',
  'menuAbout',
  'menuHelpGuide',
  'menuLangSystem',
  'menuLangEnglish',
  'menuLangItalian',
  'menuLangSpanish',
  'menuLangFrench',
  'menuLangGerman'
];

function buildMenuLabels() {
  const labels = {};
  for (const key of MENU_LABEL_KEYS) labels[key] = tr(key);
  return labels;
}

async function syncAppMenuLocale() {
  try {
    await invoke('update_app_menu', { labels: buildMenuLabels() });
  } catch (err) {
    console.warn('Menu locale sync failed', err);
  }
}
window.syncAppMenuLocale = syncAppMenuLocale;

async function handleMenuAction(action) {
  switch (action) {
    case 'settings':
      setPage('settings');
      break;
    case 'about':
      openAboutModal();
      break;
    case 'help_quick':
      openHelpModal();
      break;
    case 'lang_system':
      window.MusomoI18n?.setLocale?.('system');
      break;
    case 'lang_en':
      window.MusomoI18n?.setLocale?.('en');
      break;
    case 'lang_it':
      window.MusomoI18n?.setLocale?.('it');
      break;
    case 'lang_es':
      window.MusomoI18n?.setLocale?.('es');
      break;
    case 'lang_fr':
      window.MusomoI18n?.setLocale?.('fr');
      break;
    case 'lang_de':
      window.MusomoI18n?.setLocale?.('de');
      break;
    default:
      break;
  }
}

async function bindNativeMenu() {
  const listen = window.__TAURI__?.event?.listen;
  if (typeof listen !== 'function') return;
  try {
    await listen('menu-action', event => {
      const action = event?.payload;
      if (typeof action === 'string' && action) void handleMenuAction(action);
    });
  } catch (_) {
    /* ignore */
  }
}

let allowAppExit = false;
let closeDialogOpen = false;

async function sessionCloseChoiceDialog() {
  try {
    return await invoke('tracker_session_close_dialog', {
      title: tr('activeSessionCloseTitle'),
      saveClose: tr('activeSessionCloseSaveClose'),
      savePause: tr('activeSessionCloseSavePause'),
      dontSave: tr('activeSessionCloseDontSave')
    });
  } catch (_) {
    return null;
  }
}

function closeVisibleModalFromEscape() {
  const ids = [
    'clientModal',
    'projectModal',
    'completeProjectModal',
    'taskModal',
    'manualEntryModal',
    'moveSessionModal',
    'aboutModal',
    'helpModal',
    'privacyModal'
  ];
  for (const id of ids) {
    const modal = $(id);
    if (modal && !modal.hidden) {
      modal.hidden = true;
      return true;
    }
  }
  return false;
}

async function runtimeGetTimerState() {
  try {
    return await invoke('tracker_get_timer_state');
  } catch (_) {
    return null;
  }
}

function runtimeIsRunning(data) {
  if (!data || typeof data !== 'object') return false;
  return !!data.running;
}

function runtimeHasActiveOpenSession(data) {
  if (!data || typeof data !== 'object') return false;
  if (data.pendingCommit && Number(data.pendingCommit.secs) > 0) return true;
  const base = Math.max(0, Number(data.baseSeconds ?? data.seconds) || 0);
  return !!data.running || base > 0 || !!String(data.dayStart || '').trim();
}

async function ensurePausePersisted() {
  if (state.timerRunning) {
    timerPause();
    pushTimerStateToMini(true);
    return;
  }
  if (liveTimerSeconds() > 0 || state.timer.dayStart) {
    pushTimerStateToMini(true);
  }
}

async function handleCloseRequest() {
  if (allowAppExit) {
    allowAppExit = true;
    await invoke('allow_app_exit');
    return;
  }
  if (closeDialogOpen) return;
  closeDialogOpen = true;
  try {
    const runtime = await runtimeGetTimerState();
    if (runtime?.pendingCommit && Number(runtime.pendingCommit.secs) > 0) {
      await restoreTimerRuntime();
    }

    const active =
      runtimeHasActiveOpenSession(runtime) ||
      !!state.timerRunning ||
      liveTimerSeconds() > 0 ||
      !!state.timer.dayStart;

    if (active) {
      const choice = await sessionCloseChoiceDialog();
      if (!choice) return;
      if (choice === 'save_close') {
        await stopTimer(true);
        pushTimerStateToMini(true);
      } else if (choice === 'save_pause') {
        timerPause();
        pushTimerStateToMini(true);
      } else if (choice === 'discard') {
        await discardOpenTimerSession();
      }
      allowAppExit = true;
      await invoke('allow_app_exit');
      return;
    }

    await ensurePausePersisted();
    allowAppExit = true;
    await invoke('allow_app_exit');
  } finally {
    closeDialogOpen = false;
  }
}

function bindEscapeGuard() {
  document.addEventListener(
    'keydown',
    e => {
      if (e.key !== 'Escape') return;
      if (closeVisibleModalFromEscape()) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      void handleCloseRequest();
    },
    true
  );
}

function bindMainCloseGuard() {
  try {
    const getWin = window.__TAURI__?.webviewWindow?.getCurrentWebviewWindow;
    if (typeof getWin !== 'function') return;
    const win = getWin();
    if (!win?.onCloseRequested) return;
    void win.onCloseRequested(event => {
      if (allowAppExit) return;
      event.preventDefault();
      void handleCloseRequest();
    });
  } catch (_) {
    /* ignore */
  }
}

async function handleAppExitRequested() {
  await handleCloseRequest();
}

async function bindAppExitGuard() {
  const listen = window.__TAURI__?.event?.listen;
  if (typeof listen !== 'function') return;
  try {
    await listen('app-exit-requested', () => {
      void handleAppExitRequested();
    });
  } catch (_) {
    /* ignore */
  }
}

async function init() {
  await window.MusomoI18n?.initLocale?.();
  applyStaticI18n();
  applyVersionDisplay();
  renderHelpModalBody();
  await syncAppMenuLocale();
  void bindNativeMenu();
  renderNav();
  renderOverview();
  applyTimerContext();
  await bootstrapTracker();
  applyUiTheme(state.settings.uiTheme);
  await restoreTimerRuntime();
  maybeRolloverTimerDay();
  refreshChrome();
  setPage('overview');
  bindQuickActions();
  bindAboutHelpModals();
  bindTopbar();
  bindClientModal();
  bindProjectModal();
  bindTaskModal();
  bindManualEntryModal();
  bindMiniTimerSync();
  syncTimerUi();
  bindEscapeGuard();
  bindMainCloseGuard();
  void bindAppExitGuard();
}

init();
