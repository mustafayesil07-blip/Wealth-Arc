// ─── NAV ──────────────────────────────────────────────────────
function showPage(id,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'))
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'))
  document.getElementById('page-'+id).classList.add('active')
  btn.classList.add('active')
  // Scroll BEFORE render — prevents "content slides up from below" effect
  window.scrollTo(0,0)
  document.documentElement.scrollTop=0
  document.body.scrollTop=0
  if(id==='dashboard')renderDashboard()
  if(id==='timeline')renderTimeline()
  if(id==='projection')renderProjection()
  if(id==='income')renderIncome()
  if(id==='breakdown')renderBreakdown()
  if(id==='settings')renderSettings()
}
function render(){
  const id=document.querySelector('.page.active')?.id?.replace('page-','')
  if(!id||id==='dashboard')renderDashboard()
  if(id==='timeline')renderTimeline()
  if(id==='income')renderIncome()
  if(id==='breakdown')renderBreakdown()
  if(id==='settings')renderSettings()
}

// ─── TOAST ────────────────────────────────────────────────────
let toastT=null
function toast(msg){
  const el=document.getElementById('toast')
  el.textContent=msg;el.classList.remove('hidden')
  clearTimeout(toastT);toastT=setTimeout(()=>el.classList.add('hidden'),2200)
}



// ─── PROJECTION LAB ────────────────────────────────────────────
function runProjection(startVal, monthlyContrib, monthlyRate, months){
  const out=[]
  let v=startVal
  for(let i=0;i<months;i++){
    v=(v+monthlyContrib)*(1+monthlyRate)
    out.push(Math.round(v))
  }
  return out
}

function projMonthLabel(monthsAhead){
  const d=new Date()
  d.setMonth(d.getMonth()+monthsAhead)
  return d.toLocaleString('en-US',{month:'short',year:'numeric'})
}

function projYear(monthsAhead){
  const d=new Date()
  d.setMonth(d.getMonth()+monthsAhead)
  return d.getFullYear()
}

function findMilestoneMonth(series, milestone){
  for(let i=0;i<series.length;i++){
    if(series[i]>=milestone) return i+1
  }
  return null
}

let projChart=null

function syncNum(sliderId, numId, decimals){
  const v = +document.getElementById(sliderId).value
  document.getElementById(numId).value = v.toFixed ? v.toFixed(decimals) : v
}
function syncSlider(numId, sliderId, decimals){
  const v = +document.getElementById(numId).value
  const s = document.getElementById(sliderId)
  const clamped = Math.min(Math.max(v, +s.min), +s.max)
  s.value = clamped
}

