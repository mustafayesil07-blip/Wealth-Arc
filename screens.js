/* ============================================================
   WEALTH ARC — PROJECTION, GOALS, MORE, SHEETS
   ============================================================ */

/* ============================================================
   PROJECTION
   ============================================================ */
function projectionInputs() {
  const sum = summary()
  const p = state.projection
  const start = p.startVal != null ? p.startVal : (sum ? sum.netWorth : 100000)
  return { start, contrib: p.contrib, rate: p.rate, years: p.years, sum }
}

function viewProjection() {
  const { start, contrib, rate, years } = projectionInputs()
  const maxStart = Math.max(500000, Math.ceil(start * 2 / 10000) * 10000)

  return `
    <div class="hero" style="padding-bottom:2px">
      <div class="hero-label">Projected Wealth</div>
      <div class="hero-value num" id="pj-final">—</div>
      <div class="hero-meta">
        <span class="hero-period" id="pj-when">—</span>
        <span class="chip is-accent" id="pj-multiple">—</span>
      </div>
    </div>

    <section class="section">
      <div class="card chart-card">
        <div class="chart-holder">
          <canvas id="pj-chart" aria-label="Projected wealth scenarios" role="img"></canvas>
          <div class="chart-tip" id="pj-tip" aria-hidden="true"></div>
        </div>
        <div class="legend">
          <span class="legend-item"><span class="legend-dash" style="background:var(--cat-3)"></span>Conservative</span>
          <span class="legend-item"><span class="legend-dash" style="background:var(--chart-line)"></span>Expected</span>
          <span class="legend-item"><span class="legend-dash" style="background:var(--accent)"></span>Optimistic</span>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2 class="section-title">Assumptions</h2>
        <button class="section-link" data-act="pj-reset">Reset</button>
      </div>
      <div class="card">
        <div class="field">
          <div class="slider-head">
            <span class="slider-name">Starting wealth</span>
            <span class="slider-value num" id="pj-start-out">${money(start)}</span>
          </div>
          <input type="range" id="pj-start" min="0" max="${maxStart}" step="1000" value="${start}"
                 aria-label="Starting wealth">
        </div>
        <div class="field">
          <div class="slider-head">
            <span class="slider-name">Monthly contribution</span>
            <span class="slider-value num" id="pj-contrib-out">${money(contrib)}</span>
          </div>
          <input type="range" id="pj-contrib" min="0" max="25000" step="250" value="${contrib}"
                 aria-label="Monthly contribution">
        </div>
        <div class="field">
          <div class="slider-head">
            <span class="slider-name">Expected monthly return</span>
            <span class="slider-value num" id="pj-rate-out">${pctPlain(rate, 1)}</span>
          </div>
          <input type="range" id="pj-rate" min="0.2" max="6" step="0.1" value="${rate}"
                 aria-label="Expected monthly return">
        </div>
        <div class="field">
          <div class="slider-head">
            <span class="slider-name">Time horizon</span>
            <span class="slider-value num" id="pj-years-out">${years} year${years === 1 ? '' : 's'}</span>
          </div>
          <input type="range" id="pj-years" min="1" max="25" step="1" value="${years}"
                 aria-label="Time horizon in years">
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head"><h2 class="section-title">Scenarios</h2></div>
      <div class="stats" id="pj-stats"></div>
    </section>

    <section class="section" id="pj-goals-wrap"></section>

    <section class="section">
      <div class="section-head"><h2 class="section-title">What this assumes</h2></div>
      <div class="group" id="pj-insights"></div>
    </section>`
}

function projectionScenarios() {
  const { start, contrib, rate, years } = projectionInputs()
  const months = years * 12
  const rates = {
    cons: Math.max(0.1, rate - 1),
    base: rate,
    opt:  rate + 1,
  }
  return {
    start, contrib, rate, years, months, rates,
    cons: project(start, contrib, rates.cons, months),
    base: project(start, contrib, rates.base, months),
    opt:  project(start, contrib, rates.opt, months),
    contributed: contrib * months,
  }
}

function renderProjectionOutputs() {
  const s = projectionScenarios()
  const startMonth = thisMonthKey()
  const endMonth = addMonths(startMonth, s.months)
  const final = s.base[s.base.length - 1]

  const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt }
  setText('pj-final', money(final))
  setText('pj-when', monthLabel(endMonth) + ' · ' + s.years + ' year' + (s.years === 1 ? '' : 's'))
  setText('pj-multiple', s.start > 0 ? (final / s.start).toFixed(1) + '× today' : '—')
  setText('pj-start-out', money(s.start))
  setText('pj-contrib-out', money(s.contrib))
  setText('pj-rate-out', pctPlain(s.rate, 1))
  setText('pj-years-out', s.years + ' year' + (s.years === 1 ? '' : 's'))

  const growth = final - s.start - s.contributed
  const stats = document.getElementById('pj-stats')
  if (stats) {
    stats.innerHTML = `
      <div class="stat">
        <div class="stat-label">Conservative · ${pctPlain(s.rates.cons, 1)}/mo</div>
        <div class="stat-value num">${compactMoney(s.cons[s.cons.length - 1])}</div>
        <div class="stat-sub">${money(s.cons[s.cons.length - 1] - final)} vs expected</div>
      </div>
      <div class="stat">
        <div class="stat-label">Optimistic · ${pctPlain(s.rates.opt, 1)}/mo</div>
        <div class="stat-value num">${compactMoney(s.opt[s.opt.length - 1])}</div>
        <div class="stat-sub">${money(s.opt[s.opt.length - 1] - final, { signed: true })} vs expected</div>
      </div>
      <div class="stat">
        <div class="stat-label">You contribute</div>
        <div class="stat-value num">${compactMoney(s.contributed)}</div>
        <div class="stat-sub">${money(s.contrib)} × ${s.months} months</div>
      </div>
      <div class="stat">
        <div class="stat-label">Compounding adds</div>
        <div class="stat-value num is-pos">${compactMoney(growth)}</div>
        <div class="stat-sub">${s.contributed > 0 ? (growth / s.contributed).toFixed(1) + '× your capital' : '—'}</div>
      </div>`
  }

  // Goal ETAs under the expected scenario
  const wrap = document.getElementById('pj-goals-wrap')
  if (wrap) {
    if (!state.goals.length) { wrap.innerHTML = '' } else {
      wrap.innerHTML = `
        <div class="section-head"><h2 class="section-title">Goal estimates</h2></div>
        <div class="group">
          ${state.goals.map(g => {
            const sub = `Target ${money(g.target)}`
            if (s.start >= g.target) {
              return rowStatic(escapeHTML(g.name), 'Reached', sub, '')
            }
            const idx = s.base.findIndex(v => v >= g.target)
            if (idx === -1) {
              return rowStatic(escapeHTML(g.name), 'Beyond ' + s.years + 'y', sub, 'at this pace')
            }
            const when = addMonths(startMonth, idx + 1)
            return rowStatic(escapeHTML(g.name), monthLabel(when, true), sub, etaLabel(idx + 1))
          }).join('')}
        </div>`
    }
  }

  const ins = document.getElementById('pj-insights')
  if (ins) {
    const annual = (Math.pow(1 + s.rate / 100, 12) - 1) * 100
    const list = []
    list.push(`A steady <strong>${pctPlain(s.rate, 1)}</strong> per month compounds to
      <strong>${pctPlain(annual, 1)}</strong> a year. Real markets do not deliver it evenly.`)
    if (s.contributed > 0) {
      const share = final > 0 ? (s.contributed / (final - s.start)) * 100 : 0
      list.push(`Contributions account for <strong>${pctPlain(Math.min(100, share), 0)}</strong>
        of everything you add above today’s balance over this horizon.`)
    }
    const { sum } = projectionInputs()
    if (sum && sum.twrAvgMo != null && sum.monthsHeld >= 3) {
      const diff = s.rate - sum.twrAvgMo
      list.push(Math.abs(diff) < 0.3
        ? `Your actual average of <strong>${pctPlain(sum.twrAvgMo, 2)}</strong>/mo is in line with this assumption.`
        : `Your actual average is <strong>${pctPlain(sum.twrAvgMo, 2)}</strong>/mo —
           this projection assumes ${diff > 0 ? 'more' : 'less'} by ${pctPlain(Math.abs(diff), 2)} a month.`)
    }
    list.push(`Figures are nominal and ignore tax, fees and inflation.`)
    ins.innerHTML = list.map((t, i) => `
      <div class="insight">
        <span class="insight-mark ${i === 0 ? 'is-accent' : ''}"></span>
        <span>${t}</span>
      </div>`).join('')
  }
}

