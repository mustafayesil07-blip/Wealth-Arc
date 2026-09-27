/* ============================================================
   WEALTH ARC — SHELL
   Router, chrome, theme, sheets, toasts, event wiring.
   ============================================================ */

/* ---- Icons ----------------------------------------------- */
const ICONS = {
  home:    '<path d="M4 10.4 12 4l8 6.4V19a1.4 1.4 0 0 1-1.4 1.4H5.4A1.4 1.4 0 0 1 4 19z"/><path d="M9.6 20.4v-5.8h4.8v5.8"/>',
  history: '<circle cx="12" cy="12" r="8.2"/><path d="M12 7.6V12l3 1.9"/>',
  lab:     '<path d="M3.5 19.5 9 13l3.6 2.4L20.5 6"/><path d="M16.3 6h4.2v4.2"/>',
  target:  '<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="3.4"/>',
  more:    '<circle cx="5.5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
  plus:    '<path d="M12 5.5v13M5.5 12h13"/>',
  chevron: '<path d="M1.4 1.4 6.6 6.5 1.4 11.6"/>',
  arrowUp: '<path d="M12 19V5"/><path d="M6.5 10.5 12 5l5.5 5.5"/>',
  arrowDown:'<path d="M12 5v14"/><path d="M6.5 13.5 12 19l5.5-5.5"/>',
  x:       '<path d="M5.5 5.5l13 13M18.5 5.5l-13 13"/>',
  check:   '<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>',
  trash:   '<path d="M4.5 7h15"/><path d="M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7"/><path d="M6.5 7l.9 12a1.4 1.4 0 0 0 1.4 1.3h6.4a1.4 1.4 0 0 0 1.4-1.3L17.5 7"/><path d="M10.5 11v5.5M13.5 11v5.5"/>',
  download:'<path d="M12 4v11"/><path d="M7.5 10.5 12 15l4.5-4.5"/><path d="M4.5 19.5h15"/>',
  upload:  '<path d="M12 15.5V4.5"/><path d="M7.5 9 12 4.5 16.5 9"/><path d="M4.5 19.5h15"/>',
  info:    '<circle cx="12" cy="12" r="8.2"/><path d="M12 11v5.5"/><path d="M12 7.8h.01"/>',
  warn:    '<path d="M10.7 4.2 2.6 18a1.5 1.5 0 0 0 1.3 2.2h16.2a1.5 1.5 0 0 0 1.3-2.2L13.3 4.2a1.5 1.5 0 0 0-2.6 0z"/><path d="M12 9.5v4M12 17h.01"/>',
  wallet:  '<path d="M3.8 8.5A2.2 2.2 0 0 1 6 6.3h12A2.2 2.2 0 0 1 20.2 8.5v7A2.2 2.2 0 0 1 18 17.7H6a2.2 2.2 0 0 1-2.2-2.2z"/><path d="M15.5 12h2"/>',
}

function icon(name, cls) {
  const box = name === 'chevron' ? '0 0 8 13' : '0 0 24 24'
  return `<svg class="${cls || ''}" viewBox="${box}" fill="none" stroke="currentColor"
    stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
    focusable="false">${ICONS[name] || ''}</svg>`
}

/* ---- UI state -------------------------------------------- */
const ui = { tab: 'home', range: 'all', nwHover: null, pjHover: null, showBench: true }

const TABS = [
  { id: 'home',       label: 'Home',    title: 'Wealth Arc', icon: 'home',    add: 'add-snapshot' },
  { id: 'history',    label: 'History', title: 'History',    icon: 'history', add: 'add-snapshot' },
  { id: 'projection', label: 'Lab',     title: 'Projection', icon: 'lab' },
  { id: 'goals',      label: 'Goals',   title: 'Goals',      icon: 'target',  add: 'add-goal' },
  { id: 'more',       label: 'More',    title: 'More',       icon: 'more' },
]

/* ---- Theme ----------------------------------------------- */
const systemDark = window.matchMedia('(prefers-color-scheme: dark)')

