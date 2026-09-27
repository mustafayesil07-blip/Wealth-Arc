/* ============================================================
   WEALTH ARC — STORE
   Schema, migration, persistence and derived calculations.
   ============================================================ */

const KEY        = 'wealtharc_v5'
const LEGACY_KEY = 'wealtharc_v4'
const SCHEMA     = 5

/* ---- Categories ------------------------------------------ */
const DEFAULT_CATEGORIES = [
  { id: 'equities', name: 'Equities' },
  { id: 'options',  name: 'Options Collateral' },
  { id: 'cash',     name: 'Cash' },
  { id: 'bonds',    name: 'Bonds / SGOV' },
  { id: 'other',    name: 'Other' },
]

const CAT_VARS = ['--cat-1', '--cat-2', '--cat-3', '--cat-4', '--cat-5']

function catColor(index) { return `var(${CAT_VARS[index % CAT_VARS.length]})` }

/* ---- Defaults -------------------------------------------- */
function freshState() {
  return {
    schema: SCHEMA,
    currency: 'USD',
    theme: 'system',
    startValue: null,          // baseline net worth for benchmark targets
    benchmarkRate: 3,          // % per month
    accounts: [{ id: 'a_main', name: 'Portfolio', archived: false }],
    categories: DEFAULT_CATEGORIES.map(c => ({ ...c })),
    snapshots: [],
    goals: [],
    projection: { startVal: null, contrib: 5000, rate: 3, years: 5 },
  }
}

/* ---- Small helpers --------------------------------------- */
function uid(prefix) {
  return prefix + Math.random().toString(36).slice(2, 9)
}

function num(v, fallback = null) {
  if (v === '' || v === null || v === undefined) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function isMonthKey(s) { return typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s) }

function clampNote(s) { return typeof s === 'string' ? s.slice(0, 500) : '' }