function rowStatic(label, value, sub, side) {
  return `
    <div class="row">
      <span class="row-main">
        <span class="row-label">${label}</span>
        <span class="row-sub">${sub}</span>
      </span>
      <span class="row-side">
        <span class="row-value num">${value}</span>
        ${side ? `<span class="row-delta num">${side}</span>` : ''}
      </span>
    </div>`
}

function mountProjection() {
  const ids = ['pj-start', 'pj-contrib', 'pj-rate', 'pj-years']
  const read = () => {
    state.projection = {
      startVal: +document.getElementById('pj-start').value,
      contrib:  +document.getElementById('pj-contrib').value,
      rate:     +document.getElementById('pj-rate').value,
      years:    +document.getElementById('pj-years').value,
    }
  }
  let saveTimer = null
  ids.forEach(id => {
    const el = document.getElementById(id)
    if (!el) return
    el.addEventListener('input', () => {
      read()
      renderProjectionOutputs()
      drawProjectionChart()
      clearTimeout(saveTimer)
      saveTimer = setTimeout(save, 500)
    })
  })
  renderProjectionOutputs()
  registerChart(drawProjectionChart)
}

function drawProjectionChart() {
  const canvas = document.getElementById('pj-chart')
  if (!canvas || !document.body.contains(canvas)) return
  const s = projectionScenarios()
  const startMonth = thisMonthKey()

  // Sample yearly when the horizon is long, monthly when short
  const stepMonths = s.months <= 24 ? 1 : s.months <= 72 ? 3 : 12
  const idx = []
  for (let i = stepMonths - 1; i < s.months; i += stepMonths) idx.push(i)
  if (idx[idx.length - 1] !== s.months - 1) idx.push(s.months - 1)

  const labels = idx.map(i => addMonths(startMonth, i + 1))
  const holder = canvas.parentElement
  const tip = document.getElementById('pj-tip')

  lineChart(canvas, {
    labels,
    hoverIndex: ui.pjHover,
    formatTick: v => compactMoney(v),
    formatX: m => (stepMonths >= 12 ? m.slice(0, 4) : xTick(m)),
    series: [
      { values: idx.map(i => s.cons[i]), color: 'var(--cat-3)', width: 1.6, alpha: 0.85 },
      { values: idx.map(i => s.opt[i]),  color: 'var(--accent)', width: 1.6, alpha: 0.85 },
      { values: idx.map(i => s.base[i]), color: 'var(--chart-line)', width: 2.4, fill: true,
        marker: ui.pjHover == null },
    ],
    onHover: (i, x) => {
      ui.pjHover = i
      if (i == null) { placeTip(tip, holder, null); drawProjectionChart(); return }
      placeTip(tip, holder, x, `
        <div class="chart-tip-when">${monthLabel(labels[i], true)}</div>
        <div class="chart-tip-value">${money(s.base[idx[i]])}</div>
        <div class="chart-tip-extra">${compactMoney(s.cons[idx[i]])} – ${compactMoney(s.opt[idx[i]])}</div>`)
      drawProjectionChart()
    },
  })
}

/* ============================================================
   GOALS
   ============================================================ */
function viewGoals() {
  const sum = summary()
  if (!state.goals.length) {
    return `
      <div class="card" style="margin-top:16px">
        <div class="empty">
          <div class="empty-icon">${icon('target')}</div>
          <div class="empty-title">No goals yet</div>
          <p class="empty-text">Set the milestones you are working towards — Wealth Arc
            tracks how close each one is.</p>
          <button class="btn is-primary" data-act="add-goal">${icon('plus')}Add a goal</button>
        </div>
      </div>`
  }

  const reached = state.goals.filter(g => sum && sum.netWorth >= g.target)
  const open = state.goals.filter(g => !sum || sum.netWorth < g.target)

  const block = (title, list) => !list.length ? '' : `
    <section class="section">
      <div class="section-head"><h2 class="section-title">${title}</h2></div>
      <div class="group">
        ${list.map(g => `
          <button class="row" style="display:block;padding:0" data-act="edit-goal" data-arg="${g.id}">
            ${goalHTML(g, sum || { netWorth: 0, baseline: 0, avgMonthlyGain: null })}
          </button>`).join('')}
      </div>
    </section>`

  return `
    ${sum ? `
    <div class="hero" style="padding-bottom:4px">
      <div class="hero-label">Net Worth</div>
      <div class="hero-value num" style="font-size:clamp(34px,10vw,46px)">${money(sum.netWorth)}</div>
      <div class="hero-meta">
        <span class="hero-period">${open.length} open · ${reached.length} reached</span>
      </div>
    </div>` : ''}
    ${block('In progress', open)}
    ${block('Reached', reached)}
    <div style="margin-top:22px">
      <button class="btn is-block" data-act="add-goal">${icon('plus')}Add a goal</button>
    </div>`
}

/* ============================================================
   MORE / SETTINGS
   ============================================================ */