function updateProjection(){
  const startVal = +document.getElementById('p-start').value
  const contrib  = +document.getElementById('p-contrib').value
  const customRate = +document.getElementById('p-rate').value / 100
  const years    = +document.getElementById('p-years').value
  const months   = years * 12
  const baseRate = 0.03  // fixed base scenario for comparison

  // Update labels
  document.getElementById('p-start-lbl').textContent  = fmt(startVal)
  document.getElementById('p-contrib-lbl').textContent = fmt(contrib)
  const rateVal = (+document.getElementById('p-rate').value).toFixed(1)
  document.getElementById('p-rate-lbl').textContent   = rateVal + '%'
  document.getElementById('p-years-lbl').textContent  = years + ' year' + (years!==1?'s':'')
  // Update custom rate legend
  const cl = document.getElementById('custom-rate-label')
  if(cl) cl.textContent = rateVal + '%'
  // Hide custom line legend if rate == 3% (redundant with base)
  const custLeg = document.getElementById('custom-legend')
  if(custLeg) custLeg.style.display = Math.abs(customRate - baseRate) < 0.0001 ? 'none' : 'inline-flex'

  // ── Simulations ──────────────────────────────────────────────
  const cons   = runProjection(startVal, contrib, 0.02, months)
  const base   = runProjection(startVal, contrib, baseRate, months)
  const agg    = runProjection(startVal, contrib, 0.04, months)
  const custom = runProjection(startVal, contrib, customRate, months)

  const totalContrib  = contrib * months
  const finalBase     = base[base.length-1]
  const finalAgg      = agg[agg.length-1]
  const finalCons     = cons[cons.length-1]
  const finalCustom   = custom[custom.length-1]

  // ── Result cards ─────────────────────────────────────────────
  document.getElementById('pr-base').textContent    = fmt(finalBase)
  document.getElementById('pr-base-sub').textContent = 'in ' + years + ' yr' + (years!==1?'s':'')
  document.getElementById('pr-agg').textContent     = fmt(finalAgg)
  document.getElementById('pr-agg-sub').textContent  = 'in ' + years + ' yr' + (years!==1?'s':'')
  document.getElementById('pr-cons').textContent    = fmt(finalCons)
  document.getElementById('pr-cons-sub').textContent = 'in ' + years + ' yr' + (years!==1?'s':'')
  document.getElementById('pr-contrib').textContent = fmt(totalContrib)

  // ── Comparison: custom vs base ────────────────────────────────
  const diffFinal = finalCustom - finalBase
  const isAbove   = diffFinal > 0
  const diffCls   = Math.abs(diffFinal) < 500 ? 'cr-diff-zero' : isAbove ? 'cr-diff-pos' : 'cr-diff-neg'
  const diffSign  = diffFinal >= 0 ? '+' : ''

  // Milestone timing comparison
  const milestones = [200000, 300000, 500000, 600000]
  const compareRows = []

  // Final value row
  compareRows.push(`
    <div class="compare-row">
      <span class="cr-label">Final Value (${years}yr)</span>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="cr-base">${fmt(finalBase)}</span>
        <span style="color:var(--mu);font-size:10px">→</span>
        <span class="cr-custom">${fmt(finalCustom)}</span>
        <span class="cr-diff ${diffCls}">${diffSign}${fmtC(diffFinal)}</span>
      </div>
    </div>`)

  // Investment growth comparison
  const growthBase   = finalBase   - startVal - totalContrib
  const growthCustom = finalCustom - startVal - totalContrib
  const growthDiff   = growthCustom - growthBase
  const gdCls = Math.abs(growthDiff) < 200 ? 'cr-diff-zero' : growthDiff > 0 ? 'cr-diff-pos' : 'cr-diff-neg'
  compareRows.push(`
    <div class="compare-row">
      <span class="cr-label">Investment Returns</span>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="cr-base">${fmt(growthBase)}</span>
        <span style="color:var(--mu);font-size:10px">→</span>
        <span class="cr-custom">${fmt(growthCustom)}</span>
        <span class="cr-diff ${gdCls}">${growthDiff>=0?'+':''}${fmtC(growthDiff)}</span>
      </div>
    </div>`)

  // Key milestone timing row
  const ms500base   = findMilestoneMonth(base, 500000)
  const ms500custom = findMilestoneMonth(custom, 500000)
  if(startVal < 500000 && (ms500base || ms500custom)) {
    const bLabel = ms500base   ? projMonthLabel(ms500base)   : 'Beyond'
    const cLabel = ms500custom ? projMonthLabel(ms500custom) : 'Beyond'
    const mDiff  = ms500base && ms500custom ? ms500base - ms500custom : null
    const mCls   = !mDiff ? 'cr-diff-zero' : mDiff > 0 ? 'cr-diff-pos' : 'cr-diff-neg'
    const mTxt   = !mDiff ? '—' : mDiff > 0 ? mDiff + ' mo earlier' : Math.abs(mDiff) + ' mo later'
    compareRows.push(`
      <div class="compare-row">
        <span class="cr-label">$500K milestone</span>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="cr-base">${bLabel}</span>
          <span style="color:var(--mu);font-size:10px">→</span>
          <span class="cr-custom">${cLabel}</span>
          <span class="cr-diff ${mCls}">${mTxt}</span>
        </div>
      </div>`)
  }

  document.getElementById('proj-compare').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <span style="font-size:11px;color:var(--mu)">Base 3%</span>
      <span style="font-size:10px;color:rgba(255,255,255,0.2)">vs</span>
      <span style="font-size:11px;color:var(--gold)">${rateVal}% Custom</span>
    </div>
    ${compareRows.join('')}
    ${Math.abs(customRate - baseRate) < 0.0001 ? '<div style="font-size:11px;color:var(--mu);text-align:center;padding:8px 0">Adjust the custom rate to see differences</div>' : ''}
  `

  // ── Milestone table ───────────────────────────────────────────
  const msHtml = milestones.map(ms => {
    const alreadyReached = startVal >= ms
    const mBase   = alreadyReached ? null : findMilestoneMonth(base, ms)
    const mCons   = alreadyReached ? null : findMilestoneMonth(cons, ms)
    const mAgg    = alreadyReached ? null : findMilestoneMonth(agg, ms)
    const mCustom = alreadyReached ? null : findMilestoneMonth(custom, ms)
    const reached = `<span style="color:var(--green);font-size:10px">✓ Already reached</span>`
    const dtHtml  = (m, col) => m
      ? `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:${col}">${projMonthLabel(m)}</div>`
      : `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--mu)">Beyond</div>`
    return `<div class="ms-row">
      <div class="ms-name">${fmtC(ms)}</div>
      ${alreadyReached ? `<div>${reached}</div>` : `
      <div class="ms-dates">
        <div class="ms-date"><div class="ms-dt-lbl">Cons</div>${dtHtml(mCons,'rgba(77,216,240,0.8)')}</div>
        <div class="ms-date"><div class="ms-dt-lbl">Base</div>${dtHtml(mBase,'rgba(245,166,35,0.9)')}</div>
        <div class="ms-date"><div class="ms-dt-lbl">Agg</div>${dtHtml(mAgg,'rgba(176,143,255,0.9)')}</div>
        <div class="ms-date"><div class="ms-dt-lbl" style="color:var(--green)">Custom</div>${dtHtml(mCustom,'var(--green)')}</div>
      </div>`}
    </div>`
  }).join('')
  document.getElementById('proj-milestones').innerHTML = msHtml

  // ── Projection Insights ───────────────────────────────────────
  const insights = []
  const investGrowthCustom = finalCustom - startVal - totalContrib

  // 1. Headline: when do we hit the highest unmet milestone?
  const targets = [600000, 500000, 300000, 200000]
  const headlineMilestone = targets.find(t => startVal < t) || 600000
  const msCustom = findMilestoneMonth(custom, headlineMilestone)
  if(msCustom) {
    insights.push(`At ${rateVal}% monthly, your portfolio reaches ${fmtC(headlineMilestone)} around ${projMonthLabel(msCustom)} — in about ${msCustom} months.`)
  } else {
    insights.push(`At ${rateVal}% monthly, your portfolio reaches ${fmt(finalCustom)} after ${years} years. Extend the horizon or increase contributions to hit ${fmtC(headlineMilestone)}.`)
  }

  // 2. Compounding vs contributions
  const contribShare = totalContrib > 0 ? (totalContrib / (finalCustom - startVal) * 100) : 100
  if(investGrowthCustom > totalContrib) {
    insights.push(`Compounding will generate ${fmt(investGrowthCustom)} — more than your ${fmt(totalContrib)} in contributions. After ${years} years, your money works harder than you do.`)
  } else if(contribShare > 60) {
    insights.push(`Contributions account for ${contribShare.toFixed(0)}% of growth over ${years} years. Returns dominate once the portfolio surpasses ~${fmtC(contrib * 50)} — consider increasing contributions now.`)
  } else {
    insights.push(`Your ${fmt(totalContrib)} in contributions and ${fmt(investGrowthCustom)} in returns split the growth roughly evenly. The balance shifts toward compounding as the portfolio grows.`)
  }

  // 3. Rate sensitivity
  const rateImpact = finalCustom - finalBase
  if(Math.abs(customRate - baseRate) > 0.001) {
    const dir = rateImpact > 0 ? 'adds' : 'costs'
    insights.push(`Moving from 3% to ${rateVal}% monthly return ${dir} ${fmt(Math.abs(rateImpact))} over ${years} years. Every 0.5% in monthly return compounds significantly at this portfolio size.`)
  } else {
    // Contribution sensitivity
    const reduced = runProjection(startVal, Math.max(0, contrib - 2000), customRate, months)
    const reducedFinal = reduced[reduced.length - 1]
    insights.push(`Reducing monthly contribution by ${fmt(2000)} would lower your ${years}-year result by ${fmt(finalCustom - reducedFinal)}. Each additional ${fmt(1000)} per month matters more as the horizon grows.`)
  }

  document.getElementById('proj-insights').innerHTML =
    insights.map(txt => `<div class="proj-insight"><div class="pi-text">${txt}</div></div>`).join('')

  // Persist projection inputs
  state.projectionInputs = {
    startVal: startVal,
    contrib:  contrib,
    rate:     +document.getElementById('p-rate').value,
    years:    years,
  }
  save()

  // ── Chart ─────────────────────────────────────────────────────
  const canvas = document.getElementById('proj-chart')
  const wrap   = canvas.parentElement
  const dpr    = window.devicePixelRatio || 1
  const W      = wrap.clientWidth || 320, H = 220
  canvas.width  = W * dpr; canvas.height = H * dpr
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px'
  const C = canvas.getContext('2d')
  C.scale(dpr, dpr); C.clearRect(0, 0, W, H)
  // Dark canvas background
  C.fillStyle='#1e1a14'; C.fillRect(0,0,W,H)

  const step  = Math.max(1, Math.floor(months / 50))
  const xData = []
  for(let i = 0; i <= months; i += step) xData.push(i)

  const allV  = [startVal, ...cons, ...base, ...agg, ...custom]
  const minV  = Math.min(...allV) * 0.97
  const maxV  = Math.max(...allV) * 1.02

  const padL = 58, padR = 12, padT = 24, padB = 36
  const cW   = W - padL - padR, cH = H - padT - padB
  const n    = xData.length
  const xOf  = i => padL + (i / (n-1)) * cW
  const yOf  = v => padT + cH - ((v - minV) / (maxV - minV)) * cH

  // Grid
  C.strokeStyle = 'rgba(255,255,255,0.07)'; C.lineWidth = 1
  for(let i = 0; i <= 4; i++){
    const y = padT + (i/4) * cH
    C.beginPath(); C.moveTo(padL, y); C.lineTo(padL + cW, y); C.stroke()
  }
  // Y labels
  C.fillStyle = 'rgba(255,240,210,0.60)'; C.font = 'bold 9px JetBrains Mono,monospace'; C.textAlign = 'right'
  for(let i = 0; i <= 4; i++){
    const v = minV + ((4-i)/4) * (maxV - minV)
    C.fillText(fmtC(v), padL - 7, padT + (i/4) * cH + 3.5)
  }
  // X labels
  C.textAlign = 'center'; C.fillStyle = 'rgba(255,240,210,0.60)'; C.font = 'bold 9px JetBrains Mono,monospace'
  for(let yr = 0; yr <= years; yr++){
    const tgt = yr * 12
    const xi  = xData.reduce((best, v, i) => Math.abs(v - tgt) < Math.abs(xData[best] - tgt) ? i : best, 0)
    C.fillText(projYear(tgt), xOf(xi), H - padB + 14)
  }

  function drawLine(series, color, dash, width, glow){
    const d = xData.map(i => i === 0 ? startVal : series[i-1])
    C.strokeStyle = color; C.lineWidth = width || 1.5
    C.setLineDash(dash || []); C.lineJoin = 'round'; C.lineCap = 'round'
    if(glow){ C.save(); C.shadowColor = glow; C.shadowBlur = 12 }
    C.beginPath()
    d.forEach((v, i) => i === 0 ? C.moveTo(xOf(i), yOf(v)) : C.lineTo(xOf(i), yOf(v)))
    C.stroke()
    if(glow) C.restore()
    C.setLineDash([])
  }

  // Area fill under custom line
  const custPts = xData.map(i => i === 0 ? startVal : custom[i-1])
  C.beginPath()
  custPts.forEach((v, i) => i === 0 ? C.moveTo(xOf(i), yOf(v)) : C.lineTo(xOf(i), yOf(v)))
  C.lineTo(xOf(n-1), padT + cH); C.lineTo(xOf(0), padT + cH); C.closePath()
  const gr = C.createLinearGradient(0, padT, 0, padT + cH)
  gr.addColorStop(0, 'rgba(46,232,154,0.18)'); gr.addColorStop(1, 'transparent')
  C.fillStyle = gr; C.fill()

  drawLine(cons,   'rgba(110,200,240,0.65)',  [5,4], 1.8)
  drawLine(base,   'rgba(245,180,60,0.65)',   [5,4], 1.8)
  drawLine(agg,    'rgba(190,160,255,0.65)', [5,4], 1.8)
  // Custom scenario: solid bright green line
  drawLine(custom, '#2ee89a', [], 2.5, 'rgba(46,232,154,0.5)')

  // End dot on custom line
  const lastX = xOf(n-1), lastY = yOf(custom[custom.length-1])
  C.save(); C.shadowColor = 'rgba(46,232,154,0.8)'; C.shadowBlur = 14
  C.beginPath(); C.arc(lastX, lastY, 5, 0, Math.PI*2); C.fillStyle = '#1e1a14'; C.fill()
  C.beginPath(); C.arc(lastX, lastY, 3.5, 0, Math.PI*2); C.fillStyle = '#2ee89a'; C.fill()
  C.restore()
}