function applyTheme() {
  const mode = state.theme === 'system' ? (systemDark.matches ? 'dark' : 'light') : state.theme
  document.documentElement.dataset.theme = mode
  const meta = document.querySelector('meta[name="theme-color"]:not([media])')
  if (meta) meta.setAttribute('content', mode === 'dark' ? '#000000' : '#f5f5f7')
}

systemDark.addEventListener('change', () => {
  if (state.theme === 'system') { applyTheme(); redrawCharts() }
})

function setTheme(mode) {
  state.theme = mode
  save()
  applyTheme()
  render()
}

/* ---- Toast ----------------------------------------------- */
let toastTimer = null
function toast(message) {
  const el = document.getElementById('toast')
  if (!el) return
  el.textContent = message
  el.classList.add('is-on')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove('is-on'), 2600)
}

/* ---- Sheets ---------------------------------------------- */
let lastFocused = null

function openSheet(opts) {
  const root = document.getElementById('sheet-root')
  root.innerHTML = ''
  if (!lastFocused) lastFocused = document.activeElement

  root.innerHTML = `
    <div class="scrim" data-act="close-sheet"></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${escapeHTML(opts.title || '')}">
      <div class="sheet-grip" aria-hidden="true"><span></span></div>
      <div class="sheet-head">
        <h2 class="sheet-title">${escapeHTML(opts.title || '')}</h2>
        <button class="sheet-close" data-act="close-sheet" aria-label="Close">${icon('x')}</button>
      </div>
      <div class="sheet-body">${opts.body || ''}</div>
      ${opts.footer ? `<div class="sheet-foot">${opts.footer}</div>` : ''}
    </div>`

  document.body.style.overflow = 'hidden'
  const sheet = root.querySelector('.sheet')
  if (opts.onMount) opts.onMount(sheet)
  const focusable = sheet.querySelector('input:not([disabled]), button, select, textarea')
  if (focusable && !opts.onMount) focusable.focus({ preventScroll: true })
}

function closeSheet() {
  const root = document.getElementById('sheet-root')
  const sheet = root.querySelector('.sheet')
  const scrim = root.querySelector('.scrim')
  if (!sheet) return
  sheet.classList.add('is-closing')
  if (scrim) scrim.classList.add('is-closing')
  document.body.style.overflow = ''
  setTimeout(() => {
    root.innerHTML = ''
    if (lastFocused && document.body.contains(lastFocused)) {
      lastFocused.focus({ preventScroll: true })
    }
    lastFocused = null
  }, 170)
}

function sheetIsOpen() {
  return !!document.querySelector('#sheet-root .sheet:not(.is-closing)')
}

function confirmSheet(opts) {
  openSheet({
    title: opts.title,
    body: `<p class="small muted" style="line-height:1.6;padding:0 2px 6px">${opts.text}</p>`,
    footer: `
      <button class="btn" data-act="close-sheet">Cancel</button>
      <button class="btn ${opts.danger ? 'is-danger' : 'is-primary'}" data-act="confirm-ok">
        ${escapeHTML(opts.label || 'Confirm')}</button>`,
  })
  pendingConfirm = opts.onOk
}
let pendingConfirm = null

/* ---- Chrome ---------------------------------------------- */
function renderChrome() {
  const tab = TABS.find(t => t.id === ui.tab) || TABS[0]

  const bar = document.getElementById('topbar')
  bar.innerHTML = `
    <h1 class="topbar-title">${tab.title}</h1>
    ${tab.add ? `<button class="topbar-action is-primary" data-act="${tab.add}"
        aria-label="${tab.add === 'add-goal' ? 'Add goal' : 'Add snapshot'}">
        ${icon('plus')}<span>${tab.add === 'add-goal' ? 'Goal' : 'Month'}</span></button>` : ''}`

  const nav = document.getElementById('tabbar')
  nav.innerHTML = TABS.map(t => `
    <button class="tab" aria-current="${t.id === ui.tab ? 'page' : 'false'}"
            data-act="tab" data-arg="${t.id}">
      ${icon(t.icon)}<span class="tab-label">${t.label}</span>
    </button>`).join('')
}

/* ---- Router ---------------------------------------------- */
const VIEWS = {
  home:       { html: viewHome,       mount: mountHomeChart },
  history:    { html: viewHistory },
  projection: { html: viewProjection, mount: mountProjection },
  goals:      { html: viewGoals },
  more:       { html: viewMore,       mount: mountMore },
}

