/* ============================================================
   WEALTH ARC — HOME & HISTORY
   ============================================================ */

/* ---- Range filter ---------------------------------------- */
const RANGES = [
  { id: '3m',  label: '3M',  months: 3 },
  { id: '6m',  label: '6M',  months: 6 },
  { id: 'ytd', label: 'YTD' },
  { id: '1y',  label: '1Y',  months: 12 },
  { id: 'all', label: 'All' },
]

function availableRanges(rows) {
  const out = []
  const year = rows.length ? rows[rows.length - 1].month.slice(0, 4) : ''
  const inYear = rows.filter(r => r.month.slice(0, 4) === year).length
  RANGES.forEach(r => {
    if (r.id === 'all') { out.push(r); return }
    if (r.id === 'ytd') { if (inYear >= 2 && inYear < rows.length) out.push(r); return }
    if (rows.length > r.months) out.push(r)
  })
  return out
}

function filterRange(rows, id) {
  if (!rows.length || id === 'all') return rows
  if (id === 'ytd') {
    const y = rows[rows.length - 1].month.slice(0, 4)
    const sub = rows.filter(r => r.month.slice(0, 4) === y)
    return sub.length >= 2 ? sub : rows
  }
  const def = RANGES.find(r => r.id === id)
  if (!def || !def.months) return rows
  return rows.slice(Math.max(0, rows.length - def.months))
}

/* ---- Shared bits ----------------------------------------- */
function deltaLine(v, extra) {
  if (v == null) return '<span class="is-flat">—</span>'
  const t = tone(v)
  const arrow = v > 0 ? icon('arrowUp') : v < 0 ? icon('arrowDown') : ''
  return `<span class="hero-change ${t}">${arrow}${money(v, { signed: true })}${
    extra ? ` <span class="nowrap">(${extra})</span>` : ''}</span>`
}

function xTick(monthKey) {
  return monthShort(monthKey) + ' ’' + monthKey.slice(2, 4)
}

function placeTip(tip, holder, x, html) {
  if (!tip) return
  if (x == null) { tip.classList.remove('is-on'); return }
  tip.innerHTML = html
  tip.classList.add('is-on')
  const hw = holder.clientWidth
  const tw = tip.offsetWidth || 110
  tip.style.left = Math.max(2, Math.min(hw - tw - 2, x - tw / 2)) + 'px'
  tip.style.top = '2px'
}

/* ============================================================
   HOME
   ============================================================ */