function viewMore() {
  const sum = summary()
  const themes = [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']]
  const currencies = ['USD', 'EUR', 'GBP', 'TRY', 'JPY', 'CHF', 'AUD', 'CAD']

  return `
    <section class="section" style="margin-top:14px">
      <div class="section-head"><h2 class="section-title">Appearance</h2></div>
      <div class="card">
        <div class="seg" role="group" aria-label="Theme">
          ${themes.map(([id, label]) => `<button class="seg-item"
            aria-pressed="${state.theme === id}" data-act="theme" data-arg="${id}">${label}</button>`).join('')}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head"><h2 class="section-title">Portfolio</h2></div>
      <div class="group">
        <button class="row" data-act="manage-accounts">
          <span class="row-main">
            <span class="row-label">Accounts</span>
            <span class="row-sub">${state.accounts.filter(a => !a.archived).length} active</span>
          </span>${icon('chevron', 'row-chevron')}
        </button>
        <button class="row" data-act="manage-categories">
          <span class="row-main">
            <span class="row-label">Allocation categories</span>
            <span class="row-sub">${state.categories.map(c => c.name).join(', ')}</span>
          </span>${icon('chevron', 'row-chevron')}
        </button>
        <div class="row">
          <span class="row-main">
            <span class="row-label">Currency</span>
            <span class="row-sub">Used for every figure</span>
          </span>
          <select class="input" id="set-currency" aria-label="Currency"
                  style="width:auto;min-height:38px;padding:6px 32px 6px 12px">
            ${currencies.map(c => `<option value="${c}" ${state.currency === c ? 'selected' : ''}>${CURRENCY_SYMBOL[c]} ${c}</option>`).join('')}
          </select>
        </div>
        <div class="row">
          <span class="row-main">
            <span class="row-label">Benchmark rate</span>
            <span class="row-sub">Monthly target you compare against</span>
          </span>
          <span style="display:flex;align-items:center;gap:6px">
            <input class="input" type="number" id="set-benchmark" inputmode="decimal"
              aria-label="Monthly benchmark rate, percent"
              min="0" max="20" step="0.1" value="${state.benchmarkRate}"
              style="width:82px;min-height:38px;padding:6px 10px">
            <span class="small muted">%/mo</span>
          </span>
        </div>
        <div class="row">
          <span class="row-main">
            <span class="row-label">Baseline net worth</span>
            <span class="row-sub">Where the benchmark line starts</span>
          </span>
          <input class="input" type="number" id="set-baseline" inputmode="decimal"
            aria-label="Baseline net worth"
            min="0" step="100" value="${state.startValue == null ? '' : state.startValue}"
            placeholder="auto" style="width:124px;min-height:38px;padding:6px 10px">
        </div>
      </div>
      <div style="margin-top:12px">
        <button class="btn is-block" data-act="save-portfolio">${icon('check')}Save portfolio settings</button>
      </div>
    </section>

    <section class="section">
      <div class="section-head"><h2 class="section-title">Data</h2></div>
      <div class="group">
        <button class="row" data-act="export-json">
          <span class="row-main">
            <span class="row-label">Export JSON backup</span>
            <span class="row-sub">Complete copy of everything</span>
          </span>${icon('download', 'row-chevron')}
        </button>
        <button class="row" data-act="export-csv">
          <span class="row-main">
            <span class="row-label">Export CSV</span>
            <span class="row-sub">Monthly history for spreadsheets</span>
          </span>${icon('download', 'row-chevron')}
        </button>
        <button class="row" data-act="import">
          <span class="row-main">
            <span class="row-label">Import backup</span>
            <span class="row-sub">Accepts v5 and older v4 exports</span>
          </span>${icon('upload', 'row-chevron')}
        </button>
      </div>
      <input type="file" id="import-file" accept=".json,application/json" style="display:none">
    </section>

    <section class="section">
      <div class="section-head"><h2 class="section-title">Reset</h2></div>
      <div class="group">
        <button class="row" data-act="reset-all">
          <span class="row-main">
            <span class="row-label" style="color:var(--neg)">Erase all data</span>
            <span class="row-sub">Cannot be undone — export first</span>
          </span>${icon('chevron', 'row-chevron')}
        </button>
      </div>
    </section>

    <section class="section">
      <div class="card">
        <div class="small muted" style="line-height:1.7">
          <strong style="color:var(--text)">Wealth Arc</strong> · Personal Wealth OS<br>
          ${sum ? `${sum.rows.length} snapshots · ${state.accounts.length} accounts · ${state.goals.length} goals<br>` : ''}
          Stored locally in this browser under <code>${KEY}</code>.
          Nothing leaves your device.
        </div>
      </div>
    </section>`
}

function mountMore() {
  const file = document.getElementById('import-file')
  if (file) file.addEventListener('change', handleImportFile)
}

/* ---- Settings actions ------------------------------------ */
function savePortfolioSettings() {
  const cur = document.getElementById('set-currency')
  const bm = document.getElementById('set-benchmark')
  const bl = document.getElementById('set-baseline')

  if (cur) state.currency = cur.value
  if (bm) {
    const v = num(bm.value, null)
    if (v != null && v >= 0 && v <= 20) state.benchmarkRate = v
  }
  if (bl) {
    const v = num(bl.value, null)
    state.startValue = v != null && v > 0 ? v : null
  }
  save()
  toast('Settings saved')
  render()
}

/* ---- Export / import ------------------------------------- */
function downloadBlob(text, filename, type) {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function exportJSON() {
  const stamp = new Date().toISOString().slice(0, 10)
  downloadBlob(JSON.stringify(state, null, 2), `wealtharc-backup-${stamp}.json`, 'application/json')
  toast('Backup downloaded')
}

function exportCSV() {
  const rows = resolveAll()
  if (!rows.length) { toast('Nothing to export yet'); return }
  const accs = state.accounts
  const head = ['Month', 'Beginning', 'New Capital', 'Ending', 'Wealth Growth', 'Return %']
    .concat(accs.map(a => `${a.name} Ending`))
    .concat(['Planned Capital', 'Note'])

  const lines = [head.join(',')]
  rows.forEach(r => {
    const cells = [
      r.month, r.begin, r.fresh, r.end, r.growth,
      r.ret == null ? '' : r.ret.toFixed(3),
    ]
      .concat(accs.map(a => (r.perAccount[a.id] ? r.perAccount[a.id].end : '')))
      .concat([r.planned == null ? '' : r.planned, csvCell(r.note)])
    lines.push(cells.join(','))
  })
  const stamp = new Date().toISOString().slice(0, 10)
  downloadBlob(lines.join('\n'), `wealtharc-history-${stamp}.csv`, 'text/csv;charset=utf-8')
  toast('CSV downloaded')
}

function csvCell(v) {
  const s = String(v == null ? '' : v)
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

function handleImportFile(event) {
  const file = event.target.files && event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    let parsed = null
    try { parsed = JSON.parse(String(reader.result)) } catch (e) {
      toast('That file is not valid JSON')
      event.target.value = ''
      return
    }
    if (!parsed || typeof parsed !== 'object') { toast('Nothing usable in that file'); return }

    const isLegacy = !parsed.snapshots && Array.isArray(parsed.months)
    const next = sanitize(isLegacy ? migrateV4(parsed) : parsed)
    if (!next.snapshots.length && !next.goals.length) {
      toast('No snapshots found in that file')
      event.target.value = ''
      return
    }

    confirmSheet({
      title: 'Replace current data?',
      text: `This import has ${next.snapshots.length} snapshot${next.snapshots.length === 1 ? '' : 's'}
             and ${next.goals.length} goal${next.goals.length === 1 ? '' : 's'}.
             Your current data will be overwritten.`,
      label: 'Import',
      danger: true,
      onOk: () => {
        state = next
        save()
        applyTheme()
        toast(isLegacy ? 'Imported and upgraded from v4' : 'Backup imported')
        navigate('home')
      },
    })
    event.target.value = ''
  }
  reader.onerror = () => toast('Could not read that file')
  reader.readAsText(file)
}

function resetAll() {
  confirmSheet({
    title: 'Erase all data?',
    text: 'Every snapshot, account, goal and setting is deleted from this browser. This cannot be undone.',
    label: 'Erase everything',
    danger: true,
    onOk: () => {
      try { localStorage.removeItem(KEY) } catch (e) {}
      state = freshState()
      save()
      applyTheme()
      toast('All data erased')
      navigate('home')
    },
  })
}

/* ============================================================
   SNAPSHOT SHEET
   ============================================================ */
function prevClosing(accId, month) {
  const before = state.snapshots
    .filter(s => s.month < month)
    .sort((a, b) => a.month.localeCompare(b.month))
  for (let i = before.length - 1; i >= 0; i--) {
    const r = before[i].accounts[accId]
    if (r && r.end != null) return r.end
  }
  return null
}

function defaultNextMonth() {
  if (!state.snapshots.length) return thisMonthKey()
  const last = state.snapshots[state.snapshots.length - 1].month
  const next = addMonths(last, 1)
  return next > thisMonthKey() ? thisMonthKey() : next
}

function openSnapshotSheet(monthKey) {
  // Adding a month that is already on file means the user wants to correct it,
  // so fall through to editing rather than dead-ending on a warning.
  const target = monthKey || defaultNextMonth()
  const editing = state.snapshots.find(s => s.month === target) || null
  const month = target
  const accounts = state.accounts.filter(a => !a.archived)

  if (!accounts.length) {
    toast('Add an account first')
    openAccountsSheet()
    return
  }

  const acctFields = accounts.map(a => {
    const rec = editing ? editing.accounts[a.id] : null
    const inherited = prevClosing(a.id, month)
    const begin = rec && rec.begin != null ? rec.begin : inherited
    return `
      <div class="acct-edit" data-acct="${a.id}">
        <div class="acct-edit-head">
          <span class="acct-edit-name">${escapeHTML(a.name)}</span>
          <span class="acct-edit-calc" data-role="growth">—</span>
        </div>
        <div class="acct-edit-grid">
          <div>
            <label class="field-label" for="sn-${a.id}-begin">Beginning</label>
            <input class="input" type="number" inputmode="decimal" id="sn-${a.id}-begin"
                   data-role="begin" value="${begin == null ? '' : begin}"
                   placeholder="0" step="any">
          </div>
          <div>
            <label class="field-label" for="sn-${a.id}-fresh">Fresh cash</label>
            <input class="input" type="number" inputmode="decimal" id="sn-${a.id}-fresh"
                   data-role="fresh" value="${rec && rec.fresh ? rec.fresh : ''}"
                   placeholder="0" step="any">
          </div>
          <div>
            <label class="field-label" for="sn-${a.id}-end">Ending</label>
            <input class="input" type="number" inputmode="decimal" id="sn-${a.id}-end"
                   data-role="end" value="${rec && rec.end != null ? rec.end : ''}"
                   placeholder="0" step="any">
          </div>
        </div>
      </div>`
  }).join('')

  const alloc = editing && editing.allocation ? editing.allocation : {}
  const allocFields = state.categories.map((c, i) => `
    <div class="field">
      <label class="field-label" for="al-${c.id}">
        <span class="dist-dot" style="display:inline-block;background:${catColor(i)};margin-right:6px"></span>
        ${escapeHTML(c.name)}
      </label>
      <input class="input" type="number" inputmode="decimal" id="al-${c.id}"
             data-alloc="${c.id}" value="${alloc[c.id] ? alloc[c.id] : ''}" placeholder="0" step="any">
    </div>`).join('')

  const opt = editing && editing.options ? editing.options : {}

  const body = `
    <div class="card" style="margin-bottom:18px">
      <div class="flow-row" style="padding-top:0">
        <span class="flow-key">Net worth</span>
        <span class="flow-val num" id="sn-total">—</span>
      </div>
      <div class="flow-row">
        <span class="flow-key">New capital</span>
        <span class="flow-val num" id="sn-fresh">—</span>
      </div>
      <div class="flow-row" style="padding-bottom:0">
        <span class="flow-key">Wealth growth</span>
        <span class="flow-val num" id="sn-growth">—</span>
      </div>
    </div>

    <div class="field">
      <label class="field-label" for="sn-month">Month</label>
      <input class="input" type="month" id="sn-month" value="${month}"
             max="${addMonths(thisMonthKey(), 1)}"
             ${editing ? `data-original="${editing.month}"` : ''}>
    </div>

    <div class="sheet-section">
      <div class="sheet-section-title">Accounts</div>
      ${acctFields}
      <button class="btn is-quiet" style="margin-top:6px;padding:0" data-act="manage-accounts">
        ${icon('plus')}Add or rename accounts
      </button>
    </div>

    <details class="fold" ${editing && editing.allocation ? 'open' : ''}>
      <summary>Allocation <span class="muted small" id="al-summary"></span></summary>
      <div class="fold-body">
        ${allocFields}
        <div class="callout" style="margin-top:4px">
          ${icon('info')}
          <span id="al-check">Leave blank to skip. Totals are compared against net worth.</span>
        </div>
      </div>
    </details>

    <details class="fold" ${editing && editing.options ? 'open' : ''}>
      <summary>Options income <span class="muted small"></span></summary>
      <div class="fold-body">
        <div class="field-grid">
          <div class="field">
            <label class="field-label" for="op-premium">Premium collected</label>
            <input class="input" type="number" inputmode="decimal" id="op-premium"
                   value="${opt.premium ? opt.premium : ''}" placeholder="0" step="any">
          </div>
          <div class="field">
            <label class="field-label" for="op-pnl">Realised P&amp;L</label>
            <input class="input" type="number" inputmode="decimal" id="op-pnl"
                   value="${opt.pnl ? opt.pnl : ''}" placeholder="0" step="any">
          </div>
        </div>
        <div class="field" style="margin-top:12px">
          <label class="field-label" for="op-capital">Capital deployed</label>
          <input class="input" type="number" inputmode="decimal" id="op-capital"
                 value="${opt.capital ? opt.capital : ''}" placeholder="0" step="any">
        </div>
      </div>
    </details>

    <details class="fold" ${editing && (editing.planned != null || editing.note) ? 'open' : ''}>
      <summary>Plan &amp; note</summary>
      <div class="fold-body">
        <div class="field">
          <label class="field-label" for="sn-planned">Planned capital for the month</label>
          <input class="input" type="number" inputmode="decimal" id="sn-planned"
                 value="${editing && editing.planned != null ? editing.planned : ''}"
                 placeholder="same as fresh cash" step="any">
        </div>
        <div class="field">
          <label class="field-label" for="sn-note">Note</label>
          <input class="input" type="text" id="sn-note" maxlength="140"
                 value="${editing ? escapeHTML(editing.note) : ''}"
                 placeholder="Bonus month, market dip…" style="text-align:left">
        </div>
      </div>
    </details>`

  const footer = `
    ${editing ? `<button class="btn is-danger is-icon" data-act="delete-snapshot"
        data-arg="${editing.month}" aria-label="Delete snapshot">${icon('trash')}</button>` : ''}
    <button class="btn" data-act="close-sheet">Cancel</button>
    <button class="btn is-primary" data-act="save-snapshot">${editing ? 'Save changes' : 'Save snapshot'}</button>`

  openSheet({
    title: editing ? monthLabel(month) : 'New snapshot',
    body, footer,
    onMount: root => {
      const recalc = () => recalcSnapshotSheet(root)
      root.addEventListener('input', recalc)
      const monthEl = root.querySelector('#sn-month')
      if (monthEl) {
        monthEl.addEventListener('change', () => {
          const m = monthEl.value
          const original = monthEl.dataset.original || null
          if (!isMonthKey(m) || m === original) return
          // Picking a month that already exists switches to editing that one
          if (state.snapshots.some(s => s.month === m)) {
            toast(`${monthLabel(m, true)} is already saved — opening it`)
            openSnapshotSheet(m)
            return
          }
          // Re-inherit opening balances for the newly chosen month
          if (!original) {
            root.querySelectorAll('.acct-edit').forEach(block => {
              const id = block.dataset.acct
              const beginEl = block.querySelector('[data-role="begin"]')
              const inherited = prevClosing(id, m)
              if (inherited != null) beginEl.value = inherited
            })
          }
          recalc()
        })
      }
      recalc()
      const firstEmpty = root.querySelector('[data-role="end"]')
      if (firstEmpty && !firstEmpty.value) setTimeout(() => firstEmpty.focus(), 380)
    },
  })
}

function recalcSnapshotSheet(root) {
  let begin = 0, fresh = 0, end = 0
  root.querySelectorAll('.acct-edit').forEach(block => {
    const b = num(block.querySelector('[data-role="begin"]').value, 0) || 0
    const f = num(block.querySelector('[data-role="fresh"]').value, 0) || 0
    const eRaw = block.querySelector('[data-role="end"]').value
    const e = eRaw === '' ? b + f : (num(eRaw, 0) || 0)
    const g = e - b - f
    begin += b; fresh += f; end += e
    const out = block.querySelector('[data-role="growth"]')
    out.textContent = eRaw === '' ? 'awaiting closing value'
      : `${money(g, { signed: true })} · ${b > 0 ? pct((g / b) * 100) : '—'}`
    out.className = 'acct-edit-calc ' + (eRaw === '' ? 'muted' : tone(g))
  })

  const growth = end - begin - fresh
  const set = (id, txt, cls) => {
    const el = root.querySelector('#' + id)
    if (!el) return
    el.textContent = txt
    el.className = 'flow-val num' + (cls ? ' ' + cls : '')
  }
  set('sn-total', money(end))
  set('sn-fresh', money(fresh, { signed: true }))
  set('sn-growth', money(growth, { signed: true }), tone(growth))

  // Allocation cross-check
  let allocTotal = 0, allocTouched = false
  root.querySelectorAll('[data-alloc]').forEach(el => {
    if (el.value !== '') allocTouched = true
    allocTotal += num(el.value, 0) || 0
  })
  const check = root.querySelector('#al-check')
  const sumEl = root.querySelector('#al-summary')
  if (sumEl) sumEl.textContent = allocTouched ? '· ' + compactMoney(allocTotal) : ''
  if (check) {
    if (!allocTouched) {
      check.textContent = 'Leave blank to skip. Totals are compared against net worth.'
      check.parentElement.classList.remove('is-warn')
    } else {
      const diff = allocTotal - end
      if (Math.abs(diff) < Math.max(1, end * 0.005)) {
        check.textContent = `Matches net worth (${money(allocTotal)}).`
        check.parentElement.classList.remove('is-warn')
      } else {
        check.textContent = `${money(allocTotal)} allocated — ${money(Math.abs(diff))} ${diff > 0 ? 'above' : 'below'} net worth.`
        check.parentElement.classList.add('is-warn')
      }
    }
  }
}

function saveSnapshotFromSheet() {
  const root = document.querySelector('.sheet')
  if (!root) return
  const monthEl = root.querySelector('#sn-month')
  const month = monthEl.value
  if (!isMonthKey(month)) { toast('Pick a month'); return }

  const original = monthEl.dataset.original || null
  const existingIndex = state.snapshots.findIndex(s => s.month === month)

  if (existingIndex !== -1 && original && original !== month) {
    toast(`${monthLabel(month, true)} already exists`)
    return
  }

  const accounts = {}
  let anyValue = false
  root.querySelectorAll('.acct-edit').forEach(block => {
    const id = block.dataset.acct
    const b = num(block.querySelector('[data-role="begin"]').value, null)
    const f = num(block.querySelector('[data-role="fresh"]').value, 0) || 0
    const e = num(block.querySelector('[data-role="end"]').value, null)
    if (b == null && e == null && !f) return
    if (e != null || b != null) anyValue = true
    accounts[id] = { begin: b, fresh: f, end: e }
  })

  if (!anyValue) { toast('Enter at least one balance'); return }

  const allocation = {}
  let allocTouched = false
  root.querySelectorAll('[data-alloc]').forEach(el => {
    if (el.value === '') return
    allocTouched = true
    allocation[el.dataset.alloc] = num(el.value, 0) || 0
  })

  const premium = num(root.querySelector('#op-premium').value, null)
  const pnl = num(root.querySelector('#op-pnl').value, null)
  const capital = num(root.querySelector('#op-capital').value, null)
  const hasOptions = premium != null || pnl != null || capital != null

  const snapshot = {
    month,
    accounts,
    planned: num(root.querySelector('#sn-planned').value, null),
    allocation: allocTouched ? allocation : null,
    options: hasOptions ? { premium: premium || 0, pnl: pnl || 0, capital: capital || 0 } : null,
    note: clampNote(root.querySelector('#sn-note').value.trim()),
  }

  // Moving an edited snapshot to a different month drops the old entry
  if (original && original !== month) {
    state.snapshots = state.snapshots.filter(s => s.month !== original)
  }
  const at = state.snapshots.findIndex(s => s.month === month)
  if (at !== -1) state.snapshots[at] = snapshot
  else state.snapshots.push(snapshot)
  state.snapshots.sort((a, b) => a.month.localeCompare(b.month))

  if (state.startValue == null) {
    const r = resolveSnapshot(state, 0)
    state.startValue = r.begin || r.end || null
  }

  if (!save()) { toast('Could not save — storage is full'); return }
  closeSheet()
  toast(original ? 'Snapshot updated' : `${monthLabel(month, true)} saved`)
  render()
}

function deleteSnapshot(month) {
  confirmSheet({
    title: `Delete ${monthLabel(month, true)}?`,
    text: 'This removes the month from your history. Other months are untouched.',
    label: 'Delete',
    danger: true,
    onOk: () => {
      state.snapshots = state.snapshots.filter(s => s.month !== month)
      save()
      toast('Snapshot deleted')
      render()
    },
  })
}

/* ============================================================
   ACCOUNTS SHEET
   ============================================================ */
function openAccountsSheet() {
  const body = `
    <div class="sheet-section" style="margin-top:4px">
      <div class="sheet-section-title">Your accounts</div>
      <div class="group" id="acct-list">
        ${state.accounts.length ? state.accounts.map(a => `
          <div class="row">
            <span class="row-icon">${escapeHTML(initials(a.name))}</span>
            <span class="row-main">
              <input class="input" type="text" value="${escapeHTML(a.name)}" maxlength="40"
                     data-acct-name="${a.id}" aria-label="Account name"
                     style="min-height:38px;padding:6px 10px;text-align:left">
            </span>
            <button class="sheet-close" data-act="delete-account" data-arg="${a.id}"
                    aria-label="Delete ${escapeHTML(a.name)}">${icon('trash')}</button>
          </div>`).join('')
          : '<div class="row"><span class="row-main muted">No accounts yet</span></div>'}
      </div>
    </div>
    <div class="field">
      <label class="field-label" for="acct-new">Add an account</label>
      <div style="display:flex;gap:8px">
        <input class="input" type="text" id="acct-new" maxlength="40"
               placeholder="IBKR Mustafa, Bank, Crypto…" style="text-align:left">
        <button class="btn is-primary" data-act="add-account" style="flex:0 0 auto;padding:0 16px">${icon('plus')}</button>
      </div>
    </div>
    <div class="callout">
      ${icon('info')}
      <span>Deleting an account also removes its balances from every snapshot.
        Renaming is safe — history is kept.</span>
    </div>`

  openSheet({
    title: 'Accounts',
    body,
    footer: `<button class="btn is-primary" data-act="save-accounts">Done</button>`,
    onMount: root => {
      const input = root.querySelector('#acct-new')
      if (input) input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); addAccount() }
      })
    },
  })
}