function render() {
  clearCharts()
  const def = VIEWS[ui.tab] || VIEWS.home
  const view = document.getElementById('view')
  view.innerHTML = def.html()
  renderChrome()
  if (def.mount) def.mount()
}

function navigate(tab) {
  if (!VIEWS[tab]) tab = 'home'
  if (ui.tab !== tab) { ui.nwHover = null; ui.pjHover = null }
  ui.tab = tab
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' })
  render()
  const view = document.getElementById('view')
  if (view) view.focus({ preventScroll: true })
}

/* ---- Actions --------------------------------------------- */
const ACTIONS = {
  tab: arg => navigate(arg),

  range: arg => {
    ui.range = arg
    ui.nwHover = null
    render()
  },

  'toggle-bench': () => {
    ui.showBench = !ui.showBench
    ui.nwHover = null
    render()
  },

  'add-snapshot':    () => openSnapshotSheet(null),
  'edit-snapshot':   arg => openSnapshotSheet(arg),
  'save-snapshot':   () => saveSnapshotFromSheet(),
  'delete-snapshot': arg => deleteSnapshot(arg),

  'account-detail':  arg => openAccountSheet(arg),
  'all-accounts':    () => openAllAccountsSheet(),
  'manage-accounts': () => openAccountsSheet(),
  'add-account':     () => addAccount(),
  'save-accounts':   () => saveAccountNames(),
  'delete-account':  arg => deleteAccount(arg),

  'manage-categories': () => openCategoriesSheet(),
  'add-category':      () => addCategory(),
  'save-categories':   () => saveCategoryNames(),
  'delete-category':   arg => deleteCategory(arg),

  'add-goal':    () => openGoalSheet(null),
  'edit-goal':   arg => openGoalSheet(arg),
  'save-goal':   arg => saveGoal(arg || null),
  'delete-goal': arg => deleteGoal(arg),

  'perf-detail':    () => openPerformanceSheet(),
  'options-detail': () => openOptionsSheet(),
  'alloc-trend':    () => openAllocationTrendSheet(),

  theme: arg => setTheme(arg),
  'save-portfolio': () => savePortfolioSettings(),
  'export-json': () => exportJSON(),
  'export-csv':  () => exportCSV(),
  import:        () => document.getElementById('import-file').click(),
  'reset-all':   () => resetAll(),

  'pj-reset': () => {
    const sum = summary()
    state.projection = {
      startVal: null,
      contrib: 5000,
      rate: state.benchmarkRate || 3,
      years: 5,
    }
    save()
    render()
    toast('Assumptions reset')
    void sum
  },

  'close-sheet': () => { pendingConfirm = null; closeSheet() },

  'confirm-ok': () => {
    const fn = pendingConfirm
    pendingConfirm = null
    closeSheet()
    if (fn) setTimeout(fn, 190)
  },
}

document.addEventListener('click', e => {
  const target = e.target.closest('[data-act]')
  if (!target) return
  const act = target.dataset.act
  const fn = ACTIONS[act]
  if (!fn) return
  e.preventDefault()
  fn(target.dataset.arg)
})

/* ---- Keyboard -------------------------------------------- */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && sheetIsOpen()) {
    pendingConfirm = null
    closeSheet()
    return
  }
  // Focus trap inside an open sheet
  if (e.key === 'Tab' && sheetIsOpen()) {
    const sheet = document.querySelector('#sheet-root .sheet')
    const items = [...sheet.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )].filter(el => el.offsetParent !== null)
    if (!items.length) return
    const first = items[0], last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }
})

/* ---- Scroll chrome --------------------------------------- */
let scrollRaf = null
window.addEventListener('scroll', () => {
  if (scrollRaf) return
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = null
    const bar = document.getElementById('topbar')
    if (bar) bar.classList.toggle('is-scrolled', window.scrollY > 4)
  })
}, { passive: true })

/* ---- Boot ------------------------------------------------ */
state = load()
applyTheme()
render()

if (migratedFromV4) {
  setTimeout(() => toast('Your data was upgraded — nothing lost'), 700)
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}