function viewHome() {
  const sum = summary()
  if (!sum) return emptyHome()

  const rows = sum.rows
  const parts = []

  /* Hero ------------------------------------------------- */
  parts.push(`
    <div class="hero">
      <div class="hero-label">Total Net Worth</div>
      <div class="hero-value num">${money(sum.netWorth)}</div>
      <div class="hero-meta">
        ${deltaLine(sum.monthDelta, sum.monthPct != null ? pct(sum.monthPct) : null)}
        <span class="hero-period">${monthLabel(sum.last.month)}</span>
      </div>
    </div>`)

  /* Chart ------------------------------------------------ */
  const ranges = availableRanges(rows)
  if (!ranges.some(r => r.id === ui.range)) ui.range = 'all'
  const showBench = sum.benchNow != null && rows.length > 1

  parts.push(`
    <section class="section">
      <div class="card chart-card">
        ${ranges.length > 1 ? `
        <div class="seg" role="group" aria-label="Time range">
          ${ranges.map(r => `<button class="seg-item" role="button"
              aria-pressed="${r.id === ui.range}" data-act="range" data-arg="${r.id}">${r.label}</button>`).join('')}
        </div>` : ''}
        <div class="chart-holder" style="margin-top:${ranges.length > 1 ? '14px' : '2px'}">
          <canvas id="nw-chart" aria-label="Net worth over time" role="img"></canvas>
          <div class="chart-tip" id="nw-tip" aria-hidden="true"></div>
        </div>
        <div class="legend">
          <span class="legend-item"><span class="legend-dash" style="background:var(--chart-line)"></span>Net worth</span>
          ${showBench ? `<button class="legend-item legend-toggle" data-act="toggle-bench"
            aria-pressed="${ui.showBench}" title="Show or hide the benchmark line">
            <span class="legend-dash" style="background:var(--accent)"></span>
            ${pctPlain(state.benchmarkRate, 1)}/mo benchmark</button>` : ''}
        </div>
      </div>
    </section>`)

  /* Wealth creation -------------------------------------- */
  const l = sum.last
  parts.push(`
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">Wealth Creation</h2>
        <span class="small muted">${monthLabel(l.month, true)}</span>
      </div>
      <div class="card">
        <div class="flow">
          <div class="flow-row">
            <span class="flow-key"><span class="flow-sign"></span>Starting wealth</span>
            <span class="flow-val num">${money(l.begin)}</span>
          </div>
          <div class="flow-row">
            <span class="flow-key"><span class="flow-sign">+</span>New capital</span>
            <span class="flow-val num ${l.fresh > 0 ? '' : 'muted'}">${money(l.fresh, { signed: true })}</span>
          </div>
          <div class="flow-row">
            <span class="flow-key"><span class="flow-sign">+</span>Wealth growth</span>
            <span class="flow-val num ${tone(l.growth)}">${money(l.growth, { signed: true })}</span>
          </div>
          <div class="flow-row is-total">
            <span class="flow-key"><span class="flow-sign">=</span>Ending wealth</span>
            <span class="flow-val num">${money(l.end)}</span>
          </div>
        </div>
        <p class="flow-note">${growthNarrative(l, sum)}</p>
      </div>
    </section>`)

  /* Accounts --------------------------------------------- */
  const acctRows = accountBreakdown(sum)
  if (acctRows.length) {
    const top = acctRows.slice(0, 4)
    parts.push(`
      <section class="section">
        <div class="section-head">
          <h2 class="section-title">Accounts</h2>
          ${acctRows.length > 4
            ? `<button class="section-link" data-act="all-accounts">View all</button>`
            : `<button class="section-link" data-act="manage-accounts">Manage</button>`}
        </div>
        <div class="group">${top.map(accountRowHTML).join('')}</div>
      </section>`)
  }

  /* Allocation ------------------------------------------- */
  parts.push(allocationSection(sum))

  /* Performance ------------------------------------------ */
  parts.push(`
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">Performance</h2>
        <button class="section-link" data-act="perf-detail">Details</button>
      </div>
      <div class="stats">
        <div class="stat">
          <div class="stat-label">This month</div>
          <div class="stat-value num ${tone(sum.twrMonth)}">${pct(sum.twrMonth)}</div>
          <div class="stat-sub">market return</div>
        </div>
        <div class="stat">
          <div class="stat-label">${sum.year} YTD</div>
          <div class="stat-value num ${tone(sum.twrYtd)}">${pct(sum.twrYtd)}</div>
          <div class="stat-sub">${money(sum.ytdGrowth, { signed: true })} growth</div>
        </div>
        <div class="stat">
          <div class="stat-label">All time</div>
          <div class="stat-value num ${tone(sum.twrAll)}">${pct(sum.twrAll)}</div>
          <div class="stat-sub">${sum.monthsHeld} month${sum.monthsHeld === 1 ? '' : 's'}</div>
        </div>
        <div class="stat">
          <div class="stat-label">New capital ${sum.year}</div>
          <div class="stat-value num">${compactMoney(sum.ytdFresh)}</div>
          <div class="stat-sub">${money(sum.totalFresh)} all time</div>
        </div>
      </div>
    </section>`)

  /* Goals ------------------------------------------------ */
  parts.push(goalsPreview(sum))

  /* Options ---------------------------------------------- */
  if (sum.optCount) {
    parts.push(`
      <section class="section">
        <div class="section-head">
          <h2 class="section-title">Options Income</h2>
          <button class="section-link" data-act="options-detail">Details</button>
        </div>
        <div class="stats">
          <div class="stat">
            <div class="stat-label">Premium ${sum.year}</div>
            <div class="stat-value num">${compactMoney(sum.optPremiumYtd)}</div>
            <div class="stat-sub">${money(sum.optPnlYtd, { signed: true })} realised</div>
          </div>
          <div class="stat">
            <div class="stat-label">Avg monthly P&amp;L</div>
            <div class="stat-value num ${tone(sum.optAvgPnl)}">${compactMoney(sum.optAvgPnl)}</div>
            <div class="stat-sub">over ${sum.optCount} month${sum.optCount === 1 ? '' : 's'}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Return on capital</div>
            <div class="stat-value num ${tone(sum.optRoc)}">${pct(sum.optRoc, 2)}</div>
            <div class="stat-sub">per month deployed</div>
          </div>
          <div class="stat">
            <div class="stat-label">Capital used</div>
            <div class="stat-value num">${compactMoney(sum.optAvgCap)}</div>
            <div class="stat-sub">average</div>
          </div>
        </div>
      </section>`)
  }

  return parts.join('')
}