function addAccount() {
  const el = document.querySelector('#acct-new')
  const name = (el.value || '').trim()
  if (!name) { toast('Give the account a name'); return }
  saveAccountNames({ silent: true })
  state.accounts.push({ id: uid('a_'), name: name.slice(0, 40), archived: false })
  save()
  openAccountsSheet()
  toast('Account added')
}

function saveAccountNames(opts) {
  const root = document.querySelector('.sheet')
  if (!root) return
  root.querySelectorAll('[data-acct-name]').forEach(el => {
    const acct = state.accounts.find(a => a.id === el.dataset.acctName)
    if (!acct) return
    const v = (el.value || '').trim()
    if (v) acct.name = v.slice(0, 40)
  })
  save()
  if (!opts || !opts.silent) {
    closeSheet()
    toast('Accounts saved')
    render()
  }
}

function deleteAccount(id) {
  const acct = state.accounts.find(a => a.id === id)
  if (!acct) return
  if (state.accounts.length === 1) { toast('Keep at least one account'); return }
  const used = state.snapshots.filter(s => s.accounts[id]).length

  confirmSheet({
    title: `Delete ${acct.name}?`,
    text: used
      ? `This account appears in ${used} snapshot${used === 1 ? '' : 's'}. Its balances will be removed and your net worth history will change.`
      : 'This account has no balances recorded.',
    label: 'Delete account',
    danger: true,
    onOk: () => {
      state.accounts = state.accounts.filter(a => a.id !== id)
      state.snapshots.forEach(s => { delete s.accounts[id] })
      state.snapshots = state.snapshots.filter(s => Object.keys(s.accounts).length)
      save()
      toast('Account deleted')
      render()
    },
  })
}