function renderProjection(){
  const d  = derive()
  const pi = state.projectionInputs || {}

  const slider      = document.getElementById('p-start')
  const defaultStart = d?.last?.actualPortfolio ?? state.startValue
  const savedStart   = pi.startVal ?? defaultStart
  if(savedStart > +slider.max) slider.max = Math.ceil(savedStart / 10000) * 10000 + 50000
  slider.value = savedStart
  syncNum('p-start', 'p-start-n', 0)

  if(pi.contrib != null){
    document.getElementById('p-contrib').value = pi.contrib
    syncNum('p-contrib', 'p-contrib-n', 0)
  }
  if(pi.rate != null){
    document.getElementById('p-rate').value = pi.rate
    syncNum('p-rate', 'p-rate-n', 1)
  }
  if(pi.years != null){
    document.getElementById('p-years').value = pi.years
    syncNum('p-years', 'p-years-n', 0)
  }

  updateProjection()
}




// ═══════════════════════════════════════════════════════════════
// OPTIONS INCOME
// ═══════════════════════════════════════════════════════════════

// ── Helpers ────────────────────────────────────────────────────
function incSorted(){
  return [...(state.optionsIncome||[])].sort((a,b)=>a.month.localeCompare(b.month))
}

// Return on capital: realizedPnL / capitalUsed (0 if no capital)
function calcROC(entry){
  if(!entry.capitalUsed || entry.capitalUsed === 0) return null
  return (entry.realizedOptionsPnL / entry.capitalUsed) * 100
}

// YTD = current calendar year
function incYTD(){
  const yr = new Date().getFullYear().toString()
  return (state.optionsIncome||[]).filter(e=>e.month.startsWith(yr))
}

// ── Bar chart (premium or PnL) ─────────────────────────────────
function drawIncBarChart(canvasId, entries, valueKey, color, negColor){
  const canvas = document.getElementById(canvasId)
  if(!canvas) return
  const wrap = canvas.parentElement
  const dpr  = window.devicePixelRatio||1
  const W    = wrap.clientWidth||300, H = 160
  canvas.width=W*dpr; canvas.height=H*dpr
  canvas.style.width=W+'px'; canvas.style.height=H+'px'
  const C = canvas.getContext('2d')
  C.scale(dpr,dpr); C.clearRect(0,0,W,H)
  C.fillStyle='#1e1a14'; C.fillRect(0,0,W,H)

  if(!entries.length) return

  const values = entries.map(e=>e[valueKey]||0)
  const maxV   = Math.max(...values.map(Math.abs), 1)
  const padL=50, padR=10, padT=10, padB=28
  const cW=W-padL-padR, cH=H-padT-padB
  const n=entries.length
  const barW=Math.max(4, Math.min(28, (cW/n)*0.65))
  const gap  = cW/n

  // Zero line
  const hasNeg = values.some(v=>v<0)
  const zeroY  = hasNeg ? padT + cH*0.5 : padT+cH

  // Grid
  C.strokeStyle='rgba(255,255,255,0.07)'; C.lineWidth=1
  for(let i=0;i<=3;i++){
    const y=padT+(i/3)*cH; C.beginPath(); C.moveTo(padL,y); C.lineTo(padL+cW,y); C.stroke()
  }
  // Zero line (visible)
  C.strokeStyle='rgba(255,255,255,0.25)'; C.lineWidth=1
  C.beginPath(); C.moveTo(padL,zeroY); C.lineTo(padL+cW,zeroY); C.stroke()

  // Y labels
  C.fillStyle='rgba(255,240,210,0.60)'; C.font='bold 8px JetBrains Mono,monospace'; C.textAlign='right'
  const labelVal = hasNeg ? maxV : maxV
  C.fillText(fmtC(labelVal), padL-4, padT+4)
  if(hasNeg) C.fillText(fmtC(-maxV), padL-4, padT+cH-2)

  // Bars
  entries.forEach((e,i)=>{
    const v = e[valueKey]||0
    const isNeg = v<0
    const barH  = Math.abs(v)/maxV * (cH * (hasNeg?0.47:0.88))
    const x     = padL + i*gap + (gap-barW)/2
    const y     = isNeg ? zeroY : zeroY-barH
    const c     = isNeg ? (negColor||'rgba(255,107,122,0.7)') : color

    // Bar fill with gradient
    const gr = C.createLinearGradient(0, y, 0, y+barH)
    gr.addColorStop(0, c)
    gr.addColorStop(1, c.replace(/[\d.]+\)$/, '0.3)'))
    C.fillStyle=gr
    C.beginPath()
    C.roundRect ? C.roundRect(x,y,barW,barH,3) : C.rect(x,y,barW,barH)
    C.fill()

    // Glow on top
    C.save()
    C.shadowColor=c; C.shadowBlur=6
    C.fillStyle=c; C.beginPath()
    const topH=Math.min(3,barH)
    C.rect(x, isNeg?zeroY:y, barW, topH); C.fill()
    C.restore()

    // X label
    C.fillStyle='rgba(255,240,210,0.60)'; C.font='bold 8px JetBrains Mono,monospace'; C.textAlign='center'
    const mo = e.month.split('-')[1]
    C.fillText(mo, x+barW/2, H-padB+14)
  })
}