function escapeHTML(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/* ---- Migration: v4 -> v5 --------------------------------- */
function migrateV4(v4) {
  const s = freshState()
  const accId = 'a_main'

  if (typeof v4.currency === 'string') s.currency = v4.currency
  if (Number.isFinite(v4.startValue) && v4.startValue > 0) s.startValue = v4.startValue
  if (Number.isFinite(v4.benchmarkRate)) s.benchmarkRate = v4.benchmarkRate

  if (v4.projectionInputs && typeof v4.projectionInputs === 'object') {
    s.projection = {
      startVal: num(v4.projectionInputs.startVal, null),
      contrib:  num(v4.projectionInputs.contrib, 5000),
      rate:     num(v4.projectionInputs.rate, 3),
      years:    num(v4.projectionInputs.years, 5),
    }
  }

  // Milestones -> goals
  if (Array.isArray(v4.milestones)) {
    s.goals = v4.milestones
      .map(Number).filter(n => Number.isFinite(n) && n > 0)
      .sort((a, b) => a - b)
      .map(t => ({ id: uid('g_'), name: compactMoney(t, s.currency), target: t, date: null }))
  }

  // Index the side tables by month
  const brkByMonth = {}
  if (Array.isArray(v4.breakdown)) {
    v4.breakdown.forEach(e => { if (isMonthKey(e && e.month)) brkByMonth[e.month] = e })
  }
  const incByMonth = {}
  if (Array.isArray(v4.optionsIncome)) {
    v4.optionsIncome.forEach(e => { if (isMonthKey(e && e.month)) incByMonth[e.month] = e })
  }

  // Months -> snapshots (single legacy account)
  const months = Array.isArray(v4.months)
    ? v4.months.filter(m => isMonthKey(m && m.month)).sort((a, b) => a.month.localeCompare(b.month))
    : []

  s.snapshots = months.map(m => {
    const brk = brkByMonth[m.month]
    const inc = incByMonth[m.month]
    const snap = {
      month: m.month,
      accounts: {
        [accId]: {
          begin: num(m.startPortfolio, null),
          fresh: num(m.actualContribution, 0) || 0,
          end:   num(m.actualPortfolio, null),
        },
      },
      planned: num(m.plannedContribution, null),
      allocation: null,
      options: null,
      note: clampNote(m.note),
    }
    if (brk) {
      snap.allocation = {
        equities: num(brk.equities, 0) || 0,
        options:  num(brk.optionsCollateral, 0) || 0,
        cash:     num(brk.cash, 0) || 0,
        bonds:    0,
        other:    num(brk.other, 0) || 0,
      }
    }
    if (inc) {
      snap.options = {
        premium: num(inc.premiumIncome, 0) || 0,
        pnl:     num(inc.realizedOptionsPnL, 0) || 0,
        capital: num(inc.capitalUsed, 0) || 0,
      }
    }
    return snap
  })

  // Baseline: the first snapshot's opening value. When the v4 data had no
  // opening figure for that month, the inferred one keeps
  // baseline + capital + growth = net worth consistent.
  if (s.snapshots.length) {
    const first = s.snapshots[0].accounts[accId]
    s.startValue = first.begin != null ? first.begin : resolveSnapshot(s, 0).begin
  }

  return s
}

/* ---- Sanitise any incoming v5 object --------------------- */
function sanitize(raw) {
  const s = freshState()
  if (!raw || typeof raw !== 'object') return s

  const CURRENCIES = ['USD', 'EUR', 'GBP', 'TRY', 'JPY', 'CHF', 'AUD', 'CAD']
  if (CURRENCIES.includes(raw.currency)) s.currency = raw.currency
  if (['light', 'dark', 'system'].includes(raw.theme)) s.theme = raw.theme

  const sv = num(raw.startValue, null)
  if (sv != null && sv > 0) s.startValue = sv

  const br = num(raw.benchmarkRate, null)
  if (br != null && br >= 0 && br <= 20) s.benchmarkRate = br

  // Accounts
  if (Array.isArray(raw.accounts)) {
    const list = raw.accounts
      .filter(a => a && typeof a.id === 'string' && typeof a.name === 'string')
      .map(a => ({ id: a.id, name: a.name.slice(0, 40) || 'Account', archived: !!a.archived }))
    if (list.length) s.accounts = list
  }
  const accIds = new Set(s.accounts.map(a => a.id))

  // Categories
  if (Array.isArray(raw.categories)) {
    const list = raw.categories
      .filter(c => c && typeof c.id === 'string' && typeof c.name === 'string')
      .map(c => ({ id: c.id, name: c.name.slice(0, 40) || 'Category' }))
    if (list.length) s.categories = list
  }
  const catIds = new Set(s.categories.map(c => c.id))

  // Snapshots
  if (Array.isArray(raw.snapshots)) {
    s.snapshots = raw.snapshots
      .filter(sn => sn && isMonthKey(sn.month))
      .map(sn => {
        const accounts = {}
        if (sn.accounts && typeof sn.accounts === 'object') {
          Object.keys(sn.accounts).forEach(id => {
            if (!accIds.has(id)) return
            const a = sn.accounts[id] || {}
            accounts[id] = {
              begin: num(a.begin, null),
              fresh: num(a.fresh, 0) || 0,
              end:   num(a.end, null),
            }
          })
        }
        let allocation = null
        if (sn.allocation && typeof sn.allocation === 'object') {
          allocation = {}
          Object.keys(sn.allocation).forEach(id => {
            if (catIds.has(id)) allocation[id] = num(sn.allocation[id], 0) || 0
          })
          if (!Object.keys(allocation).length) allocation = null
        }
        let options = null
        if (sn.options && typeof sn.options === 'object') {
          options = {
            premium: num(sn.options.premium, 0) || 0,
            pnl:     num(sn.options.pnl, 0) || 0,
            capital: num(sn.options.capital, 0) || 0,
          }
        }
        return {
          month: sn.month,
          accounts,
          planned: num(sn.planned, null),
          allocation,
          options,
          note: clampNote(sn.note),
        }
      })
      .sort((a, b) => a.month.localeCompare(b.month))
  }

  // Goals
  if (Array.isArray(raw.goals)) {
    s.goals = raw.goals
      .filter(g => g && num(g.target, 0) > 0)
      .map(g => ({
        id: typeof g.id === 'string' ? g.id : uid('g_'),
        name: typeof g.name === 'string' && g.name.trim() ? g.name.slice(0, 40) : 'Goal',
        target: num(g.target, 0),
        date: isMonthKey(g.date) ? g.date : null,
      }))
      .sort((a, b) => a.target - b.target)
  }

  // Projection inputs
  if (raw.projection && typeof raw.projection === 'object') {
    s.projection = {
      startVal: num(raw.projection.startVal, null),
      contrib:  Math.max(0, num(raw.projection.contrib, 5000) || 0),
      rate:     Math.min(10, Math.max(0.1, num(raw.projection.rate, 3) || 3)),
      years:    Math.min(30, Math.max(1, Math.round(num(raw.projection.years, 5) || 5))),
    }
  }

  // Baseline fallback
  if (s.startValue == null && s.snapshots.length) {
    const r = resolveSnapshot(s, 0)
    s.startValue = r.begin || r.end || null
  }

  return s
}

/* ---- Load / save ----------------------------------------- */
let state = freshState()
let migratedFromV4 = false

function load() {
  let parsed = null
  try { parsed = JSON.parse(localStorage.getItem(KEY) || 'null') } catch (e) { parsed = null }

  if (parsed && parsed.schema === SCHEMA) return sanitize(parsed)
  if (parsed && typeof parsed === 'object') return sanitize(parsed)

  // No v5 data — try to lift the v4 store
  let legacy = null
  try { legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null') } catch (e) { legacy = null }

  if (legacy && typeof legacy === 'object') {
    migratedFromV4 = true
    const lifted = sanitize(migrateV4(legacy))
    try { localStorage.setItem(KEY, JSON.stringify(lifted)) } catch (e) { /* quota */ }
    return lifted
  }

  return freshState()
}

function save() {
  state.schema = SCHEMA
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
    return true
  } catch (e) {
    return false
  }
}

/* ---- Formatting ------------------------------------------ */
const CURRENCY_SYMBOL = {
  USD: '$', EUR: '€', GBP: '£', TRY: '₺', JPY: '¥', CHF: 'Fr', AUD: 'A$', CAD: 'C$',
}

function sym(currency) { return CURRENCY_SYMBOL[currency || state.currency] || '$' }

/** Full money: $265,200 */
function money(v, opts) {
  if (v == null || !Number.isFinite(v)) return '—'
  const o = opts || {}
  const sign = v < 0 ? '-' : (o.signed && v > 0 ? '+' : '')
  const body = Math.abs(Math.round(v)).toLocaleString('en-US')
  return sign + sym() + body
}

/** Compact money: $265.2K / $1.24M */
function compactMoney(v, currency) {
  if (v == null || !Number.isFinite(v)) return '—'
  const s = CURRENCY_SYMBOL[currency || state.currency] || '$'
  const a = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (a >= 1e9) return sign + s + trimZero(a / 1e9) + 'B'
  if (a >= 1e6) return sign + s + trimZero(a / 1e6) + 'M'
  if (a >= 1e4) return sign + s + Math.round(a / 1e3) + 'K'
  if (a >= 1e3) return sign + s + trimZero(a / 1e3) + 'K'
  return sign + s + Math.round(a).toLocaleString('en-US')
}

function trimZero(n) {
  const r = n.toFixed(n < 10 ? 2 : 1)
  return r.replace(/\.0+$/, '').replace(/(\.\d)0$/, '$1')
}

function pct(v, digits) {
  if (v == null || !Number.isFinite(v)) return '—'
  const d = digits == null ? 2 : digits
  return (v > 0 ? '+' : '') + v.toFixed(d) + '%'
}

function pctPlain(v, digits) {
  if (v == null || !Number.isFinite(v)) return '—'
  return v.toFixed(digits == null ? 1 : digits) + '%'
}

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function monthLabel(key, short) {
  if (!isMonthKey(key)) return key || '—'
  const [y, m] = key.split('-')
  const names = short ? MONTH_SHORT : MONTH_NAMES
  return names[+m - 1] + ' ' + y
}

function monthShort(key) {
  if (!isMonthKey(key)) return key || ''
  const [, m] = key.split('-')
  return MONTH_SHORT[+m - 1]
}

function thisMonthKey() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}