/* ============================================================
   CATEGORIES SHEET
   ============================================================ */
function openCategoriesSheet() {
  const body = `
    <div class="sheet-section" style="margin-top:4px">
      <div class="sheet-section-title">Allocation categories</div>
      <div class="group">
        ${state.categories.map((c, i) => `
          <div class="row">
            <span class="dist-dot" style="background:${catColor(i)};width:11px;height:11px"></span>
            <span class="row-main">
              <input class="input" type="text" value="${escapeHTML(c.name)}" maxlength="40"
                     data-cat-name="${c.id}" aria-label="Category name"
                     style="min-height:38px;padding:6px 10px;text-align:left">
            </span>
            <button class="sheet-close" data-act="delete-category" data-arg="${c.id}"
                    aria-label="Delete ${escapeHTML(c.name)}">${icon('trash')}</button>
          </div>`).join('')}
      </div>
    </div>
    <div class="field">
      <label class="field-label" for="cat-new">Add a category</label>
      <div style="display:flex;gap:8px">
        <input class="input" type="text" id="cat-new" maxlength="40"
               placeholder="Real estate, Crypto…" style="text-align:left">
        <button class="btn is-primary" data-act="add-category" style="flex:0 0 auto;padding:0 16px">${icon('plus')}</button>
      </div>
    </div>`

  openSheet({
    title: 'Categories',
    body,
    footer: `<button class="btn is-primary" data-act="save-categories">Done</button>`,
  })
}