// ── Main render ────────────────────────────────────────────────
function renderIncome(){
  const entries = incSorted()
  const ytd     = incYTD()
  const n       = entries.length

  // ── KPIs ────────────────────────────────────────────────────
  // YTD premium
  const ytdPremium = ytd.reduce((s,e)=>s+e.premiumIncome,0)
  document.getElementById('ki-ytd-premium').textContent = n ? fmt(ytdPremium) : '—'
  document.getElementById('ki-ytd-sub').textContent = ytd.length
    ? ytd.length+' month'+(ytd.length!==1?'s':'')+' this year'
    : 'No entries yet'

  // Avg monthly PnL
  const avgPnL = n ? entries.reduce((s,e)=>s+e.realizedOptionsPnL,0)/n : null
  const pnlEl  = document.getElementById('ki-avg-pnl')
  pnlEl.textContent = avgPnL!=null ? fmt(avgPnL) : '—'
  pnlEl.className   = 'kpi-val ' + (avgPnL==null?'':avgPnL>=0?'cg':'cr')
  document.getElementById('ki-avg-pnl-sub').textContent = n ? 'across '+n+' month'+(n!==1?'s':'') : '—'

  // Avg ROC (only entries with capitalUsed > 0)
  const rocEntries = entries.filter(e=>e.capitalUsed>0)
  const avgROC     = rocEntries.length
    ? rocEntries.reduce((s,e)=>s+calcROC(e),0)/rocEntries.length : null
  const rocEl = document.getElementById('ki-avg-roc')
  rocEl.textContent = avgROC!=null ? avgROC.toFixed(2)+'%' : '—'
  rocEl.className   = 'kpi-val ' + (avgROC==null?'cc':avgROC>=0?'cc':'cr')

  // Avg capital used
  const avgCap = n ? entries.reduce((s,e)=>s+e.capitalUsed,0)/n : null
  document.getElementById('ki-avg-cap').textContent = avgCap ? fmt(avgCap) : '—'
  document.getElementById('ki-cap-sub').textContent = avgCap ? 'avg deployed' : 'No entries yet'

  // Best / worst by realizedPnL
  if(n){
    const best  = entries.reduce((a,b)=>b.realizedOptionsPnL>a.realizedOptionsPnL?b:a)
    const worst = entries.reduce((a,b)=>b.realizedOptionsPnL<a.realizedOptionsPnL?b:a)
    document.getElementById('ki-best-val').textContent = fmt(best.realizedOptionsPnL)
    document.getElementById('ki-best-mo').textContent  = fmtMo(best.month)
    const wv = document.getElementById('ki-worst-val')
    wv.textContent = fmt(worst.realizedOptionsPnL)
    wv.className   = 'kpi-val '+(worst.realizedOptionsPnL<0?'cr':'cg')
    document.getElementById('ki-worst-mo').textContent = fmtMo(worst.month)
  } else {
    ['ki-best-val','ki-worst-val'].forEach(id=>{document.getElementById(id).textContent='—'})
    ['ki-best-mo','ki-worst-mo'].forEach(id=>{document.getElementById(id).textContent='—'})
  }

  // ── Chart totals ─────────────────────────────────────────────
  const totalPremium = entries.reduce((s,e)=>s+e.premiumIncome,0)
  const totalPnL     = entries.reduce((s,e)=>s+e.realizedOptionsPnL,0)
  document.getElementById('ch-premium-total').textContent = n ? fmt(totalPremium)+' total' : '—'
  document.getElementById('ch-pnl-total').textContent     = n ? (totalPnL>=0?'+':'')+fmt(totalPnL)+' net' : '—'
  document.getElementById('ch-pnl-total').className       = 'font-size:10px;color:'+(totalPnL>=0?'var(--cyan)':'var(--red)')

  // ── Draw charts ───────────────────────────────────────────────
  drawIncBarChart('ch-premium', entries, 'premiumIncome',    'rgba(245,166,35,0.85)', 'rgba(245,166,35,0.4)')
  drawIncBarChart('ch-pnl',     entries, 'realizedOptionsPnL','rgba(77,216,240,0.85)','rgba(255,107,122,0.75)')

  // ── Trajectory connection insights ───────────────────────────
  const insights = []
  const d = derive()
  const totActualContrib = d ? d.totA : 0
  const totalOptIncome   = entries.reduce((s,e)=>s+e.realizedOptionsPnL,0)
  const totalPremiumAll  = entries.reduce((s,e)=>s+e.premiumIncome,0)
  const annualPace       = n>=2 ? (totalPremiumAll/n)*12 : null

  if(n===0){
    insights.push('Add your first options income entry to see trajectory connection insights.')
  } else {
    // 1. Funding % of contributions
    if(totActualContrib>0){
      const fundPct = (totalOptIncome/totActualContrib*100)
      if(fundPct>0){
        insights.push(`Options income funded approximately ${fundPct.toFixed(0)}% of your total actual contributions. ${fundPct>=30?'This is a meaningful source of capital.':'Growing this layer will reduce pressure on salary contributions.'}`)
      } else if(fundPct<0){
        insights.push(`Net realized PnL is currently negative (${fmt(totalOptIncome)}). Options activity is not yet contributing positively to your contribution base.`)
      }
    }

    // 2. Annual pace
    if(annualPace!=null){
      const avgMonthlyContrib = totActualContrib>0 && d ? totActualContrib/d.ms.length : 0
      insights.push(`At current pace, annual options premium income is approximately ${fmt(annualPace)}.${avgMonthlyContrib>0?' That covers '+((annualPace/12)/avgMonthlyContrib*100).toFixed(0)+'% of your average monthly contribution target.':''}`)
    }

    // 3. Capital efficiency
    if(avgROC!=null){
      if(avgROC>3){
        insights.push(`Average realized return on deployed capital is ${avgROC.toFixed(1)}% per month — a strong efficiency ratio. Scaling capital used could compound the income contribution significantly.`)
      } else if(avgROC>0){
        insights.push(`Average realized return on deployed capital is ${avgROC.toFixed(1)}% per month. Maintaining discipline on strike selection and position sizing will improve this over time.`)
      } else {
        insights.push(`Average realized return on capital is currently negative (${avgROC.toFixed(1)}%). Review recent trade outcomes to identify sizing or market-condition issues.`)
      }
    }

    // 4. Premium vs realized gap (slippage / losses)
    const slippage = totalPremiumAll - totalOptIncome
    if(n>=3 && Math.abs(slippage)>200){
      const slipPct = (slippage/totalPremiumAll*100)
      if(slipPct>20){
        insights.push(`${slipPct.toFixed(0)}% of collected premium was consumed by losses or buybacks (${fmt(slippage)}). Reducing this gap — through better exit management — directly improves net income.`)
      }
    }
  }

  document.getElementById('inc-insights').innerHTML =
    insights.map(t=>`<div class="inc-insight"><div class="ii-text">${t}</div></div>`).join('')

  // ── Entry list ────────────────────────────────────────────────
  document.getElementById('inc-count').textContent = n+' month'+(n!==1?'s':'')+' tracked'
  const list = document.getElementById('inc-list')
  if(!n){
    list.innerHTML=`<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg><p>No income entries yet.<br>Tap <strong style="color:var(--tx)">Add</strong> to record your first month.</p></div>`
    return
  }

  list.innerHTML = [...entries].reverse().map(e=>{
    const roc    = calcROC(e)
    const isNeg  = e.realizedOptionsPnL < 0
    const stripe = isNeg ? 'stripe-red' : e.realizedOptionsPnL > e.premiumIncome*0.8 ? 'stripe-green' : 'stripe-amber'
    const pnlCls = isNeg ? 'cr' : 'cg'
    const rocTxt = roc!=null ? roc.toFixed(2)+'%' : '—'
    const rocCls = roc==null?'cm':roc>=0?'cc':'cr'
    return `<div class="inc-row" onclick="openIncModal('${e.month}')">
      <div class="stripe ${stripe}"></div>
      <div class="inc-row-top">
        <div>
          <div class="inc-month">${fmtMo(e.month)}</div>
          ${e.note?`<div style="font-size:10px;color:var(--mu);margin-top:2px;font-style:italic">${escapeHTML(e.note)}</div>`:''}
        </div>
        <div style="text-align:right">
          <div class="inc-premium cgo">${fmt(e.premiumIncome)}</div>
          <div style="font-size:10px;color:var(--mu);font-weight:700;font-family:'JetBrains Mono',monospace">premium</div>
        </div>
      </div>
      <div class="inc-grid">
        <div><div class="ig-lbl">Realized PnL</div><div class="ig-val ${pnlCls}">${fmt(e.realizedOptionsPnL)}</div></div>
        <div><div class="ig-lbl">Capital Used</div><div class="ig-val cm">${e.capitalUsed?fmt(e.capitalUsed):'—'}</div></div>
        <div><div class="ig-lbl">Return/Capital</div><div class="ig-val ${rocCls}">${rocTxt}</div></div>
      </div>
    </div>`
  }).join('')
}