function emptyHome() {
  return `
    <div class="hero">
      <div class="hero-label">Total Net Worth</div>
      <div class="hero-value num">${money(0)}</div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="empty">
        <div class="empty-icon">${icon('wallet')}</div>
        <div class="empty-title">Start your first month</div>
        <p class="empty-text">Add a monthly snapshot with each account’s opening balance,
          fresh cash and closing value. Wealth Arc works out the rest.</p>
        <button class="btn is-primary" data-act="add-snapshot">${icon('plus')}Add snapshot</button>
      </div>
    </div>`
}

/* ---- Narrative ------------------------------------------- */
function growthNarrative(l, sum) {
  if (l.begin <= 0 || sum.rows.length === 1) {
    return 'First tracked month — this becomes the baseline every later month is measured against.'
  }
  const bits = []
  const share = Math.abs(l.growth) + Math.abs(l.fresh)
  if (l.growth > 0 && l.fresh > 0) {
    const g = share > 0 ? Math.round(Math.abs(l.growth) / share * 100) : 0
    bits.push(`Investments did <strong>${g}%</strong> of the work this month, new capital the other <strong>${100 - g}%</strong>.`)
  } else if (l.growth > 0) {
    bits.push(`All of this month’s gain came from investment returns.`)
  } else if (l.growth < 0 && l.fresh > 0) {
    bits.push(`Markets took <strong>${money(Math.abs(l.growth))}</strong>; your <strong>${money(l.fresh)}</strong> of new capital cushioned it.`)
  } else if (l.growth < 0) {
    bits.push(`Down <strong>${money(Math.abs(l.growth))}</strong> on market movement.`)
  } else {
    bits.push('Flat month on investment returns.')
  }
  if (sum.benchGap != null && sum.rows.length > 1) {
    bits.push(sum.benchGap >= 0
      ? `You are <strong>${money(sum.benchGap)}</strong> ahead of the ${pctPlain(state.benchmarkRate, 1)}/mo benchmark.`
      : `You are <strong>${money(Math.abs(sum.benchGap))}</strong> behind the ${pctPlain(state.benchmarkRate, 1)}/mo benchmark.`)
  }
  return bits.join(' ')
}

/* ---- Accounts -------------------------------------------- */
function accountBreakdown(sum) {
  const per = sum.last.perAccount
  return state.accounts
    .filter(a => !a.archived && per[a.id])
    .map(a => ({ account: a, ...per[a.id] }))
    .sort((x, y) => y.end - x.end)
}

function accountRowHTML(r) {
  const change = r.end - r.begin
  return `
    <button class="row" data-act="account-detail" data-arg="${r.account.id}">
      <span class="row-icon">${escapeHTML(initials(r.account.name))}</span>
      <span class="row-main">
        <span class="row-label">${escapeHTML(r.account.name)}</span>
        <span class="row-sub">${r.fresh ? money(r.fresh, { signed: true }) + ' in · ' : ''}${
          r.ret != null ? pct(r.ret) + ' return' : 'no opening balance'}</span>
      </span>
      <span class="row-side">
        <span class="row-value num">${compactMoney(r.end)}</span>
        <span class="row-delta num ${tone(change)}">${money(change, { signed: true })}</span>
      </span>
      ${icon('chevron', 'row-chevron')}
    </button>`
}