function addCategory() {
  const el = document.querySelector('#cat-new')
  const name = (el.value || '').trim()
  if (!name) { toast('Give the category a name'); return }
  saveCategoryNames({ silent: true })
  state.categories.push({ id: uid('c_'), name: name.slice(0, 40) })
  save()
  openCategoriesSheet()
}

function saveCategoryNames(opts) {
  const root = document.querySelector('.sheet')
  if (!root) return
  root.querySelectorAll('[data-cat-name]').forEach(el => {
    const cat = state.categories.find(c => c.id === el.dataset.catName)
    if (!cat) return
    const v = (el.value || '').trim()
    if (v) cat.name = v.slice(0, 40)
  })
  save()
  if (!opts || !opts.silent) { closeSheet(); toast('Categories saved'); render() }
}

function deleteCategory(id) {
  if (state.categories.length === 1) { toast('Keep at least one category'); return }
  state.categories = state.categories.filter(c => c.id !== id)
  state.snapshots.forEach(s => { if (s.allocation) delete s.allocation[id] })
  save()
  openCategoriesSheet()
}

/* ============================================================
   GOAL SHEET
   ============================================================ */
function openGoalSheet(goalId) {
  const g = goalId ? state.goals.find(x => x.id === goalId) : null
  const body = `
    <div class="field">
      <label class="field-label" for="g-name">Name</label>
      <input class="input" type="text" id="g-name" maxlength="40" style="text-align:left"
             value="${g ? escapeHTML(g.name) : ''}" placeholder="Half a million">
    </div>
    <div class="field">
      <label class="field-label" for="g-target">Target net worth</label>
      <input class="input" type="number" inputmode="decimal" id="g-target" step="any" min="1"
             value="${g ? g.target : ''}" placeholder="500000">
    </div>
    <div class="field">
      <label class="field-label" for="g-date">Target month <span class="muted">(optional)</span></label>
      <input class="input" type="month" id="g-date" value="${g && g.date ? g.date : ''}">
    </div>`

  openSheet({
    title: g ? 'Edit goal' : 'New goal',
    body,
    footer: `
      ${g ? `<button class="btn is-danger is-icon" data-act="delete-goal" data-arg="${g.id}"
        aria-label="Delete goal">${icon('trash')}</button>` : ''}
      <button class="btn" data-act="close-sheet">Cancel</button>
      <button class="btn is-primary" data-act="save-goal" data-arg="${g ? g.id : ''}">Save</button>`,
    onMount: root => {
      const t = root.querySelector('#g-target')
      const n = root.querySelector('#g-name')
      t.addEventListener('input', () => {
        if (!n.value.trim() && t.value) n.placeholder = compactMoney(num(t.value, 0))
      })
      setTimeout(() => (g ? t : n).focus(), 380)
    },
  })
}

function saveGoal(goalId) {
  const root = document.querySelector('.sheet')
  if (!root) return
  const target = num(root.querySelector('#g-target').value, null)
  if (target == null || target <= 0) { toast('Enter a target amount'); return }
  const name = (root.querySelector('#g-name').value || '').trim() || compactMoney(target)
  const date = root.querySelector('#g-date').value
  const record = {
    id: goalId || uid('g_'),
    name: name.slice(0, 40),
    target,
    date: isMonthKey(date) ? date : null,
  }
  const i = state.goals.findIndex(g => g.id === record.id)
  if (i !== -1) state.goals[i] = record
  else state.goals.push(record)
  state.goals.sort((a, b) => a.target - b.target)
  save()
  closeSheet()
  toast(i !== -1 ? 'Goal updated' : 'Goal added')
  render()
}

function deleteGoal(id) {
  state.goals = state.goals.filter(g => g.id !== id)
  save()
  closeSheet()
  toast('Goal deleted')
  render()
}

/* ============================================================
   DETAIL SHEETS
   ============================================================ */