function addMonths(key, n) {
  const [y, m] = key.split('-').map(Number)
  const total = y * 12 + (m - 1) + n
  const yy = Math.floor(total / 12)
  const mm = (total % 12) + 1
  return yy + '-' + String(mm).padStart(2, '0')
}

function monthDiff(a, b) {
  const [ay, am] = a.split('-').map(Number)
  const [by, bm] = b.split('-').map(Number)
  return (by * 12 + bm) - (ay * 12 + am)
}

function tone(v) { return v == null ? 'is-flat' : v > 0 ? 'is-pos' : v < 0 ? 'is-neg' : 'is-flat' }

/* ============================================================
   DERIVED VALUES
   ============================================================ */

/** Sorted snapshots (ascending by month). */
function snaps(st) { return (st || state).snapshots }

/**
 * Resolve one snapshot into totals.
 * Each account's opening balance falls back to its own previous closing
 * balance, so the user only has to type the opening figure once.
 */
function resolveSnapshot(st, index) {
  const S = st || state
  const sn = S.snapshots[index]
  if (!sn) return { begin: 0, fresh: 0, end: 0, growth: 0, ret: null, perAccount: {} }

  let begin = 0, fresh = 0, end = 0
  const perAccount = {}

  S.accounts.forEach(acct => {
    const rec = sn.accounts[acct.id]
    if (!rec) return

    let b = rec.begin
    if (b == null) {
      // Walk back for this account's last known closing value
      for (let i = index - 1; i >= 0; i--) {
        const prev = S.snapshots[i].accounts[acct.id]
        if (prev && prev.end != null) { b = prev.end; break }
      }
    }
    // Still unknown — this is the account's first appearance. Infer the
    // opening balance from the closing value so a newly tracked account
    // never books phantom growth in the month it joins.
    if (b == null) b = rec.end != null ? rec.end - (rec.fresh || 0) : 0

    const f = rec.fresh || 0
    const e = rec.end != null ? rec.end : b + f
    const g = e - b - f

    perAccount[acct.id] = { begin: b, fresh: f, end: e, growth: g,
                            ret: b > 0 ? (g / b) * 100 : null }
    begin += b; fresh += f; end += e
  })

  const growth = end - begin - fresh
  return { begin, fresh, end, growth, ret: begin > 0 ? (growth / begin) * 100 : null, perAccount }
}