/* ---- Allocation ------------------------------------------ */
function allocationSection(sum) {
  if (!sum.allocation) {
    return `
      <section class="section">
        <div class="section-head"><h2 class="section-title">Allocation</h2></div>
        <div class="card">
          <div class="empty" style="padding:26px 12px">
            <div class="empty-title">No allocation yet</div>
            <p class="empty-text">Add an allocation split to any snapshot to see how your
              wealth is structured.</p>
            <button class="btn" data-act="edit-snapshot" data-arg="${sum.last.month}">Add to ${monthLabel(sum.last.month, true)}</button>
          </div>
        </div>
      </section>`
  }

  const vals = sum.allocation.values
  const items = state.categories
    .map((c, i) => ({ cat: c, color: catColor(i), value: vals[c.id] || 0 }))
    .filter(x => x.value > 0)
    .sort((a, b) => b.value - a.value)

  const total = items.reduce((s, x) => s + x.value, 0)
  if (!total) return ''

  const drift = sum.netWorth > 0 ? (total - sum.netWorth) / sum.netWorth : 0
  const stale = sum.allocation.month !== sum.last.month

  return `
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">Allocation${stale ? ` · ${monthLabel(sum.allocation.month, true)}` : ''}</h2>
        <button class="section-link" data-act="alloc-trend">Trend</button>
      </div>
      <div class="card">
        <div class="dist" role="img" aria-label="Allocation split">
          ${items.map((x, i) => `<div class="dist-seg" style="flex:${x.value};background:${x.color};animation-delay:${i * 45}ms"></div>`).join('')}
        </div>
        <div class="dist-legend">
          ${items.map(x => `
            <div class="dist-legend-item">
              <span class="dist-dot" style="background:${x.color}"></span>
              <span class="dist-name">${escapeHTML(x.cat.name)}</span>
              <span class="dist-pct num">${(x.value / total * 100).toFixed(1)}%</span>
              <span class="dist-val num">${compactMoney(x.value)}</span>
            </div>`).join('')}
        </div>
        ${stale ? `
          <div class="callout" style="margin-top:14px">
            ${icon('info')}
            <span>This split is from ${monthLabel(sum.allocation.month, true)}.
              <button class="section-link" data-act="edit-snapshot" data-arg="${sum.last.month}"
                style="font-size:inherit">Add one for ${monthLabel(sum.last.month, true)}</button>.</span>
          </div>`
        : Math.abs(drift) > 0.01 ? `
          <div class="callout is-warn" style="margin-top:14px">
            ${icon('warn')}
            <span>Allocation totals ${money(total)} — ${money(Math.abs(total - sum.netWorth))}
            ${total > sum.netWorth ? 'more' : 'less'} than net worth.</span>
          </div>` : ''}
      </div>
    </section>`
}

/* ---- Goals preview -------------------------------------- */
function goalsPreview(sum) {
  if (!state.goals.length) {
    return `
      <section class="section">
        <div class="section-head"><h2 class="section-title">Goals</h2></div>
        <div class="card">
          <div class="empty" style="padding:26px 12px">
            <div class="empty-title">No goals set</div>
            <p class="empty-text">Name the numbers that matter and watch them close.</p>
            <button class="btn" data-act="add-goal">${icon('plus')}Add a goal</button>
          </div>
        </div>
      </section>`
  }

  const open = state.goals.filter(g => sum.netWorth < g.target)
  const show = (open.length ? open : state.goals).slice(0, 2)

  return `
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">Goals</h2>
        <button class="section-link" data-act="tab" data-arg="goals">All ${state.goals.length}</button>
      </div>
      <div class="group">${show.map(g => goalHTML(g, sum)).join('')}</div>
    </section>`
}

/** True when a goal is named after its own amount — don't print it twice. */
function goalNameIsAmount(g) {
  return g.name.trim() === compactMoney(g.target)
}

function goalHTML(g, sum) {
  const p = goalProgress(g, sum)
  const dup = goalNameIsAmount(g)
  return `
    <div class="goal">
      <div class="goal-head">
        <span class="goal-name">${escapeHTML(g.name)}</span>
        <span class="goal-target num ${dup ? 'muted small' : ''}">${
          dup ? (g.date ? 'by ' + monthLabel(g.date, true) : '') : compactMoney(g.target)}</span>
      </div>
      <div class="track">
        <div class="track-fill ${p.reached ? 'is-done' : ''}" style="width:${p.pct.toFixed(1)}%"></div>
      </div>
      <div class="goal-foot">
        <span>${p.reached ? 'Reached' : pctPlain(p.pct, 0) + ' · ' + money(p.remaining) + ' to go'}</span>
        <span>${p.reached ? icon('check') : p.eta ? etaLabel(p.eta) : ''}</span>
      </div>
    </div>`
}

function etaLabel(months) {
  if (months <= 1) return 'next month'
  if (months < 24) return `~${months} months`
  return `~${(months / 12).toFixed(1)} years`
}