function openPerformanceSheet() {
  const sum = summary()
  if (!sum) { toast('Add a snapshot first'); return }

  const rows = sum.rows.filter(r => r.ret != null)
  const best = rows.reduce((a, b) => (!a || b.ret > a.ret ? b : a), null)
  const worst = rows.reduce((a, b) => (!a || b.ret < a.ret ? b : a), null)
  const up = rows.filter(r => r.growth > 0).length

  const mom = (n) => {
    if (sum.rows.length < n + 1) return null
    const base = sum.rows[sum.rows.length - 1 - n].end
    return base > 0 ? ((sum.netWorth - base) / base) * 100 : null
  }

  const body = `
    <div class="stats" style="margin-bottom:18px">
      <div class="stat">
        <div class="stat-label">Time-weighted return</div>
        <div class="stat-value num ${tone(sum.twrAll)}">${pct(sum.twrAll)}</div>
        <div class="stat-sub">all time, ${sum.monthsHeld} months</div>
      </div>
      <div class="stat">
        <div class="stat-label">Annualised</div>
        <div class="stat-value num ${tone(sum.twrAnnual)}">${pct(sum.twrAnnual)}</div>
        <div class="stat-sub">geometric</div>
      </div>
      <div class="stat">
        <div class="stat-label">Average month</div>
        <div class="stat-value num ${tone(sum.twrAvgMo)}">${pct(sum.twrAvgMo)}</div>
        <div class="stat-sub">vs ${pctPlain(state.benchmarkRate, 1)} benchmark</div>
      </div>
      <div class="stat">
        <div class="stat-label">Positive months</div>
        <div class="stat-value num">${up}/${rows.length}</div>
        <div class="stat-sub">${rows.length ? pctPlain(up / rows.length * 100, 0) : '—'} hit rate</div>
      </div>
    </div>

    <div class="sheet-section-title">Detail</div>
    <div class="group" style="margin-bottom:18px">
      ${rowStatic('Benchmark trajectory', sum.benchNow == null ? '—' : compactMoney(sum.benchNow),
        `${pctPlain(state.benchmarkRate, 1)}/mo from ${compactMoney(sum.baseline)}`, '')}
      ${rowStatic('Gap to benchmark',
        sum.benchGap == null ? '—' : money(sum.benchGap, { signed: true }),
        sum.benchGap == null ? '' : sum.benchGap >= 0 ? 'ahead of target' : 'behind target', '')}
      ${rowStatic('Capital discipline', sum.discipline == null ? '—' : pctPlain(sum.discipline, 0),
        `${compactMoney(sum.totalFresh)} actual vs ${compactMoney(sum.plannedSum)} planned`, '')}
      ${rowStatic('Growth from investments', money(sum.totalGrowth, { signed: true }),
        sum.totalFresh + sum.totalGrowth !== 0
          ? `${pctPlain(Math.abs(sum.totalGrowth) / (Math.abs(sum.totalGrowth) + Math.abs(sum.totalFresh)) * 100, 0)} of all wealth added`
          : '', '')}
      ${mom(3) != null ? rowStatic('3-month change', pct(mom(3)), 'net worth momentum', '') : ''}
      ${mom(6) != null ? rowStatic('6-month change', pct(mom(6)), 'net worth momentum', '') : ''}
      ${best ? rowStatic('Best month', pct(best.ret), monthLabel(best.month, true), money(best.growth, { signed: true })) : ''}
      ${worst ? rowStatic('Weakest month', pct(worst.ret), monthLabel(worst.month, true), money(worst.growth, { signed: true })) : ''}
    </div>

    <div class="callout">
      ${icon('info')}
      <span>Time-weighted return chains each month’s market move, so deposits and
        withdrawals never flatter the number.</span>
    </div>`

  openSheet({ title: 'Performance', body,
    footer: `<button class="btn is-primary" data-act="close-sheet">Done</button>` })
}

function openAccountSheet(accId) {
  const acct = state.accounts.find(a => a.id === accId)
  if (!acct) return
  const rows = resolveAll().filter(r => r.perAccount[accId])
  if (!rows.length) { toast('No balances recorded yet'); return }

  const last = rows[rows.length - 1].perAccount[accId]
  const totalFresh = rows.reduce((s, r) => s + r.perAccount[accId].fresh, 0)
  const totalGrowth = rows.reduce((s, r) => s + r.perAccount[accId].growth, 0)
  const sum = summary()
  const share = sum && sum.netWorth > 0 ? (last.end / sum.netWorth) * 100 : null

  const body = `
    <div class="hero" style="padding:4px 2px 12px">
      <div class="hero-label">Current value</div>
      <div class="hero-value num" style="font-size:clamp(32px,9vw,42px)">${money(last.end)}</div>
      <div class="hero-meta">
        ${deltaLine(last.end - last.begin, last.ret != null ? pct(last.ret) : null)}
        ${share != null ? `<span class="chip">${pctPlain(share, 1)} of net worth</span>` : ''}
      </div>
    </div>

    <div class="chart-holder" style="height:150px;margin-bottom:16px">
      <canvas id="acct-chart" role="img" aria-label="${escapeHTML(acct.name)} over time"></canvas>
    </div>

    <div class="stats" style="margin-bottom:18px">
      <div class="stat">
        <div class="stat-label">Capital added</div>
        <div class="stat-value num">${compactMoney(totalFresh)}</div>
        <div class="stat-sub">all time</div>
      </div>
      <div class="stat">
        <div class="stat-label">Growth</div>
        <div class="stat-value num ${tone(totalGrowth)}">${compactMoney(totalGrowth)}</div>
        <div class="stat-sub">from investments</div>
      </div>
    </div>

    <div class="sheet-section-title">Monthly</div>
    <div class="group">
      ${[...rows].reverse().slice(0, 24).map(r => {
        const p = r.perAccount[accId]
        return `
          <div class="snap-row">
            <span><span class="snap-month">${monthLabel(r.month, true)}</span>
              ${p.fresh ? `<span class="snap-note">${money(p.fresh, { signed: true })} in</span>` : ''}</span>
            <span class="snap-worth num">${compactMoney(p.end)}</span>
            <span class="snap-ret num ${tone(p.ret)}">${p.ret == null ? '—' : pct(p.ret, 1)}</span>
          </div>`
      }).join('')}
    </div>`

  openSheet({
    title: acct.name, body,
    footer: `<button class="btn" data-act="manage-accounts">Manage accounts</button>
             <button class="btn is-primary" data-act="close-sheet">Done</button>`,
    onMount: () => {
      const canvas = document.getElementById('acct-chart')
      if (!canvas) return
      lineChart(canvas, {
        labels: rows.map(r => r.month),
        gridLabels: false,
        formatX: xTick,
        series: [{ values: rows.map(r => r.perAccount[accId].end),
                   color: 'var(--chart-line)', width: 2.2, fill: true, marker: true }],
      })
    },
  })
}

function openOptionsSheet() {
  const rows = resolveAll().filter(r => r.options)
  if (!rows.length) { toast('No options data recorded yet'); return }
  const sum = summary()

  const best = rows.reduce((a, b) => (!a || b.options.pnl > a.options.pnl ? b : a), null)
  const worst = rows.reduce((a, b) => (!a || b.options.pnl < a.options.pnl ? b : a), null)
  const totalPremium = rows.reduce((s, r) => s + r.options.premium, 0)
  const totalPnl = rows.reduce((s, r) => s + r.options.pnl, 0)
  const contribution = sum && sum.totalGrowth !== 0 ? (totalPnl / sum.totalGrowth) * 100 : null

  const body = `
    <div class="stats" style="margin-bottom:18px">
      <div class="stat">
        <div class="stat-label">Premium collected</div>
        <div class="stat-value num">${compactMoney(totalPremium)}</div>
        <div class="stat-sub">${rows.length} month${rows.length === 1 ? '' : 's'}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Realised P&amp;L</div>
        <div class="stat-value num ${tone(totalPnl)}">${compactMoney(totalPnl)}</div>
        <div class="stat-sub">${contribution == null ? '' : pctPlain(contribution, 0) + ' of all growth'}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Best month</div>
        <div class="stat-value num is-pos">${compactMoney(best.options.pnl)}</div>
        <div class="stat-sub">${monthLabel(best.month, true)}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Weakest month</div>
        <div class="stat-value num ${tone(worst.options.pnl)}">${compactMoney(worst.options.pnl)}</div>
        <div class="stat-sub">${monthLabel(worst.month, true)}</div>
      </div>
    </div>

    <div class="sheet-section-title">Premium by month</div>
    <div class="chart-holder" style="height:130px;margin-bottom:6px">
      <canvas id="op-premium-chart" role="img" aria-label="Premium income by month"></canvas>
    </div>
    <div class="chart-foot"><span id="op-premium-cap">Tap a bar for detail</span></div>

    <div class="sheet-section-title" style="margin-top:20px">Realised P&amp;L</div>
    <div class="chart-holder" style="height:130px;margin-bottom:6px">
      <canvas id="op-pnl-chart" role="img" aria-label="Realised options P and L by month"></canvas>
    </div>
    <div class="chart-foot"><span id="op-pnl-cap">Tap a bar for detail</span></div>

    <div class="sheet-section-title" style="margin-top:22px">Monthly entries</div>
    <div class="group">
      ${[...rows].reverse().map(r => `
        <button class="snap-row" data-act="edit-snapshot" data-arg="${r.month}">
          <span><span class="snap-month">${monthLabel(r.month, true)}</span>
            <span class="snap-note">${money(r.options.premium)} premium · ${
              r.options.capital ? compactMoney(r.options.capital) + ' capital' : 'no capital logged'}</span></span>
          <span class="snap-worth num ${tone(r.options.pnl)}">${money(r.options.pnl, { signed: true })}</span>
          <span class="snap-ret num">${r.options.capital
            ? pct((r.options.pnl / r.options.capital) * 100, 1) : '—'}</span>
        </button>`).join('')}
    </div>`

  openSheet({
    title: 'Options income', body,
    footer: `<button class="btn is-primary" data-act="close-sheet">Done</button>`,
    onMount: () => {
      const labels = rows.map(r => monthShort(r.month))
      const premium = document.getElementById('op-premium-chart')
      const pnl = document.getElementById('op-pnl-chart')

      const drawPremium = hover => barChart(premium, {
        values: rows.map(r => r.options.premium), labels,
        color: 'var(--accent)', hoverIndex: hover,
        onHover: i => {
          const cap = document.getElementById('op-premium-cap')
          if (cap) cap.textContent = i == null ? 'Tap a bar for detail'
            : `${monthLabel(rows[i].month, true)} · ${money(rows[i].options.premium)}`
          drawPremium(i)
        },
      })
      const drawPnl = hover => barChart(pnl, {
        values: rows.map(r => r.options.pnl), labels,
        color: 'var(--pos)', negColor: 'var(--neg)', hoverIndex: hover,
        onHover: i => {
          const cap = document.getElementById('op-pnl-cap')
          if (cap) cap.textContent = i == null ? 'Tap a bar for detail'
            : `${monthLabel(rows[i].month, true)} · ${money(rows[i].options.pnl, { signed: true })}`
          drawPnl(i)
        },
      })
      drawPremium(null)
      drawPnl(null)
    },
  })
}