// ── Income modal ───────────────────────────────────────────────
let editIncMonth = null

function openIncModal(monthStr){
  editIncMonth = monthStr||null
  if(editIncMonth){
    const e = (state.optionsIncome||[]).find(x=>x.month===editIncMonth)
    document.getElementById('inc-modal-title').textContent='Edit Entry'
    document.getElementById('if-month').value    = editIncMonth
    document.getElementById('if-month').disabled = true
    document.getElementById('if-premium').value  = e?.premiumIncome??''
    document.getElementById('if-pnl').value      = e?.realizedOptionsPnL??''
    document.getElementById('if-capital').value  = e?.capitalUsed??''
    document.getElementById('if-note').value     = e?.note??''
    document.getElementById('inc-del-btn').style.display='flex'
  } else {
    document.getElementById('inc-modal-title').textContent='Add Income Entry'
    document.getElementById('if-month').value    = ''
    document.getElementById('if-month').disabled = false
    document.getElementById('if-premium').value  = ''
    document.getElementById('if-pnl').value      = ''
    document.getElementById('if-capital').value  = ''
    document.getElementById('if-note').value     = ''
    document.getElementById('inc-del-btn').style.display='none'
  }
  document.getElementById('inc-modal-overlay').classList.remove('hidden')
  document.body.style.overflow='hidden'
}

function closeIncModal(){
  document.getElementById('inc-modal-overlay').classList.add('hidden')
  document.body.style.overflow=''
  editIncMonth=null
}

function handleIncOverlay(e){
  if(e.target===document.getElementById('inc-modal-overlay')) closeIncModal()
}

function saveIncEntry(){
  const mo = document.getElementById('if-month').value
  if(!mo){ toast('Please select a month'); return }
  const entry = {
    month:              mo,
    premiumIncome:      document.getElementById('if-premium').value!==''?+document.getElementById('if-premium').value:0,
    realizedOptionsPnL: document.getElementById('if-pnl').value!==''?+document.getElementById('if-pnl').value:0,
    capitalUsed:        document.getElementById('if-capital').value!==''?+document.getElementById('if-capital').value:0,
    note:               document.getElementById('if-note').value.trim(),
  }
  if(!state.optionsIncome) state.optionsIncome=[]
  const idx = state.optionsIncome.findIndex(e=>e.month===mo)
  if(idx>=0) state.optionsIncome[idx]=entry; else state.optionsIncome.push(entry)
  save(); closeIncModal(); renderIncome(); toast('Saved ✓')
}

function deleteIncEntry(){
  if(!editIncMonth) return
  state.optionsIncome = (state.optionsIncome||[]).filter(e=>e.month!==editIncMonth)
  save(); closeIncModal(); renderIncome(); toast('Deleted')
}


// ═══════════════════════════════════════════════════════════════
// PORTFOLIO BREAKDOWN
// ═══════════════════════════════════════════════════════════════

const BRK_COLORS = {
  cash:             '#f5a623',
  equities:         '#4dd8f0',
  optionsCollateral:'#b08fff',
  other:            '#2ee89a',
}
const BRK_LABELS = {
  cash:'Cash', equities:'Equities', optionsCollateral:'Options Collateral', other:'Other'
}

function brkSorted(){
  return [...(state.breakdown||[])].sort((a,b)=>a.month.localeCompare(b.month))
}

function brkTotal(e){
  return (e.cash||0)+(e.equities||0)+(e.optionsCollateral||0)+(e.other||0)
}

// Pie chart on canvas (pure canvas, no lib)
function drawPie(canvasId, slices){
  const canvas = document.getElementById(canvasId)
  if(!canvas) return
  const dpr  = window.devicePixelRatio||1
  const SIZE = 130
  canvas.width=SIZE*dpr; canvas.height=SIZE*dpr
  canvas.style.width=SIZE+'px'; canvas.style.height=SIZE+'px'
  const C   = canvas.getContext('2d')
  C.scale(dpr,dpr)
  const cx=SIZE/2, cy=SIZE/2, r=54, inner=30
  const total = slices.reduce((s,sl)=>s+sl.value,0)

  if(!total){ // empty state — grey ring
    C.beginPath(); C.arc(cx,cy,r,0,Math.PI*2)
    C.strokeStyle='rgba(255,255,255,.15)'; C.lineWidth=inner; C.stroke()
    return
  }

  let start = -Math.PI/2
  slices.forEach(sl=>{
    if(sl.value<=0) return
    const sweep = (sl.value/total)*Math.PI*2
    // Slice fill
    C.beginPath(); C.moveTo(cx,cy); C.arc(cx,cy,r,start,start+sweep); C.closePath()
    C.fillStyle = sl.color+'cc'; C.fill()
    // Outer glow ring arc
    C.save(); C.shadowColor=sl.color; C.shadowBlur=8
    C.beginPath(); C.arc(cx,cy,r,start,start+sweep)
    C.strokeStyle=sl.color; C.lineWidth=1.5; C.stroke()
    C.restore()
    start += sweep
  })
  // Donut hole
  C.beginPath(); C.arc(cx,cy,inner,0,Math.PI*2)
  C.fillStyle='#1e1a14'; C.fill()
  // Centre text
  C.fillStyle='rgba(255,240,210,0.90)'; C.font='bold 11px JetBrains Mono,monospace'; C.textAlign='center'; C.textBaseline='middle'
  C.fillText(fmtC(total), cx, cy)
}