/** All snapshots resolved, plus running series. */
function resolveAll(st) {
  const S = st || state
  return S.snapshots.map((sn, i) => {
    const r = resolveSnapshot(S, i)
    return {
      month: sn.month, note: sn.note, planned: sn.planned,
      allocation: sn.allocation, options: sn.options,
      ...r,
    }
  })
}

/** Everything the UI needs about the current position. */
function summary(st) {
  const S = st || state
  const rows = resolveAll(S)
  if (!rows.length) return null

  const last = rows[rows.length - 1]
  const prev = rows.length >= 2 ? rows[rows.length - 2] : null
  const baseline = S.startValue != null ? S.startValue : rows[0].begin

  const netWorth   = last.end
  const monthDelta = last.end - last.begin
  const monthPct   = last.begin > 0 ? (monthDelta / last.begin) * 100 : null

  const totalFresh  = rows.reduce((s, r) => s + r.fresh, 0)
  const totalGrowth = rows.reduce((s, r) => s + r.growth, 0)
  const plannedSum  = rows.reduce((s, r) => s + (r.planned != null ? r.planned : r.fresh), 0)
  const discipline  = plannedSum > 0 ? (totalFresh / plannedSum) * 100 : null

  // Time-weighted return — chained monthly sub-period returns
  const year = last.month.slice(0, 4)
  let cumFactor = 1, ytdFactor = 1, ytdCount = 0
  rows.forEach(r => {
    if (!(r.begin > 0)) return
    const f = 1 + (r.growth / r.begin)
    cumFactor *= f
    if (r.month.slice(0, 4) === year) { ytdFactor *= f; ytdCount++ }
  })
  const twrAll     = (cumFactor - 1) * 100
  const twrYtd     = ytdCount ? (ytdFactor - 1) * 100 : null
  const twrMonth   = last.begin > 0 ? (last.growth / last.begin) * 100 : null
  const monthsHeld = rows.filter(r => r.begin > 0).length
  const twrAvgMo   = monthsHeld ? (Math.pow(cumFactor, 1 / monthsHeld) - 1) * 100 : null
  const twrAnnual  = monthsHeld ? (Math.pow(cumFactor, 12 / monthsHeld) - 1) * 100 : null

  // Year-to-date capital & growth
  const ytdRows   = rows.filter(r => r.month.slice(0, 4) === year)
  const ytdFresh  = ytdRows.reduce((s, r) => s + r.fresh, 0)
  const ytdGrowth = ytdRows.reduce((s, r) => s + r.growth, 0)

  // Benchmark trajectory from the baseline using actual new capital
  const rate = (S.benchmarkRate || 0) / 100
  let bench = baseline
  const benchSeries = rows.map(r => {
    bench = bench * (1 + rate) + r.fresh
    return { month: r.month, value: Math.round(bench) }
  })
  const benchNow = benchSeries.length ? benchSeries[benchSeries.length - 1].value : null
  const benchGap = benchNow != null ? netWorth - benchNow : null

  // Options aggregate
  const optRows = rows.filter(r => r.options)
  const optYtd  = optRows.filter(r => r.month.slice(0, 4) === year)
  const optPremiumYtd = optYtd.reduce((s, r) => s + r.options.premium, 0)
  const optPnlYtd     = optYtd.reduce((s, r) => s + r.options.pnl, 0)
  const optAvgPnl     = optRows.length ? optRows.reduce((s, r) => s + r.options.pnl, 0) / optRows.length : null
  const optAvgCap     = optRows.length ? optRows.reduce((s, r) => s + r.options.capital, 0) / optRows.length : null
  const optRoc        = optAvgCap ? (optAvgPnl / optAvgCap) * 100 : null

  // Latest allocation
  let allocation = null
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].allocation) { allocation = { month: rows[i].month, values: rows[i].allocation }; break }
  }

  // Average monthly net worth gain — used for goal ETAs
  const span = rows.length >= 2 ? monthDiff(rows[0].month, last.month) : 0
  const avgMonthlyGain = span > 0 ? (netWorth - rows[0].begin) / span : null

  return {
    rows, last, prev, baseline, netWorth, monthDelta, monthPct,
    totalFresh, totalGrowth, plannedSum, discipline,
    twrAll, twrYtd, twrMonth, twrAvgMo, twrAnnual, monthsHeld,
    ytdFresh, ytdGrowth, year,
    benchSeries, benchNow, benchGap,
    optPremiumYtd, optPnlYtd, optAvgPnl, optAvgCap, optRoc, optCount: optRows.length,
    allocation, avgMonthlyGain,
  }
}

/** Goal progress, measured from the baseline so early goals read honestly. */
function goalProgress(goal, sum) {
  if (!sum) return { pct: 0, reached: false, remaining: goal.target, eta: null }
  const from = Math.min(sum.baseline, sum.netWorth)
  const span = goal.target - from
  const done = sum.netWorth - from
  const p = span > 0 ? Math.max(0, Math.min(100, (done / span) * 100)) : 100
  const reached = sum.netWorth >= goal.target
  const remaining = Math.max(0, goal.target - sum.netWorth)
  let eta = null
  if (!reached && sum.avgMonthlyGain > 0) eta = Math.ceil(remaining / sum.avgMonthlyGain)
  return { pct: reached ? 100 : p, reached, remaining, eta }
}

/** Compound a monthly-contribution projection. */
function project(startVal, contrib, monthlyRatePct, months) {
  const r = monthlyRatePct / 100
  const out = []
  let v = startVal
  for (let i = 1; i <= months; i++) {
    v = v * (1 + r) + contrib
    out.push(Math.round(v))
  }
  return out
}

/** Account display initials, e.g. "IBKR Mustafa" -> "IM" */
function initials(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '••'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}