function openAllocationTrendSheet() {
  const rows = resolveAll().filter(r => r.allocation)
  if (!rows.length) { toast('No allocation history yet'); return }

  const cats = state.categories.map((c, i) => ({ ...c, color: catColor(i) }))
  const latest = rows[rows.length - 1]
  const latestTotal = cats.reduce((s, c) => s + (latest.allocation[c.id] || 0), 0)
  const top = cats
    .map(c => ({ c, v: latest.allocation[c.id] || 0 }))
    .sort((a, b) => b.v - a.v)[0]

  const insights = []
  if (latestTotal > 0 && top && top.v > 0) {
    const share = top.v / latestTotal * 100
    insights.push({
      tone: share > 60 ? 'is-neg' : '',
      text: `<strong>${escapeHTML(top.c.name)}</strong> is ${pctPlain(share, 0)} of your allocation${
        share > 60 ? ' — concentrated in one bucket.' : '.'}`,
    })
  }
  const cash = cats.find(c => /cash/i.test(c.name))
  if (cash && latestTotal > 0) {
    const share = (latest.allocation[cash.id] || 0) / latestTotal * 100
    insights.push({
      tone: share > 25 ? 'is-neg' : share < 3 ? 'is-neg' : 'is-pos',
      text: share > 25
        ? `<strong>${pctPlain(share, 0)}</strong> sitting in cash — a lot of dry powder.`
        : share < 3
          ? `Cash is only <strong>${pctPlain(share, 1)}</strong> — little room to act on a dip.`
          : `Cash at <strong>${pctPlain(share, 0)}</strong> looks balanced.`,
    })
  }
  if (rows.length >= 2) {
    const prev = rows[rows.length - 2]
    const prevTotal = cats.reduce((s, c) => s + (prev.allocation[c.id] || 0), 0)
    const moved = cats.map(c => {
      const a = prevTotal ? (prev.allocation[c.id] || 0) / prevTotal : 0
      const b = latestTotal ? (latest.allocation[c.id] || 0) / latestTotal : 0
      return { c, delta: (b - a) * 100 }
    }).sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))[0]
    if (moved && Math.abs(moved.delta) >= 1) {
      insights.push({
        tone: '',
        text: `Biggest shift since ${monthLabel(prev.month, true)}:
          <strong>${escapeHTML(moved.c.name)}</strong> ${moved.delta > 0 ? 'up' : 'down'}
          ${pctPlain(Math.abs(moved.delta), 1)} of the mix.`,
      })
    }
  }

  const body = `
    <div class="sheet-section-title" style="margin-top:4px">Allocation over time</div>
    <div class="chart-holder" style="height:180px">
      <canvas id="al-trend" role="img" aria-label="Allocation over time"></canvas>
    </div>
    <div class="chart-foot"><span id="al-trend-cap">${monthLabel(latest.month, true)} · ${money(latestTotal)}</span></div>
    <div class="legend" style="margin-bottom:18px">
      ${cats.map(c => `<span class="legend-item">
        <span class="legend-dash" style="background:${c.color};height:8px;width:8px;border-radius:2px"></span>
        ${escapeHTML(c.name)}</span>`).join('')}
    </div>

    ${insights.length ? `
      <div class="sheet-section-title">Structure</div>
      <div class="group" style="margin-bottom:18px">
        ${insights.map(i => `<div class="insight">
          <span class="insight-mark ${i.tone}"></span><span>${i.text}</span></div>`).join('')}
      </div>` : ''}

    <div class="sheet-section-title">Months recorded</div>
    <div class="group">
      ${[...rows].reverse().map(r => {
        const t = cats.reduce((s, c) => s + (r.allocation[c.id] || 0), 0)
        return `
          <button class="snap-row" data-act="edit-snapshot" data-arg="${r.month}">
            <span><span class="snap-month">${monthLabel(r.month, true)}</span></span>
            <span class="snap-worth num">${compactMoney(t)}</span>
            <span class="snap-ret num muted">${t === r.end ? '' : money(t - r.end, { signed: true })}</span>
          </button>`
      }).join('')}
    </div>`

  openSheet({
    title: 'Allocation', body,
    footer: `<button class="btn is-primary" data-act="close-sheet">Done</button>`,
    onMount: () => {
      const canvas = document.getElementById('al-trend')
      if (!canvas) return
      const draw = hover => stackChart(canvas, {
        labels: rows.map(r => monthShort(r.month)),
        hoverIndex: hover,
        stacks: cats.map(c => ({ color: c.color, values: rows.map(r => r.allocation[c.id] || 0) })),
        onHover: i => {
          const cap = document.getElementById('al-trend-cap')
          if (cap) {
            if (i == null) cap.textContent = `${monthLabel(latest.month, true)} · ${money(latestTotal)}`
            else {
              const t = cats.reduce((s, c) => s + (rows[i].allocation[c.id] || 0), 0)
              cap.textContent = `${monthLabel(rows[i].month, true)} · ${money(t)}`
            }
          }
          draw(i)
        },
      })
      draw(null)
    },
  })
}

function openAllAccountsSheet() {
  const sum = summary()
  if (!sum) return
  const list = accountBreakdown(sum)
  openSheet({
    title: 'All accounts',
    body: `<div class="group" style="margin-top:4px">${list.map(accountRowHTML).join('')}</div>`,
    footer: `<button class="btn" data-act="manage-accounts">Manage</button>
             <button class="btn is-primary" data-act="close-sheet">Done</button>`,
  })
}