// Stacked area trend chart (canvas)
function drawBrkTrend(canvasId, entries){
  const canvas = document.getElementById(canvasId)
  if(!canvas) return
  const wrap = canvas.parentElement
  const dpr  = window.devicePixelRatio||1
  const W    = wrap.clientWidth||300, H=140
  canvas.width=W*dpr; canvas.height=H*dpr
  canvas.style.width=W+'px'; canvas.style.height=H+'px'
  const C = canvas.getContext('2d')
  C.scale(dpr,dpr); C.clearRect(0,0,W,H)
  C.fillStyle='#1e1a14'; C.fillRect(0,0,W,H)
  if(entries.length<1) return

  const keys  = ['cash','equities','optionsCollateral','other']
  const maxV  = Math.max(...entries.map(e=>brkTotal(e)),1)
  const padL=50, padR=10, padT=10, padB=28
  const cW=W-padL-padR, cH=H-padT-padB
  const n=entries.length
  const xOf = i => padL + (n===1?cW/2: i/(n-1)*cW)
  const yOf = v => padT + cH - (v/maxV)*cH

  // Grid
  C.strokeStyle='rgba(255,255,255,.07)'; C.lineWidth=1
  for(let i=0;i<=3;i++){const y=padT+(i/3)*cH;C.beginPath();C.moveTo(padL,y);C.lineTo(padL+cW,y);C.stroke()}

  // Y labels
  C.fillStyle='rgba(255,240,210,0.60)'; C.font='bold 8px JetBrains Mono,monospace'; C.textAlign='right'
  C.fillText(fmtC(maxV), padL-4, padT+4)
  C.fillText('$0', padL-4, padT+cH)

  // Stacked areas — draw from bottom up
  ;[...keys].reverse().forEach(key=>{
    // Cumulative top per point
    const topVals = entries.map(e => {
      const ki = keys.indexOf(key)
      return keys.slice(0,ki+1).reduce((s,k)=>s+(e[k]||0),0)
    })
    const botVals = entries.map(e => {
      const ki = keys.indexOf(key)
      return ki===0 ? 0 : keys.slice(0,ki).reduce((s,k)=>s+(e[k]||0),0)
    })
    const color = BRK_COLORS[key]
    C.beginPath()
    topVals.forEach((v,i)=>i===0?C.moveTo(xOf(i),yOf(v)):C.lineTo(xOf(i),yOf(v)))
    ;[...botVals].reverse().forEach((v,i)=>C.lineTo(xOf(n-1-i),yOf(v)))
    C.closePath()
    C.fillStyle = color+'28'; C.fill()
    // Top line
    C.beginPath()
    topVals.forEach((v,i)=>i===0?C.moveTo(xOf(i),yOf(v)):C.lineTo(xOf(i),yOf(v)))
    C.strokeStyle=color+'90'; C.lineWidth=1.5; C.setLineDash([]); C.stroke()
  })

  // X labels
  C.fillStyle='rgba(255,240,210,0.60)'; C.font='bold 8px JetBrains Mono,monospace'; C.textAlign='center'
  entries.forEach((e,i)=>{
    if(n<=6||i===0||i===n-1||i%(Math.ceil(n/4))===0)
      C.fillText(e.month.split('-')[1]+'/'+e.month.split('-')[0].slice(2), xOf(i), H-padB+14)
  })
}