/* ---- Home chart mount ------------------------------------ */
function mountHomeChart() {
  const canvas = document.getElementById('nw-chart')
  if (!canvas) return
  const sum = summary()
  if (!sum) return

  const rows = filterRange(sum.rows, ui.range)
  if (!rows.length) return
  const months = rows.map(r => r.month)
  const benchMap = {}
  sum.benchSeries.forEach(b => { benchMap[b.month] = b.value })

  const nwValues = rows.map(r => r.end)
  const benchValues = months.map(m => benchMap[m] == null ? null : benchMap[m])
  const hasBench = benchValues.some(v => v != null) && rows.length > 1 && ui.showBench

  const holder = canvas.parentElement
  const tip = document.getElementById('nw-tip')

  const draw = () => {
    if (!document.body.contains(canvas)) return
    lineChart(canvas, {
      labels: months,
      hoverIndex: ui.nwHover,
      formatTick: v => compactMoney(v),
      formatX: xTick,
      series: [
        ...(hasBench ? [{
          values: benchValues, color: 'var(--accent)', width: 1.5,
          dash: [3, 4], alpha: 0.5,
        }] : []),
        {
          values: nwValues, color: 'var(--chart-line)', width: 2.4,
          fill: true, marker: ui.nwHover == null,
        },
      ],
      onHover: (i, x) => {
        ui.nwHover = i
        if (i == null) { placeTip(tip, holder, null); draw(); return }
        const r = rows[i]
        const b = benchValues[i]
        placeTip(tip, holder, x, `
          <div class="chart-tip-when">${monthLabel(r.month, true)}</div>
          <div class="chart-tip-value">${money(r.end)}</div>
          <div class="chart-tip-extra">${money(r.end - r.begin, { signed: true })} in month${
            hasBench && b != null ? `<br>benchmark ${compactMoney(b)}` : ''}</div>`)
        draw()
      },
    })
  }
  registerChart(draw)
}

/* ============================================================
   HISTORY
   ============================================================ */
function viewHistory() {
  const sum = summary()
  if (!sum) {
    return `
      <div class="card" style="margin-top:16px">
        <div class="empty">
          <div class="empty-icon">${icon('history')}</div>
          <div class="empty-title">No history yet</div>
          <p class="empty-text">Every month you add builds the record of how your wealth moved.</p>
          <button class="btn is-primary" data-act="add-snapshot">${icon('plus')}Add snapshot</button>
        </div>
      </div>`
  }

  const rows = [...sum.rows].reverse()
  const byYear = {}
  rows.forEach(r => {
    const y = r.month.slice(0, 4)
    ;(byYear[y] = byYear[y] || []).push(r)
  })

  const years = Object.keys(byYear).sort((a, b) => b.localeCompare(a))
  const parts = []

  parts.push(`
    <div class="section" style="margin-top:8px">
      <div class="stats">
        <div class="stat">
          <div class="stat-label">Net worth</div>
          <div class="stat-value num">${compactMoney(sum.netWorth)}</div>
          <div class="stat-sub">${sum.rows.length} month${sum.rows.length === 1 ? '' : 's'} tracked</div>
        </div>
        <div class="stat">
          <div class="stat-label">Capital added</div>
          <div class="stat-value num">${compactMoney(sum.totalFresh)}</div>
          <div class="stat-sub">all time</div>
        </div>
        <div class="stat">
          <div class="stat-label">Wealth growth</div>
          <div class="stat-value num ${tone(sum.totalGrowth)}">${compactMoney(sum.totalGrowth)}</div>
          <div class="stat-sub">from investments</div>
        </div>
      </div>
    </div>`)

  years.forEach(y => {
    const list = byYear[y]
    const growth = list.reduce((s, r) => s + r.growth, 0)
    const fresh = list.reduce((s, r) => s + r.fresh, 0)
    const close = list[0].end
    parts.push(`
      <div class="year-head">
        <h2 class="year-title">${y}</h2>
        <span class="year-meta">${compactMoney(close)} · ${money(growth, { signed: true })} growth</span>
      </div>
      <div class="group">
        ${list.map(r => `
          <button class="snap-row" data-act="edit-snapshot" data-arg="${r.month}">
            <span>
              <span class="snap-month">${monthLabel(r.month, true)}</span>
              ${r.note ? `<span class="snap-note">${escapeHTML(r.note)}</span>` : ''}
            </span>
            <span class="snap-worth num">${compactMoney(r.end)}</span>
            <span class="snap-ret num ${tone(r.ret)}">${r.ret == null ? '—' : pct(r.ret, 1)}</span>
          </button>`).join('')}
      </div>
      <div class="small muted" style="margin:8px 4px 0">
        ${money(fresh)} new capital in ${y}
      </div>`)
  })

  return parts.join('')
}