// ── Main render ────────────────────────────────────────────────
function renderBreakdown(){
  const entries  = brkSorted()
  const last     = entries[entries.length-1]
  const n        = entries.length

  // Get current portfolio value for mismatch check
  const d        = derive()
  const curPortfolio = d?.last?.actualPortfolio ?? state.startValue

  // ── Mismatch warning ─────────────────────────────────────────
  const warn = document.getElementById('brk-warn')
  if(last){
    const tot = brkTotal(last)
    const diff = Math.abs(tot - curPortfolio)
    const diffPct = curPortfolio ? diff/curPortfolio*100 : 0
    if(diffPct > 5 && tot > 0){
      warn.style.display='flex'
      document.getElementById('brk-warn-text').textContent =
        `Allocation total (${fmt(tot)}) differs from current portfolio (${fmt(curPortfolio)}) by ${fmtC(tot-curPortfolio)}. Entries may be outdated.`
    } else {
      warn.style.display='none'
    }
  } else {
    warn.style.display='none'
  }

  // ── Pie chart ─────────────────────────────────────────────────
  const keys = ['cash','equities','optionsCollateral','other']
  const slices = last ? keys.map(k=>({key:k, value:last[k]||0, color:BRK_COLORS[k]})) : []
  const lastTotal = last ? brkTotal(last) : 0
  drawPie('brk-pie', slices)

  // Legend
  const legend = document.getElementById('brk-pie-legend')
  if(last && lastTotal>0){
    legend.innerHTML = keys.map(k=>{
      const v = last[k]||0
      const pct = lastTotal>0 ? (v/lastTotal*100).toFixed(1) : '0'
      return `<div class="pie-leg-item">
        <div class="pie-leg-left">
          <div class="pie-leg-dot" style="background:${BRK_COLORS[k]}"></div>
          <span class="pie-leg-name">${BRK_LABELS[k]}</span>
        </div>
        <span class="pie-leg-val">${pct}%</span>
      </div>`
    }).join('')
  } else {
    legend.innerHTML = '<span style="font-size:12px;color:var(--mu)">No data yet</span>'
  }

  // ── KPI cards ─────────────────────────────────────────────────
  keys.forEach(k=>{
    const kmap={cash:'bk-cash',equities:'bk-eq',optionsCollateral:'bk-opt',other:'bk-oth'}
    const pre=kmap[k]
    const v = last?.[k]??null
    const pct = v!=null && lastTotal>0 ? (v/lastTotal*100).toFixed(1) : null
    document.getElementById(pre+'-val').textContent = v!=null?fmt(v):'—'
    document.getElementById(pre+'-pct').textContent = pct!=null?pct+'% of portfolio':'—'
  })

  // Summary cards
  document.getElementById('bk-total-alloc').textContent = last?fmt(lastTotal):'—'
  document.getElementById('bk-total-sub').textContent = last
    ? (Math.abs(lastTotal-curPortfolio)<curPortfolio*0.03?'Matches portfolio ✓':`vs ${fmt(curPortfolio)} portfolio`)
    : 'No data'

  if(last && lastTotal>0){
    const largestKey = keys.reduce((a,b)=>(last[b]||0)>(last[a]||0)?b:a)
    const largestV   = last[largestKey]||0
    const largestPct = (largestV/lastTotal*100).toFixed(0)
    document.getElementById('bk-largest-val').textContent = fmt(largestV)
    document.getElementById('bk-largest-val').className   = 'ac-val'
    document.getElementById('bk-largest-val').style.color = BRK_COLORS[largestKey]
    document.getElementById('bk-largest-name').textContent = BRK_LABELS[largestKey]+' · '+largestPct+'%'
  } else {
    document.getElementById('bk-largest-val').textContent  = '—'
    document.getElementById('bk-largest-name').textContent = '—'
  }

  // ── Trend chart ───────────────────────────────────────────────
  drawBrkTrend('brk-trend', entries)

  // ── Insights ─────────────────────────────────────────────────
  const insights = []
  if(!last || lastTotal===0){
    insights.push({cls:'bi-gold', text:'Add your first allocation entry to see risk and structure insights.'})
  } else {
    const cashPct   = (last.cash||0)/lastTotal*100
    const eqPct     = (last.equities||0)/lastTotal*100
    const optPct    = (last.optionsCollateral||0)/lastTotal*100
    const othPct    = (last.other||0)/lastTotal*100
    const plannedContrib = d?.ms?.[d.ms.length-1]?.plannedContribution||0

    // Concentration warning (>60% in one category)
    keys.forEach(k=>{
      const pct=(last[k]||0)/lastTotal*100
      if(pct>60){
        insights.push({cls:'bi-red', text:`${BRK_LABELS[k]} represents ${pct.toFixed(0)}% of your portfolio — a significant concentration. Consider whether this aligns with your risk tolerance.`})
      }
    })

    // Options collateral signal
    if(optPct>30){
      insights.push({cls:'bi-gold', text:`${optPct.toFixed(0)}% of your portfolio is deployed as options collateral (${fmt(last.optionsCollateral)}). This is a meaningful allocation — ensure you are comfortable with the downside exposure in adverse markets.`})
    } else if(optPct>0){
      insights.push({cls:'bi-cyan', text:`Options collateral represents ${optPct.toFixed(0)}% of the portfolio (${fmt(last.optionsCollateral)}). Capital deployment is moderate and appears manageable relative to total size.`})
    }

    // Cash buffer signal
    if(cashPct<10 && cashPct>=0){
      insights.push({cls:'bi-red', text:`Cash is only ${cashPct.toFixed(0)}% of portfolio (${fmt(last.cash)}). Low liquidity could limit flexibility during volatility or unexpected expenses.`})
    } else if(cashPct>=10 && cashPct<20){
      insights.push({cls:'bi-gold', text:`Cash buffer is ${cashPct.toFixed(0)}% (${fmt(last.cash)}).${plannedContrib>0?' This covers approximately '+((last.cash/plannedContrib)).toFixed(1)+' months of planned contributions.':''}`})
    } else if(cashPct>=20){
      insights.push({cls:'bi-cyan', text:`Cash represents ${cashPct.toFixed(0)}% of portfolio (${fmt(last.cash)}) — a healthy liquidity buffer.${plannedContrib>0?' Equivalent to '+((last.cash/plannedContrib)).toFixed(0)+' months of planned contributions.':''}`})
    }

    // Equity exposure
    if(eqPct<20 && eqPct>=0){
      insights.push({cls:'bi-gold', text:`Equity exposure is relatively low at ${eqPct.toFixed(0)}% (${fmt(last.equities)}). If this is intentional — focused on options income generation — ensure long-term growth is addressed elsewhere.`})
    } else if(eqPct>=20 && eqPct<=60){
      insights.push({cls:'bi-green', text:`Equities at ${eqPct.toFixed(0)}% (${fmt(last.equities)}) provide a balanced growth foundation alongside your options and income strategies.`})
    }

    // Diversification
    const activeCats = keys.filter(k=>(last[k]||0)/lastTotal>0.05).length
    if(activeCats>=3){
      insights.push({cls:'bi-green', text:`Portfolio is spread across ${activeCats} active categories — a reasonably diversified structure that reduces single-asset-type concentration risk.`})
    }
  }

  document.getElementById('brk-insights').innerHTML =
    insights.slice(0,4).map(i=>`<div class="brk-insight ${i.cls}"><div class="bi-text">${i.text}</div></div>`).join('')

  // ── Entry list ─────────────────────────────────────────────────
  document.getElementById('brk-count').textContent = n+' month'+(n!==1?'s':'')+' tracked'
  const list = document.getElementById('brk-list')
  if(!n){
    list.innerHTML='<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2 L12 12 L19 7"/></svg><p>No allocations yet.<br>Tap <strong style="color:var(--tx)">Add</strong> to record your first month.</p></div>'
    return
  }
  list.innerHTML = [...entries].reverse().map(e=>{
    const tot  = brkTotal(e)
    const bars = tot>0
      ? keys.map(k=>`<div class="brk-row-bar" style="width:${((e[k]||0)/tot*100).toFixed(1)}%;background:${BRK_COLORS[k]}55;flex:${(e[k]||0)/tot}"></div>`).join('')
      : ''
    return `<div class="brk-row" onclick="openBrkModal('${e.month}')">
      <div class="brk-row-top">
        <div>
          <div class="brk-row-month">${fmtMo(e.month)}</div>
          ${e.note?`<div style="font-size:10px;color:var(--mu);margin-top:2px;font-style:italic">${escapeHTML(e.note)}</div>`:''}
        </div>
        <div class="brk-row-total">${fmt(tot)}</div>
      </div>
      <div class="brk-row-bars">${bars}</div>
      <div class="brk-row-grid">
        <div><div class="brk-gl">Cash</div><div class="brk-gv cgo">${fmt(e.cash)}</div></div>
        <div><div class="brk-gl">Equities</div><div class="brk-gv cc">${fmt(e.equities)}</div></div>
        <div><div class="brk-gl">Options</div><div class="brk-gv cv">${fmt(e.optionsCollateral)}</div></div>
        <div><div class="brk-gl">Other</div><div class="brk-gv cg">${fmt(e.other)}</div></div>
      </div>
    </div>`
  }).join('')
}

// ── Breakdown modal ────────────────────────────────────────────
let editBrkMonth = null

function openBrkModal(monthStr){
  editBrkMonth = monthStr||null
  // Live total preview wiring
  const fields = ['bf-cash','bf-equities','bf-options','bf-other']
  const updatePreview = () => {
    const t = fields.reduce((s,id)=>{const v=+document.getElementById(id).value||0;return s+v},0)
    document.getElementById('bf-total-preview').textContent = fmt(t)
  }
  fields.forEach(id=>{ document.getElementById(id).oninput = updatePreview })

  if(editBrkMonth){
    const e = (state.breakdown||[]).find(x=>x.month===editBrkMonth)
    document.getElementById('brk-modal-title').textContent = 'Edit Allocation'
    document.getElementById('bf-month').value    = editBrkMonth
    document.getElementById('bf-month').disabled = true
    document.getElementById('bf-cash').value     = e?.cash??''
    document.getElementById('bf-equities').value = e?.equities??''
    document.getElementById('bf-options').value  = e?.optionsCollateral??''
    document.getElementById('bf-other').value    = e?.other??''
    document.getElementById('bf-note').value     = e?.note??''
    document.getElementById('brk-del-btn').style.display = 'flex'
  } else {
    document.getElementById('brk-modal-title').textContent = 'Add Allocation'
    document.getElementById('bf-month').value    = ''
    document.getElementById('bf-month').disabled = false
    ;['bf-cash','bf-equities','bf-options','bf-other','bf-note'].forEach(id=>document.getElementById(id).value='')
    document.getElementById('brk-del-btn').style.display = 'none'
  }
  updatePreview()
  document.getElementById('brk-modal-overlay').classList.remove('hidden')
  document.body.style.overflow = 'hidden'
}

function closeBrkModal(){
  document.getElementById('brk-modal-overlay').classList.add('hidden')
  document.body.style.overflow = ''
  editBrkMonth = null
}

function handleBrkOverlay(e){
  if(e.target===document.getElementById('brk-modal-overlay')) closeBrkModal()
}

function saveBrkEntry(){
  const mo = document.getElementById('bf-month').value
  if(!mo){ toast('Please select a month'); return }
  const entry = {
    month:             mo,
    cash:              +document.getElementById('bf-cash').value     || 0,
    equities:          +document.getElementById('bf-equities').value || 0,
    optionsCollateral: +document.getElementById('bf-options').value  || 0,
    other:             +document.getElementById('bf-other').value    || 0,
    note:              document.getElementById('bf-note').value.trim(),
  }
  if(!state.breakdown) state.breakdown=[]
  const idx = state.breakdown.findIndex(e=>e.month===mo)
  if(idx>=0) state.breakdown[idx]=entry; else state.breakdown.push(entry)
  save(); closeBrkModal(); renderBreakdown(); toast('Saved ✓')
}

function deleteBrkEntry(){
  if(!editBrkMonth) return
  state.breakdown = (state.breakdown||[]).filter(e=>e.month!==editBrkMonth)
  save(); closeBrkModal(); renderBreakdown(); toast('Deleted')
}


// ═══════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════

function renderSettings(){
  document.getElementById('set-startval').value = state.startValue || ''
  document.getElementById('set-benchmark').value = state.benchmarkRate ?? 3
  const currSel = document.getElementById('set-currency')
  if(currSel) currSel.value = state.currency || 'USD'
  renderMilestoneSettings()
}

function renderMilestoneSettings(){
  const el = document.getElementById('ms-chips')
  if(!el) return
  const mils = (state.milestones || []).slice().sort((a,b)=>a-b)
  el.innerHTML = mils.map((v,i) =>
    `<span class="ms-chip">${fmtC(v)}<button class="ms-chip-del" onclick="deleteMilestone(${i})" title="Remove">×</button></span>`
  ).join('') || '<span style="font-size:12px;color:var(--mu)">No milestones set</span>'
}

function addMilestone(){
  const inp = document.getElementById('ms-new-val')
  const v = +inp.value
  if(!v || v <= 0){ toast('Enter a valid milestone value'); return }
  if((state.milestones||[]).includes(v)){ toast('Already added'); return }
  if(!state.milestones) state.milestones = []
  state.milestones.push(v)
  state.milestones.sort((a,b)=>a-b)
  inp.value = ''
  save(); renderMilestoneSettings(); render(); toast('Milestone added ✓')
}

function deleteMilestone(idx){
  const mils = (state.milestones||[]).slice().sort((a,b)=>a-b)
  mils.splice(idx,1)
  state.milestones = mils
  save(); renderMilestoneSettings(); render(); toast('Removed')
}

function saveCurrency(){
  const v = document.getElementById('set-currency').value
  const VALID = ['USD','EUR','GBP','TRY','JPY','CHF','AUD','CAD']
  if(!VALID.includes(v)){ toast('Invalid currency'); return }
  state.currency = v
  save(); render(); toast('Currency updated ✓')
}

function saveBenchmarkRate(){
  const v = +document.getElementById('set-benchmark').value
  if(isNaN(v)||v<0||v>20){ toast('Enter a value between 0 and 20'); return }
  state.benchmarkRate = v
  save(); render(); toast('Benchmark rate updated ✓')
}

// ── CSV Export ─────────────────────────────────────────────────
function exportCSV(){
  try {
    const ms = sorted()
    const sym = currencySymbol()
    const rows = [
      ['Month','Start Portfolio','End Portfolio','Planned Contribution','Actual Contribution','Benchmark Return %','Investment PL','Return %','Note']
    ]
    ms.forEach((m, i) => {
      const prevM = i > 0 ? ms[i-1] : null
      const perf  = calcMonthPerf(m, prevM)
      rows.push([
        m.month,
        m.startPortfolio ?? '',
        m.actualPortfolio ?? '',
        m.plannedContribution || 0,
        m.actualContribution  || 0,
        m.benchmarkReturn != null ? m.benchmarkReturn : '',
        perf.investmentPL != null ? perf.investmentPL.toFixed(0) : '',
        perf.returnPct    != null ? perf.returnPct.toFixed(4)    : '',
        m.note || ''
      ])
    })
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], {type:'text/csv;charset=utf-8'})
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    const date = new Date().toISOString().slice(0,10)
    a.href = url; a.download = `wealtharc-timeline-${date}.csv`
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
    toast('CSV indirildi ✓')
  } catch(e) {
    toast('CSV export başarısız'); console.error(e)
  }
}

// ── JSON Export ─────────────────────────────────────────────────
function exportData(){
  try {
    const json = JSON.stringify(state, null, 2)
    const blob = new Blob([json], {type: 'application/json'})
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    const date = new Date().toISOString().slice(0,10)
    a.href     = url
    a.download = `wealtharc-backup-${date}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast('Yedek indirildi ✓')
  } catch(e) {
    toast('Export başarısız')
    console.error(e)
  }
}

// ── Import ─────────────────────────────────────────────────────
function importData(event){
  const file = event.target.files[0]
  if(!file) return
  const reader = new FileReader()
  reader.onload = function(e){
    try {
      const parsed = JSON.parse(e.target.result)
      const valid  = sanitizeState(parsed)
      state = valid
      save()
      render()
      toast('Veriler yüklendi ✓')
    } catch(err) {
      toast('Geçersiz dosya — yüklenemedi')
      console.error(err)
    }
    // Reset file input so same file can be re-imported if needed
    event.target.value = ''
  }
  reader.readAsText(file)
}

// ── Start value ────────────────────────────────────────────────
function saveStartValue(){
  const v = +document.getElementById('set-startval').value
  if(!v || v <= 0){ toast('Geçerli bir değer gir'); return }
  state.startValue = v
  save()
  toast('Başlangıç değeri güncellendi ✓')
}

// ── Reset confirm ──────────────────────────────────────────────
function showConfirm(){ document.getElementById('confirm-overlay').classList.remove('hidden') }
function hideConfirm(){ document.getElementById('confirm-overlay').classList.add('hidden') }
function confirmReset(){
  hideConfirm()
  resetData()
}

// ─── INIT ─────────────────────────────────────────────────────
renderDashboard()
