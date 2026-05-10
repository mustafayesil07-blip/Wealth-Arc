// ─── STORAGE ───────────────────────────────────────────────────
// Storage key — bump version to invalidate old saves if schema changes
const STORAGE_KEY = 'wealtharc_v4'

// ── Default seed data ───────────────────────────────────────────
const SEED = {
  startValue: 122300,
  currency: 'USD',
  benchmarkRate: 3,
  milestones: [150000, 250000, 500000],
  months: [
    {month:'2025-11', startPortfolio:null,   actualPortfolio:122300, plannedContribution:7000,  actualContribution:7000,  note:''},
    {month:'2025-12', startPortfolio:122300, actualPortfolio:107200, plannedContribution:8000,  actualContribution:9200,  note:'Year-end bonus deployed'},
    {month:'2026-01', startPortfolio:107200, actualPortfolio:114800, plannedContribution:5000,  actualContribution:5000,  note:''},
    {month:'2026-02', startPortfolio:114800, actualPortfolio:121500, plannedContribution:5000,  actualContribution:4200,  note:'Unexpected expense'},
    {month:'2026-03', startPortfolio:121500, actualPortfolio:130100, plannedContribution:14000, actualContribution:14000, note:'Q1 bonus month'},
  ],
  projectionInputs: {
    startVal: null,       // null = use current portfolio
    contrib:  5000,
    rate:     3,
    years:    5,
  },
  optionsIncome: [
    {month:'2025-11', premiumIncome:1800, realizedOptionsPnL:1500, capitalUsed:50000, note:'First month — CSP on QQQ'},
    {month:'2025-12', premiumIncome:3200, realizedOptionsPnL:2900, capitalUsed:60000, note:'Strong IV — SPX PCS'},
    {month:'2026-01', premiumIncome:2400, realizedOptionsPnL:2100, capitalUsed:55000, note:'Conservative sizing'},
    {month:'2026-02', premiumIncome:1200, realizedOptionsPnL:-400, capitalUsed:45000, note:'Assignment on AAPL CSP'},
    {month:'2026-03', premiumIncome:4100, realizedOptionsPnL:3600, capitalUsed:70000, note:'Best month — earnings plays'},
  ],
  breakdown: [
    {month:'2025-11', cash:15000, equities:35000, optionsCollateral:50000, other:0,    note:'Starting allocation'},
    {month:'2025-12', cash:12000, equities:40200, optionsCollateral:55000, other:0,    note:'Deployed bonus into equities'},
    {month:'2026-01', cash:14800, equities:45000, optionsCollateral:55000, other:0,    note:''},
    {month:'2026-02', cash:11500, equities:45000, optionsCollateral:60000, other:5000, note:'Added REIT exposure'},
    {month:'2026-03', cash:10100, equities:50000, optionsCollateral:65000, other:5000, note:''},
  ]
}

// ── HTML escape helper (prevents XSS in note fields) ───────────
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ── Validation helpers ──────────────────────────────────────────
function isValidMonth(m) {
  return m && typeof m.month === 'string' && /^\d{4}-\d{2}$/.test(m.month)
}

function sanitizeMonth(m) {
  return {
    month:               String(m.month),
    startPortfolio:      m.startPortfolio   != null ? +m.startPortfolio   : null,
    actualPortfolio:     m.actualPortfolio  != null ? +m.actualPortfolio  : null,
    plannedContribution: m.plannedContribution != null ? +m.plannedContribution : 0,
    actualContribution:  m.actualContribution  != null ? +m.actualContribution  : 0,
    benchmarkReturn:     m.benchmarkReturn   != null ? +m.benchmarkReturn  : null,
    note:                typeof m.note === 'string' ? m.note.slice(0, 500) : '',
  }
}

function sanitizeState(raw) {
  // Start from a full SEED copy so missing fields always have defaults
  const base = JSON.parse(JSON.stringify(SEED))
  if (!raw || typeof raw !== 'object') return base

  // Scalar fields
  if (typeof raw.startValue === 'number' && raw.startValue > 0)
    base.startValue = raw.startValue

  const VALID_CURRENCIES = ['USD','EUR','GBP','TRY','JPY','CHF','AUD','CAD']
  if (typeof raw.currency === 'string' && VALID_CURRENCIES.includes(raw.currency))
    base.currency = raw.currency

  if (typeof raw.benchmarkRate === 'number' && raw.benchmarkRate >= 0 && raw.benchmarkRate <= 20)
    base.benchmarkRate = raw.benchmarkRate

  if (Array.isArray(raw.milestones) && raw.milestones.length)
    base.milestones = raw.milestones.map(Number).filter(n => n > 0)

  // Months array — validate each entry
  if (Array.isArray(raw.months)) {
    const valid = raw.months.filter(isValidMonth).map(sanitizeMonth)
    if (valid.length > 0) base.months = valid   // only replace if we got something
  }

  // Breakdown (allocation) entries
  if (Array.isArray(raw.breakdown)) {
    const validBrk = raw.breakdown
      .filter(e => e && typeof e.month === 'string' && /^\d{4}-\d{2}$/.test(e.month))
      .map(e => ({
        month:             String(e.month),
        cash:              e.cash              != null ? +e.cash              : 0,
        equities:          e.equities          != null ? +e.equities          : 0,
        optionsCollateral: e.optionsCollateral != null ? +e.optionsCollateral : 0,
        other:             e.other             != null ? +e.other             : 0,
        note:              typeof e.note === 'string'  ? e.note.slice(0, 500) : '',
      }))
    if (validBrk.length > 0) base.breakdown = validBrk
  }

  // Options income entries
  if (Array.isArray(raw.optionsIncome)) {
    const validInc = raw.optionsIncome.filter(e => e && typeof e.month === 'string' && /^\d{4}-\d{2}$/.test(e.month))
      .map(e => ({
        month:               String(e.month),
        premiumIncome:       e.premiumIncome    != null ? +e.premiumIncome    : 0,
        realizedOptionsPnL:  e.realizedOptionsPnL != null ? +e.realizedOptionsPnL : 0,
        capitalUsed:         e.capitalUsed      != null ? +e.capitalUsed      : 0,
        note:                typeof e.note === 'string' ? e.note.slice(0, 500) : '',
      }))
    if (validInc.length > 0) base.optionsIncome = validInc
  }

  // Projection inputs
  if (raw.projectionInputs && typeof raw.projectionInputs === 'object') {
    const pi = raw.projectionInputs
    if (pi.startVal != null) base.projectionInputs.startVal = +pi.startVal
    if (typeof pi.contrib === 'number') base.projectionInputs.contrib = +pi.contrib
    if (typeof pi.rate    === 'number') base.projectionInputs.rate    = +pi.rate
    if (typeof pi.years   === 'number') base.projectionInputs.years   = +pi.years
  }

  return base
}

// ── Load ─────────────────────────────────────────────────────────
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return sanitizeState(parsed)
    }
  } catch(e) {
    // Corrupted JSON or localStorage unavailable — fall back to seed
    console.warn('WealthArc: could not load saved data, using defaults.', e)
  }
  return JSON.parse(JSON.stringify(SEED))
}

// ── Save ─────────────────────────────────────────────────────────
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch(e) {
    // localStorage full or unavailable (private mode etc.)
    console.error('WealthArc: could not save data.', e)
    // Notify user — toast may not be defined yet on first call, guard with typeof
    if (typeof toast === 'function') toast('⚠ Save failed — storage full or unavailable')
  }
}

// ── Reset helper (call resetData() from console to wipe) ─────────
function resetData() {
  try { localStorage.removeItem(STORAGE_KEY) } catch(_) {}
  state = JSON.parse(JSON.stringify(SEED))
  save()
  render()
  toast('Data reset to defaults')
}

// ── Initialise state ─────────────────────────────────────────────
let state = loadData()

// ─── FORMAT ───────────────────────────────────────────────────
const CURRENCY_SYMBOLS = {USD:'$',EUR:'€',GBP:'£',TRY:'₺',JPY:'¥',CHF:'Fr',AUD:'A$',CAD:'C$'}
function currencySymbol(){ return CURRENCY_SYMBOLS[state?.currency||'USD'] || '$' }

function fmt(v){
  if(v==null||isNaN(v))return'—'
  const cur = state?.currency || 'USD'
  return new Intl.NumberFormat('en-US',{style:'currency',currency:cur,minimumFractionDigits:0,maximumFractionDigits:0}).format(v)
}
function fmtC(v){
  if(v==null)return'—'
  const sym = currencySymbol()
  const a=Math.abs(v),s=v<0?'-':''
  if(a>=1e6)return s+sym+(a/1e6).toFixed(2)+'M'
  if(a>=1e3)return s+sym+(a/1e3).toFixed(1)+'K'
  return s+sym+Math.round(a)
}
function fmtMo(str){
  try{const[y,m]=str.split('-');return new Date(+y,+m-1,1).toLocaleString('en-US',{month:'short',year:'numeric'})}catch(_){return str}
}

// ─── CALC ─────────────────────────────────────────────────────
function genT(sv,months,rate){
  // sv is plotted as the origin point (index 0).
  // For each month the target = prev * (1+rate) + plannedContribution.
  const out=[];let prev=sv
  for(let i=0;i<months.length;i++){
    const c=months[i].plannedContribution||0
    const t=prev*(1+rate)+c
    out.push({month:months[i].month,target:Math.round(t)})
    prev=t
  }
  return out
}
function sorted(){return[...state.months].sort((a,b)=>a.month.localeCompare(b.month))}

// ─── MONTHLY PERFORMANCE CALC ─────────────────────────────────
function calcMonthPerf(m, prevM) {
  const endPortfolio = m.actualPortfolio ?? null

  // startPortfolio = previous month's closing value (endPortfolio already includes
  // that month's contribution — no need to add it again).
  // First month: use m.startPortfolio (manually entered).
  const startPortfolio = prevM?.actualPortfolio != null
    ? prevM.actualPortfolio
    : (m.startPortfolio ?? null)
  const contribution = m.actualContribution || 0

  if (endPortfolio == null || startPortfolio == null) {
    return { endPortfolio, startPortfolio, contribution,
             investmentPL: null, returnPct: null,
             adjustedReturn: null, marketShare: null,
             contributionShare: null, efficiency: null }
  }

  const investmentPL = endPortfolio - startPortfolio - contribution

  // Return % on start capital
  const returnPct = startPortfolio > 0
    ? (investmentPL / startPortfolio) * 100
    : null

  // Adjusted return: midpoint method (eliminates contribution timing bias)
  const adjustedBase   = startPortfolio + contribution / 2
  const adjustedReturn = adjustedBase > 0
    ? (investmentPL / adjustedBase) * 100
    : null

  // Growth split — abs() keeps bar in [0,100] even for negative PL months
  const growthBase        = Math.abs(investmentPL) + Math.abs(contribution)
  const marketShare       = growthBase > 0 ? (Math.abs(investmentPL) / growthBase) * 100 : 0
  const contributionShare = growthBase > 0 ? (Math.abs(contribution)  / growthBase) * 100 : 0

  // Efficiency: PL per $ contributed. null → "N/A" when contribution = 0
  const efficiency = contribution !== 0 ? investmentPL / contribution : null

  return { endPortfolio, startPortfolio, contribution,
           investmentPL, returnPct, adjustedReturn,
           marketShare, contributionShare, efficiency }
}

function derive(){
  const ms=sorted()
  const tracked=ms.filter(m=>m.actualPortfolio!=null)
  const last=tracked[tracked.length-1]
  if(!last)return null
  const t2=genT(state.startValue,ms,0.02)
  const t3=genT(state.startValue,ms,0.03)
  const t4=genT(state.startValue,ms,0.04)
  const tgt2=t2.find(t=>t.month===last.month)?.target??null
  const tgt3=t3.find(t=>t.month===last.month)?.target??null
  const tgt4=t4.find(t=>t.month===last.month)?.target??null
  const gap2=tgt2!=null?last.actualPortfolio-tgt2:null
  const gap3=tgt3!=null?last.actualPortfolio-tgt3:null
  const gap4=tgt4!=null?last.actualPortfolio-tgt4:null
  const gapPct=gap3!=null&&tgt3?(gap3/tgt3*100):null
  const totP=ms.reduce((s,m)=>s+(m.plannedContribution||0),0)
  const totA=ms.reduce((s,m)=>s+(m.actualContribution||0),0)
  const discPct=totP>0?(totA/totP*100):null
  const investGrowth=last.actualPortfolio-state.startValue-totA
  const onTrack=tgt3?Math.min(150,Math.max(0,(last.actualPortfolio/tgt3)*100)):null
  const milestones=(state.milestones||[150000,250000,500000]).sort((a,b)=>a-b)
  const nextMs=milestones.find(m=>m>last.actualPortfolio)||null
  let msPct=null,msRem=null,msEta=null
  if(nextMs){
    const msDenom=nextMs-state.startValue
    msPct=msDenom>0?Math.max(0,Math.min(100,((last.actualPortfolio-state.startValue)/msDenom)*100)):100
    msRem=nextMs-last.actualPortfolio
    if(tracked.length>=2){
      const avgM=(last.actualPortfolio-tracked[0].actualPortfolio)/(tracked.length-1)
      if(avgM>0)msEta=Math.ceil(msRem/avgM)
    }
  }
  const totalGain=last.actualPortfolio-state.startValue
  const cPct=totalGain!==0?Math.max(-200,Math.min(200,(totA/totalGain)*100)):50
  let mom3=null,mom6=null
  if(tracked.length>=4){const base3=tracked[tracked.length-4].actualPortfolio;if(base3>0)mom3=((last.actualPortfolio-base3)/base3*100)}
  if(tracked.length>=7){const base6=tracked[tracked.length-7].actualPortfolio;if(base6>0)mom6=((last.actualPortfolio-base6)/base6*100)}
  const prevLast=tracked.length>=2?tracked[tracked.length-2]:null
  const monthlyChange=prevLast?last.actualPortfolio-prevLast.actualPortfolio:null
  const monthlyFromContrib=last.actualContribution||0
  const monthlyFromGrowth=monthlyChange!=null?monthlyChange-monthlyFromContrib:null
  const rateNeeded=gap3!=null&&gap3<0&&msEta&&msEta>0&&last.actualPortfolio>0?((tgt3-last.actualPortfolio)/last.actualPortfolio/msEta*100):null

  // ── TWR (Time-Weighted Return) ────────────────────────────────
  // Sub-period return: r_i = investmentPL / startPortfolio
  // Contribution assumed end-of-month → doesn't affect sub-period calc
  // startPortfolio for each month: m.startPortfolio ?? prev.actualPortfolio
  const currentYear = last.month.slice(0,4)
  let twrCumFactor = 1       // all months
  let twrYtdFactor = 1       // current year only
  let twrMonthly   = null    // last month only

  tracked.forEach((m, i) => {
    const sp = m.startPortfolio != null
      ? m.startPortfolio
      : (i > 0 ? tracked[i-1].actualPortfolio : null)
    if (sp == null || sp === 0) return
    const pl = m.actualPortfolio - sp - (m.actualContribution || 0)
    const r  = pl / sp
    twrCumFactor *= (1 + r)
    if (m.month.slice(0,4) === currentYear) twrYtdFactor *= (1 + r)
    if (i === tracked.length - 1) twrMonthly = r * 100
  })

  const twrCumulative = (twrCumFactor - 1) * 100
  const twrYtd        = (twrYtdFactor - 1) * 100

  return{last,ms,t2,t3,t4,
    tgt2,tgt3,tgt4,gap2,gap3,gap4,gapPct,
    totP,totA,discPct,investGrowth,totalGain,cPct,
    onTrack,nextMs,msPct,msRem,msEta,
    mom3,mom6,monthlyChange,monthlyFromContrib,monthlyFromGrowth,
    rateNeeded,prevLast,
    twrMonthly,twrYtd,twrCumulative}
}

// ─── CHART ────────────────────────────────────────────────────
function buildChart(){
  const ms=sorted()
  const canvas=document.getElementById('main-chart')
  if(!canvas||!ms.length)return
  const wrap=canvas.parentElement
  // requestAnimationFrame ensures layout is complete so clientWidth is accurate
  requestAnimationFrame(()=>{
    const dpr=window.devicePixelRatio||1
    const W=Math.max(wrap.clientWidth||300,200),H=wrap.clientHeight||240
    canvas.width=W*dpr;canvas.height=H*dpr
    canvas.style.width=W+'px';canvas.style.height=H+'px'
    drawChartOnCanvas(canvas,W,H,dpr,'tt-',document.getElementById('chart-tooltip'))
  })
}

// ─── CHART MODAL ──────────────────────────────────────────────
function openChartModal(){
  document.getElementById('chart-modal').classList.remove('hidden')
  document.body.style.overflow='hidden'
  // Tabloyu doldur
  const ms  = window._chartMs || sorted()
  const data= window._chartPlotData || []
  const tbody=document.getElementById('chart-table-body')
  if(tbody){
    tbody.innerHTML=data.map(p=>{
      let dateStr
      if(p.m===null){
        const first=ms.find(x=>x.startPortfolio!=null)
        if(first){ const [y,mo]=first.month.split('-').map(Number); const d=new Date(y,mo-1,1); dateStr=d.toLocaleString('en-US',{month:'short',year:'numeric'}) } else dateStr='—'
      } else {
        const [y,mo]=p.m.month.split('-').map(Number); const d=new Date(y,mo,1)
        dateStr=d.toLocaleString('en-US',{month:'short',year:'numeric'})
      }
      const act = p.actual!=null ? `<span class="ct-actual">${fmt(p.actual)}</span>` : '<span style="color:var(--mu)">—</span>'
      return `<tr><td>${dateStr}</td><td>${act}</td><td>${fmt(p.t2)}</td><td>${fmt(p.t3)}</td><td>${fmt(p.t4)}</td></tr>`
    }).join('')
  }
  // Büyük canvas — requestAnimationFrame ile tarayıcı layout tamamlandıktan sonra çiz
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      const wrap=document.getElementById('chart-modal-canvas-wrap')
      const cvs =document.getElementById('modal-chart')
      if(!wrap||!cvs)return
      const dpr=window.devicePixelRatio||1
      const W=Math.max(wrap.clientWidth||300, 300)
      const H=wrap.clientHeight > 50 ? wrap.clientHeight : Math.round(window.innerHeight*0.55)
      cvs.width=W*dpr; cvs.height=H*dpr
      cvs.style.width=W+'px'; cvs.style.height=H+'px'
      drawChartOnCanvas(cvs, W, H, dpr, 'mtt-', document.getElementById('chart-modal-tooltip'))
    })
  })
}
function closeChartModal(e){
  if(e && e.target!==document.getElementById('chart-modal'))return
  document.getElementById('chart-modal').classList.add('hidden')
  document.body.style.overflow=''
}

// ─── AbortController map for chart event listeners (prevents buildup) ──
const _chartAC = new WeakMap()

// ─── SHARED CHART DRAWING (main + modal) ──────────────────────
function drawChartOnCanvas(canvas, W, H, dpr, ttPfx, tooltipEl){
  const ms=sorted()
  if(!ms.length)return
  const C=canvas.getContext('2d')

  // Reset transform fully before scaling (prevents cumulative scale on redraws)
  C.setTransform(1,0,0,1,0,0)
  C.clearRect(0,0,canvas.width,canvas.height)
  C.scale(dpr,dpr)

  const firstMs=ms.find(m=>m.startPortfolio!=null)
  const chartOrigin=firstMs?.startPortfolio??state.startValue
  const t2=genT(chartOrigin,ms,0.02)
  const t3=genT(chartOrigin,ms,0.03)
  const t4=genT(chartOrigin,ms,0.04)
  const av=ms.map(m=>m.actualPortfolio??null)
  const d2=t2.map(t=>t.target),d3=t3.map(t=>t.target),d4=t4.map(t=>t.target)
  const avPlot=[chartOrigin,...av],d2Plot=[chartOrigin,...d2],d3Plot=[chartOrigin,...d3],d4Plot=[chartOrigin,...d4]
  const labelsPlot=[null,...ms]
  const nPlot=avPlot.length

  // Store plot data for the expand modal data table
  window._chartMs=ms
  window._chartPlotData=labelsPlot.map((m,i)=>({m,i,actual:avPlot[i],t2:d2Plot[i],t3:d3Plot[i],t4:d4Plot[i]}))

  const padL=66,padR=16,padT=30,padB=68
  const cW=W-padL-padR,cH=H-padT-padB
  const allV=[...avPlot.filter(v=>v!=null),...d2Plot,...d3Plot,...d4Plot]
  const minV=Math.min(...allV)*0.972,maxV=Math.max(...allV)*1.025
  const xOf=i=>padL+(i/Math.max(nPlot-1,1))*cW
  const yOf=v=>padT+cH-((v-minV)/(maxV-minV))*cH

  // ── Background ──────────────────────────────────────────────
  C.fillStyle='#19150f'
  const bgRadius=10
  C.beginPath();C.roundRect(0,0,W,H,bgRadius);C.fill()

  // ── Subtle gradient overlay ──────────────────────────────────
  const bgGr=C.createLinearGradient(0,0,0,H)
  bgGr.addColorStop(0,'rgba(245,166,35,0.05)');bgGr.addColorStop(1,'transparent')
  C.fillStyle=bgGr;C.beginPath();C.roundRect(0,0,W,H,bgRadius);C.fill()

  // ── Grid lines ───────────────────────────────────────────────
  const gridCount=5
  for(let i=0;i<=gridCount;i++){
    const y=padT+(i/gridCount)*cH
    C.strokeStyle=i===gridCount?'rgba(255,255,255,0.10)':'rgba(255,255,255,0.06)'
    C.lineWidth=i===gridCount?1:0.75
    C.setLineDash(i===0||i===gridCount?[]:[4,4])
    C.beginPath();C.moveTo(padL,y);C.lineTo(padL+cW,y);C.stroke()
    C.setLineDash([])
  }

  // ── Y-axis labels ────────────────────────────────────────────
  C.fillStyle='rgba(255,235,190,0.82)';C.font='bold 11px JetBrains Mono,monospace';C.textAlign='right'
  for(let i=0;i<=gridCount;i++){
    const v=maxV-((i/gridCount)*(maxV-minV))
    C.fillText(fmtC(v),padL-9,padT+(i/gridCount)*cH+4)
  }

  // ── X-axis labels ─────────────────────────────────────────────
  C.fillStyle='rgba(255,235,190,0.72)';C.font='10px JetBrains Mono,monospace'
  labelsPlot.forEach((m,i)=>{
    const step=Math.max(1,Math.ceil((nPlot-1)/6))
    const show=nPlot<=7||i===0||i===nPlot-1||i%step===0
    if(!show)return
    let lbl
    if(m===null){
      const f=ms.find(x=>x.startPortfolio!=null)
      if(f){const[y,mo]=f.month.split('-').map(Number);lbl=new Date(y,mo-1,1).toLocaleString('en-US',{month:'short',year:'2-digit'})}
    } else {
      const[y,mo]=m.month.split('-').map(Number);lbl=new Date(y,mo,1).toLocaleString('en-US',{month:'short',year:'2-digit'})
    }
    if(!lbl)return
    C.save();C.translate(xOf(i),H-padB+12);C.rotate(-Math.PI/2.5);C.textAlign='right'
    C.fillText(lbl,0,3);C.restore()
  })

  // ── Area fill under actual line ───────────────────────────────
  const af=avPlot.map((v,i)=>v!=null?{v,i}:null).filter(Boolean)
  if(af.length>=2){
    C.beginPath()
    af.forEach(p=>C.lineTo(xOf(p.i),yOf(p.v)))
    C.lineTo(xOf(af[af.length-1].i),padT+cH)
    C.lineTo(xOf(af[0].i),padT+cH)
    C.closePath()
    const gr=C.createLinearGradient(0,padT,0,padT+cH)
    gr.addColorStop(0,'rgba(245,166,35,0.25)');gr.addColorStop(0.55,'rgba(245,166,35,0.06)');gr.addColorStop(1,'transparent')
    C.fillStyle=gr;C.fill()
  }

  // ── Target lines ──────────────────────────────────────────────
  function line(data,color,dash,width){
    C.strokeStyle=color;C.lineWidth=width||1.5;C.setLineDash(dash||[]);C.lineJoin='round';C.lineCap='round'
    C.beginPath();let s=false
    data.forEach((v,i)=>{if(v==null)return;const x=xOf(i),y=yOf(v);s?C.lineTo(x,y):(C.moveTo(x,y),s=true)})
    C.stroke();C.setLineDash([])
  }
  line(d2Plot,'rgba(110,200,240,0.60)',[5,4],1.8)
  line(d3Plot,'rgba(245,180,60,0.60)',[5,4],1.8)
  line(d4Plot,'rgba(190,160,255,0.60)',[5,4],1.8)

  // ── Actual portfolio line ─────────────────────────────────────
  C.save();C.shadowColor='rgba(245,166,35,0.65)';C.shadowBlur=12
  line(avPlot,'#f5a623',[],2.8)
  C.restore()

  // ── Data points ───────────────────────────────────────────────
  avPlot.forEach((v,i)=>{
    if(v==null)return
    const x=xOf(i),y=yOf(v)
    const isLast=i===nPlot-1||avPlot.slice(i+1).every(w=>w==null)
    const r=isLast?5.5:3
    C.save()
    if(isLast){C.shadowColor='rgba(245,166,35,0.95)';C.shadowBlur=16}
    C.beginPath();C.arc(x,y,r+1.5,0,Math.PI*2);C.fillStyle='#19150f';C.fill()
    C.beginPath();C.arc(x,y,r,0,Math.PI*2);C.fillStyle='#f5a623';C.fill()
    C.restore()
  })

  // ── Legend ─────────────────────────────────────────────────
  const legs=[{l:'Actual',c:'rgba(245,166,35,1)',d:false},{l:'2%',c:'rgba(110,200,240,0.9)',d:true},{l:'3%',c:'rgba(245,180,60,0.9)',d:true},{l:'4%',c:'rgba(190,160,255,0.9)',d:true}]
  let lx=padL
  C.font='bold 10px JetBrains Mono,monospace';C.textAlign='left'
  legs.forEach(lg=>{
    C.strokeStyle=lg.c;C.lineWidth=lg.d?1.5:2.4;C.setLineDash(lg.d?[4,3]:[])
    C.beginPath();C.moveTo(lx,15);C.lineTo(lx+14,15);C.stroke();C.setLineDash([])
    C.fillStyle='rgba(255,235,190,0.82)';C.fillText(lg.l,lx+18,19)
    lx+=C.measureText(lg.l).width+34
  })

  // ── Tooltip + Crosshair ──────────────────────────────────────
  if(tooltipEl){
    const plotData=labelsPlot.map((m,i)=>({m,i,actual:avPlot[i],t2:d2Plot[i],t3:d3Plot[i],t4:d4Plot[i],x:xOf(i)}))

    let activeIdx=-1

    function redrawCrosshair(idx){
      if(idx<0||idx>=plotData.length)return
      const p=plotData[idx]
      // Redraw chart (clear crosshair layer)
      drawStaticPart()
      // Draw crosshair
      const cx=p.x
      C.save()
      C.strokeStyle='rgba(255,235,190,0.22)';C.lineWidth=1;C.setLineDash([3,3])
      C.beginPath();C.moveTo(cx,padT);C.lineTo(cx,padT+cH);C.stroke()
      C.setLineDash([])
      // Highlight dot
      if(p.actual!=null){
        const cy=yOf(p.actual)
        C.beginPath();C.arc(cx,cy,7,0,Math.PI*2)
        C.fillStyle='rgba(245,166,35,0.18)';C.fill()
        C.beginPath();C.arc(cx,cy,4,0,Math.PI*2)
        C.fillStyle='#f5a623';C.fill()
      }
      C.restore()
    }

    // Static part is drawn above; for crosshair we just draw on top without full redraw
    // (the canvas is already painted — crosshair is an overlay drawn each time)
    function showTT(clientX){
      const rect=canvas.getBoundingClientRect()
      const px=(clientX-rect.left)*(W/rect.width)
      let best=0,bestDist=Infinity
      plotData.forEach((p,i)=>{const d=Math.abs(p.x-px);if(d<bestDist){bestDist=d;best=i}})
      if(best===activeIdx)return
      activeIdx=best
      const p=plotData[best];if(!p)return
      let dateStr
      if(p.m===null){
        const f=ms.find(x=>x.startPortfolio!=null)
        if(f)dateStr=new Date(...f.month.split('-').map((v,i)=>i===1?+v-1:+v)).toLocaleString('en-US',{month:'short',year:'numeric'})
      } else {
        const[y,mo]=p.m.month.split('-').map(Number)
        dateStr=new Date(y,mo,1).toLocaleString('en-US',{month:'short',year:'numeric'})
      }
      document.getElementById(ttPfx+'date').textContent=dateStr||'—'
      document.getElementById(ttPfx+'actual').textContent=p.actual!=null?fmt(p.actual):'—'
      document.getElementById(ttPfx+'t2').textContent=fmt(p.t2)
      document.getElementById(ttPfx+'t3').textContent=fmt(p.t3)
      document.getElementById(ttPfx+'t4').textContent=fmt(p.t4)
      // Crosshair line on canvas
      C.save()
      C.setTransform(1,0,0,1,0,0);C.scale(dpr,dpr)
      C.strokeStyle='rgba(255,235,190,0.20)';C.lineWidth=1;C.setLineDash([3,4])
      // Clear previous crosshair by re-drawing a thin rect over it (lightweight)
      // Just draw the new crosshair — old one fades naturally on full redraws
      C.beginPath();C.moveTo(p.x,padT+2);C.lineTo(p.x,padT+cH-2);C.stroke()
      C.setLineDash([])
      C.restore()
      // Position tooltip
      const scaleX=rect.width/W
      const ttW=tooltipEl.offsetWidth||150
      let left=p.x*scaleX-ttW/2;left=Math.max(4,Math.min(rect.width-ttW-4,left))
      tooltipEl.style.left=left+'px'
      tooltipEl.style.top=(padT+4)+'px'
      tooltipEl.style.display='block'
    }

    function hideTT(){ tooltipEl.style.display='none'; activeIdx=-1 }

    // Abort previous listeners on this canvas to prevent buildup
    if(_chartAC.has(canvas)) _chartAC.get(canvas).abort()
    const ac=new AbortController()
    _chartAC.set(canvas,ac)
    const sig={signal:ac.signal}
    canvas.addEventListener('mousemove',e=>showTT(e.clientX),sig)
    canvas.addEventListener('touchstart',e=>{e.preventDefault();showTT(e.touches[0].clientX)},{passive:false,...sig})
    canvas.addEventListener('touchmove',e=>{e.preventDefault();showTT(e.touches[0].clientX)},{passive:false,...sig})
    canvas.addEventListener('mouseleave',hideTT,sig)
    canvas.addEventListener('touchend',()=>setTimeout(hideTT,1800),sig)
  }
}

// ─── DASHBOARD ─────────────────────────────────────────────────
function renderDashboard(){
  const d=derive()
  if(!d){document.getElementById('dash-value').textContent=fmt(state.startValue);buildChart();return}
  const{last,gap2,gap3,gap4,tgt2,tgt3,tgt4,gapPct,
        totP,totA,discPct,investGrowth,totalGain,cPct,
        onTrack,nextMs,msPct,msRem,msEta,
        mom3,mom6,monthlyChange,monthlyFromContrib,monthlyFromGrowth,
        rateNeeded,prevLast,
        twrMonthly,twrYtd,twrCumulative}=d
  const gap=gap3

  // ── TWR Card ──────────────────────────────────────────────────
  function fmtTwr(v){
    if(v==null||isNaN(v)) return '—'
    return (v>=0?'+':'')+v.toFixed(2)+'%'
  }
  function twrCls(v){
    if(v==null||isNaN(v)) return ''
    return v>0?'cg':v<0?'cr':''
  }
  const elM=document.getElementById('twr-monthly')
  const elY=document.getElementById('twr-ytd')
  const elC=document.getElementById('twr-cum')
  elM.textContent=fmtTwr(twrMonthly); elM.className='sval '+twrCls(twrMonthly)
  elY.textContent=fmtTwr(twrYtd);     elY.className='sval '+twrCls(twrYtd)
  elC.textContent=fmtTwr(twrCumulative); elC.className='sval '+twrCls(twrCumulative)
  document.getElementById('twr-ytd-lbl').textContent=last.month.slice(0,4)+' yılı'

  // ── Hero ──────────────────────────────────────────────────────
  document.getElementById('dash-value').textContent=fmt(last.actualPortfolio)
  document.getElementById('dash-month').textContent=fmtMo(last.month)
  const ahead=gap!=null&&gap>0, behind=gap!=null&&gap<0
  const badge=document.getElementById('dash-badge')
  badge.className='hero-badge '+(ahead?'hb-ahead':behind?'hb-behind':'hb-flat')
  badge.textContent='● '+(ahead?'AHEAD OF TARGET':behind?'BEHIND TARGET':'ON TARGET')
  const pill=document.getElementById('dash-gap-pill')
  if(gap!=null){
    pill.className='gap-pill '+(ahead?'pill-ahead':behind?'pill-behind':'pill-flat')
    pill.textContent=(gap>=0?'+':'')+fmt(gap)+' vs 3%'
  }

  // ── Chart summary ─────────────────────────────────────────────
  document.getElementById('cs-actual').textContent=fmt(last.actualPortfolio)
  document.getElementById('cs-target').textContent=fmt(tgt3)
  const csg=document.getElementById('cs-gap')
  csg.textContent=(gap>=0?'+':'')+fmt(gap)
  csg.className='cs-val '+(ahead?'cg':behind?'cr':'cm')

  // ── On-track card ─────────────────────────────────────────────
  if(onTrack!=null){
    const ok=onTrack>=100, close=onTrack>=95
    document.getElementById('dash-pct-big').textContent=Math.min(onTrack,100).toFixed(0)+'%'
    document.getElementById('dash-pct-big').style.color=ok?'var(--green)':close?'var(--gold)':'var(--red)'
    const bar=document.getElementById('dash-pbar')
    bar.style.width=Math.min(onTrack,100)+'%'
    bar.className='pfill '+(ok||close?'pg':'pred')
    document.getElementById('dash-ontrack-msg').textContent=
      ok?'Ahead of base path':close?'Near target — keep going':`${fmt(Math.abs(gap))} below target`
    document.getElementById('dash-ontrack-card').className=
      'card cp '+(ok?'glow-green':close?'glow-gold':'glow-red')
  }

  // ── Milestone ─────────────────────────────────────────────────
  if(nextMs){
    document.getElementById('d-ms-val').textContent=fmt(nextMs)
    document.getElementById('d-ms-rem').textContent=fmtC(msRem)+' remaining'
    document.getElementById('d-ms-bar').style.width=(msPct||0)+'%'
    document.getElementById('d-ms-pct').textContent=(msPct||0).toFixed(0)+'%'
    document.getElementById('d-ms-eta').textContent=msEta?'~'+msEta+' mo':'—'
  } else {
    document.getElementById('d-ms-val').textContent='All reached 🏆'
    document.getElementById('d-ms-rem').textContent=''
  }

  // ── Gap vs all three paths ────────────────────────────────────
  function gCol(g){return g==null?'cm':g>0?'cg':'cr'}
  function gTxt(g){return g==null?'—':(g>=0?'+':'')+fmtC(g)}
  ;[['gap-2',gap2],['gap-3',gap3],['gap-4',gap4]].forEach(([id,g])=>{
    const el=document.getElementById(id)
    el.textContent=gTxt(g); el.className='gap-item-val '+gCol(g)
  })

  // ── Contribution vs Investment Growth ─────────────────────────
  // Show real investGrowth (can be negative — never clamp to 0)
  const growthIsNeg=investGrowth<0
  document.getElementById('d-contrib').textContent=fmt(totA)
  document.getElementById('d-contrib-pct').textContent=
    totalGain!==0?Math.abs(totA/totalGain*100).toFixed(0)+'% of total gain':'total contributions'
  const dg=document.getElementById('d-growth')
  dg.textContent=fmt(investGrowth)
  dg.className='sval '+(growthIsNeg?'cr':'cv')
  document.getElementById('d-growth-pct').textContent=
    growthIsNeg?'market drag this period'
    :totalGain>0?Math.abs(investGrowth/totalGain*100).toFixed(0)+'% of total gain':'investment returns'
  const sbCPct=(totalGain>0&&!growthIsNeg)?Math.max(5,Math.min(95,cPct)):100
  document.getElementById('sb-c').style.width=sbCPct+'%'
  document.getElementById('sb-g').style.width=(100-sbCPct)+'%'

  // ── Stats + discipline bar ────────────────────────────────────
  document.getElementById('d-planned').textContent=fmt(totP)
  document.getElementById('d-actual').textContent=fmt(totA)
  const discBar=document.getElementById('disc-bar')
  discBar.style.width=discPct!=null?Math.min(discPct,120)+'%':'0%'
  discBar.className='pfill '+(discPct!=null&&discPct>=100?'pgreen':discPct>=80?'pg':'pred')
  document.getElementById('d-disc').textContent=discPct!=null?discPct.toFixed(0)+'%':'—'

  // ── Accent colour ─────────────────────────────────────────────
  document.getElementById('dash-acc').style.background=
    ahead?'var(--green)':behind?'var(--red)':'var(--gold)'

  // ── This Month Explained ─────────────────────────────────────
  let interpLead='—'
  const facts=[]
  if(monthlyChange!=null&&prevLast){
    const contrib=monthlyFromContrib, growthPart=monthlyFromGrowth??0, mo=fmtMo(last.month)
    if(Math.abs(growthPart)<200)
      interpLead=`In ${mo}, your portfolio changed by ${fmtC(monthlyChange)}. Almost all movement came from your ${fmt(contrib)} contribution — market returns were roughly flat.`
    else if(growthPart>0&&growthPart>contrib)
      interpLead=`In ${mo}, investment returns of ${fmtC(growthPart)} outpaced your ${fmt(contrib)} contribution. Total change: ${fmtC(monthlyChange)}. Compounding is doing meaningful work.`
    else if(growthPart>0)
      interpLead=`In ${mo}, you contributed ${fmt(contrib)} and earned ${fmtC(growthPart)} from market returns. Contributions are still the main growth driver.`
    else
      interpLead=`In ${mo}, you contributed ${fmt(contrib)} but market performance dragged the portfolio by ${fmtC(Math.abs(growthPart))}. Net change: ${fmtC(monthlyChange)}.`
    if(contrib>0) facts.push({t:`+${fmt(contrib)} contributed`,c:contrib>=(last.plannedContribution||0)?'ifact-green':'ifact-gold'})
    if(gap3!=null) facts.push({t:(gap3>=0?'+':'')+fmt(gap3)+' vs 3% path',c:gap3>=0?'ifact-green':'ifact-red'})
    if(discPct!=null) facts.push({t:discPct.toFixed(0)+'% of plan met',c:discPct>=100?'ifact-green':discPct>=80?'':'ifact-red'})
  } else if(last.actualContribution!=null){
    interpLead=`${fmtMo(last.month)}: ${fmt(last.actualContribution)} contributed.`+(gap3!=null?` Gap vs 3% target: ${gap3>=0?'+':''}${fmt(gap3)}.`:'')
  }
  document.getElementById('d-interp').textContent=interpLead
  document.getElementById('d-interp-facts').innerHTML=
    facts.map(f=>`<span class="ifact ${f.c}">${f.t}</span>`).join('')

  // ── Wealth Signals ────────────────────────────────────────────
  const signals=[]

  // 1. Investment growth health
  if(investGrowth<0)
    signals.push({icon:'⚠️',cls:'si-red',
      title:'Market headwinds',
      sub:`Investment returns are negative (${fmt(investGrowth)}). Your contributions are the only growth driver right now.`})
  else if(totA>0&&investGrowth>=totA)
    signals.push({icon:'⚡',cls:'si-green',
      title:'Compounding taking over',
      sub:`Investment growth (${fmt(investGrowth)}) now exceeds total contributions (${fmt(totA)}). Your capital is working harder than your savings rate.`})
  else if(totA>0)
    signals.push({icon:'💰',cls:'si-gold',
      title:'Contributions leading growth',
      sub:`Investment returns are at ${totA>0?(investGrowth/totA*100).toFixed(0):0}% of your contribution total. As the portfolio scales, compounding will gradually take over.`})

  // 2. Contribution discipline
  if(discPct!=null){
    if(discPct>=100)
      signals.push({icon:'✅',cls:'si-green',
        title:'Contribution discipline: excellent',
        sub:`You have contributed ${discPct.toFixed(0)}% of your planned total — ahead of schedule.`})
    else if(discPct>=80)
      signals.push({icon:'📊',cls:'si-cyan',
        title:'Contribution discipline: good',
        sub:`Actual contributions are at ${discPct.toFixed(0)}% of plan. A small shortfall at this scale won't materially affect long-term trajectory.`})
    else
      signals.push({icon:'⚠️',cls:'si-red',
        title:'Contribution shortfall',
        sub:`Actual contributions are only ${discPct.toFixed(0)}% of plan. Closing this gap will significantly improve trajectory.`})
  }

  // 3. Momentum
  if(mom3!=null)
    signals.push({icon:mom3>=0?'📈':'📉',cls:mom3>=0?'si-cyan':'si-red',
      title:`3-month momentum: ${mom3>=0?'positive':'negative'}`,
      sub:`Portfolio ${mom3>=0?'grew':'declined'} ${Math.abs(mom3).toFixed(1)}% over the last 3 months.`+(mom6!=null?` 6-month pace: ${mom6>=0?'+':''}${mom6.toFixed(1)}%.`:'')})
  else
    signals.push({icon:'⏳',cls:'si-gold',
      title:'Building momentum history',
      sub:'Add a few more months of data to see 3-month and 6-month momentum signals.'})

  // 4. Path reconnection (only if behind)
  if(behind&&gap3!=null)
    signals.push({icon:'🎯',cls:'si-violet',
      title:'Path reconnection',
      sub:`You need approximately ${fmtC(Math.abs(gap3/Math.max(msEta||6,1)))} extra per month, or higher returns, to realign with the 3% base path.`})

  document.getElementById('d-signals').innerHTML=
    signals.slice(0,3).map(s=>`
    <div class="signal-item">
      <div class="signal-icon ${s.cls}">${s.icon}</div>
      <div class="signal-text">
        <div class="signal-title">${s.title}</div>
        <div class="signal-sub">${s.sub}</div>
      </div>
    </div>`).join('')

  buildChart()
}

// ─── TIMELINE ─────────────────────────────────────────────────
function renderAnnualSummary(ms){
  const ann = document.getElementById('annual-summary')
  if(!ann) return
  if(ms.length < 1){ ann.innerHTML=''; return }

  const currentYear = String(new Date().getFullYear())

  // Group months by year
  const byYear = {}
  ms.forEach((m, i) => {
    const yr = m.month.slice(0,4)
    if(!byYear[yr]) byYear[yr] = []
    byYear[yr].push({m, idx: i})
  })

  const years = Object.keys(byYear).sort()
  if(years.length < 1){ ann.innerHTML=''; return }

  const cards = years.map(yr => {
    const entries = byYear[yr]
    const first = entries[0]
    const last  = entries[entries.length-1]
    const isYTD = yr === currentYear

    // Start value: prev month's actual portfolio, or first month's startPortfolio
    const startVal = first.idx > 0 ? ms[first.idx-1].actualPortfolio : (first.m.startPortfolio ?? state.startValue)
    const entriesWithData = entries.filter(e => e.m.actualPortfolio != null)
    if(entriesWithData.length === 0) return ''
    const lastWithData = entriesWithData[entriesWithData.length - 1]
    const endVal = lastWithData.m.actualPortfolio

    if(startVal == null){ return '' }

    const totalContrib = entries.reduce((s,e) => s + (e.m.actualContribution||0), 0)
    const investGain   = endVal - startVal - totalContrib
    const annReturn    = startVal > 0 ? ((endVal - startVal) / startVal * 100) : null
    const isPos        = investGain >= 0
    const cardCls      = annReturn == null ? 'ann-card-neu' : annReturn >= 0 ? 'ann-card-pos' : 'ann-card-neg'
    const gainCls      = isPos ? 'cg' : 'cr'
    const retStr       = annReturn != null ? ((annReturn>=0?'+':'')+annReturn.toFixed(1)+'%') : '—'
    const retCls       = annReturn==null?'cm':annReturn>=0?'cg':'cr'
    const endLbl       = isYTD ? 'Current' : 'Year End'
    const ytdBadge     = isYTD
      ? `<span style="font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;background:var(--gold-dim);color:var(--gold-d);border:1px solid rgba(200,133,42,.28);border-radius:20px;padding:2px 7px;margin-left:7px">YTD</span>`
      : ''

    return `<div class="ann-card ${cardCls}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:9px">
        <div style="display:flex;align-items:center">
          <div class="ann-year">${yr}</div>${ytdBadge}
        </div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700" class="${retCls}">${retStr}</div>
      </div>
      <div class="ann-grid">
        <div class="ann-stat">
          <div class="ann-stat-lbl">Start</div>
          <div class="ann-stat-val">${fmtC(startVal)}</div>
        </div>
        <div class="ann-stat">
          <div class="ann-stat-lbl">${endLbl}</div>
          <div class="ann-stat-val">${fmtC(endVal)}</div>
        </div>
        <div class="ann-stat">
          <div class="ann-stat-lbl">Inv. Gain</div>
          <div class="ann-stat-val ${gainCls}">${isPos?'+':''}${fmtC(investGain)}</div>
        </div>
        <div class="ann-stat">
          <div class="ann-stat-lbl">Contributions</div>
          <div class="ann-stat-val">${fmtC(totalContrib)}</div>
        </div>
        <div class="ann-stat">
          <div class="ann-stat-lbl">Months</div>
          <div class="ann-stat-val cm">${entries.length}${isYTD?' tracked':''}</div>
        </div>
      </div>
    </div>`
  }).filter(Boolean).join('')

  ann.innerHTML = cards
    ? `<div class="ann-section"><span class="ann-section-title">Annual Summary</span><div class="ann-cards">${cards}</div></div>`
    : ''
}

function renderTimeline(){
  const ms=sorted()
  const t3=genT(state.startValue,ms,0.03)
  document.getElementById('tl-count').textContent=ms.length+' month'+(ms.length!==1?'s':'')+' tracked'
  renderAnnualSummary(ms)
  const list=document.getElementById('tl-list')
  if(!ms.length){
    list.innerHTML='<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg><p>No months yet.<br>Tap <strong style="color:var(--tx)">Add Month</strong> to start.</p></div>'
    return
  }
  list.innerHTML=ms.map((m,i)=>{
    const prevM = i > 0 ? ms[i-1] : null
    const perf  = calcMonthPerf(m, prevM)

    // Stripe colour: green=market gain, red=market loss, blue=no market data yet
    const plPos = perf.investmentPL!=null && perf.investmentPL >= 0
    const plNeg = perf.investmentPL!=null && perf.investmentPL < 0
    const stripeCls = plPos ? 'stripe-green' : plNeg ? 'stripe-red' : 'stripe-blue'

    // ── Headline ────────────────────────────────────────────────
    const endVal = m.actualPortfolio!=null ? fmt(m.actualPortfolio) : '—'
    const ctxLine = (perf.startPortfolio!=null && m.actualPortfolio!=null)
      ? `${fmt(perf.startPortfolio)} → ${fmt(m.actualPortfolio)}`
      : ''

  // ── TWR kümülatif bu aya kadar ─────────────────────────────────
  // Zincir: tüm tracked ayların sub-period return çarpımı, bu aya kadar
  let twrToHere = null
  if (perf.returnPct !== null) {
    let factor = 1
    for (let k = 0; k <= i; k++) {
      const mk = ms[k], prevK = k > 0 ? ms[k-1] : null
      const pk = calcMonthPerf(mk, prevK)
      if (pk.returnPct !== null) factor *= (1 + pk.returnPct / 100)
    }
    twrToHere = (factor - 1) * 100
  }

    // ── Block 1: Piyasa Performansı ─────────────────────────────
    let perfHTML = ''
    if (perf.investmentPL !== null) {
      const plSign  = perf.investmentPL >= 0 ? '+' : ''
      const plColor = perf.investmentPL >= 0 ? 'color:var(--green)' : 'color:var(--red)'
      const pctSign = perf.returnPct >= 0 ? '+' : ''
      const pctStr  = perf.returnPct != null ? `${pctSign}${perf.returnPct.toFixed(2)}%` : '—'
      const bRate = m.benchmarkReturn != null ? m.benchmarkReturn : (state.benchmarkRate ?? 3)
      const bmarkDiff = perf.returnPct != null ? perf.returnPct - bRate : null
      const bmarkSign = bmarkDiff!=null && bmarkDiff>=0 ? '+' : ''
      const bmarkColor = bmarkDiff==null ? '' : bmarkDiff>=0 ? 'color:var(--green)' : 'color:var(--red)'
      const bmarkStr = bmarkDiff!=null ? `${bmarkSign}${bmarkDiff.toFixed(2)}%` : '—'
      const cumSign  = twrToHere!=null && twrToHere>=0 ? '+' : ''
      const cumColor = twrToHere==null ? '' : twrToHere>=0 ? 'color:var(--green)' : 'color:var(--red)'
      const cumStr   = twrToHere!=null ? `${cumSign}${twrToHere.toFixed(2)}%` : '—'

      perfHTML = `
      <div class="mr-perf-block">
        <div class="mr-perf-row">
          <span class="mr-perf-label">Piyasa Getirisi (TWR)</span>
          <span class="mr-perf-val" style="${plColor}">${plSign}${fmt(perf.investmentPL)} &nbsp;(${pctStr})</span>
        </div>
      </div>
      <div class="mr-bench-block">
        <div class="mr-bench-item">
          <span class="mr-bench-lbl">Aylık TWR</span>
          <span class="mr-bench-val" style="${plColor}">${pctStr}</span>
        </div>
        <span class="mr-bench-sep">vs</span>
        <div class="mr-bench-item">
          <span class="mr-bench-lbl">Benchmark</span>
          <span class="mr-bench-val" style="color:var(--lavender)">${m.benchmarkReturn!=null?((m.benchmarkReturn>=0?'+':'')+m.benchmarkReturn.toFixed(2)+'%'):((state.benchmarkRate>=0?'+':'')+state.benchmarkRate.toFixed(2)+'%')}</span>
        </div>
        <span class="mr-bench-sep">·</span>
        <div class="mr-bench-item">
          <span class="mr-bench-lbl">Kümülatif</span>
          <span class="mr-bench-val" style="${cumColor}">${cumStr}</span>
        </div>
        <span class="mr-bench-sep">→</span>
        <div class="mr-bench-item">
          <span class="mr-bench-lbl">Fark</span>
          <span class="mr-bench-val" style="${bmarkColor}">${bmarkStr}</span>
        </div>
      </div>`
    }

    // ── Block 2: Tasarruf Disiplini ─────────────────────────────
    const planned  = m.plannedContribution  || 0
    const actual   = m.actualContribution   || 0
    const savDiff  = actual - planned
    const savDiffSign = savDiff >= 0 ? '+' : ''
    const savDiffCls  = savDiff >= 0 ? 'mr-savings-diff-pos' : 'mr-savings-diff-neg'
    const savPct   = planned > 0 ? (actual/planned*100).toFixed(0)+'%' : '—'
    const savingsHTML = `
      <div class="mr-savings-block">
        <div class="mr-savings-row">
          <span>Planlanan</span>
          <span class="mr-savings-val">${fmt(planned)}</span>
        </div>
        <div class="mr-savings-row">
          <span>Gerçekleşen</span>
          <span class="mr-savings-val">${fmt(actual)}</span>
        </div>
        <div class="mr-savings-row" style="margin-top:4px;padding-top:4px;border-top:1px solid rgba(200,125,90,0.12)">
          <span>Fark</span>
          <span class="mr-savings-val ${savDiffCls}">${savDiffSign}${fmt(savDiff)} &nbsp;(${savPct} of plan)</span>
        </div>
      </div>`

    // ── Split bar (hareket bileşimi) ────────────────────────────
    let splitHTML = ''
    if (perf.investmentPL !== null) {
      const mktW = perf.marketShare.toFixed(1)
      const conW = perf.contributionShare.toFixed(1)
      splitHTML = `
      <div style="margin-top:10px">
        <div class="mr-perf-label" style="margin-bottom:6px">Hareket Bileşimi</div>
        <div class="mr-split-bar">
          <div class="mr-split-market" style="width:${mktW}%"></div>
          <div class="mr-split-contrib" style="width:${conW}%"></div>
        </div>
        <div class="mr-split-labels">
          <span>${perf.marketShare.toFixed(0)}% Piyasa</span>
          <span>${perf.contributionShare.toFixed(0)}% Katkı</span>
        </div>
      </div>`
    }

    return `<div class="month-row card-hover" onclick="openModal('${m.month}')">
      <div class="stripe ${stripeCls}"></div>
      <div style="padding-left:14px">

        <!-- Başlık -->
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px">
          <div>
            <div class="mname">${fmtMo(m.month)}</div>
            ${ctxLine ? `<div class="mr-context">${ctxLine}</div>` : ''}
          </div>
          <div style="text-align:right">
            <div class="mr-headline">${endVal}</div>
          </div>
        </div>

        ${perfHTML}
        ${savingsHTML}
        ${splitHTML}

        ${m.note?`<div style="font-size:11px;color:var(--mu);margin-top:10px;font-style:italic;line-height:1.4">${escapeHTML(m.note)}</div>`:''}
      </div>
    </div>`
  }).join('')
}




// ─── MODAL ────────────────────────────────────────────────────
let editM=null
function openModal(ms){
  editM=ms||null
  const sortedMs=sorted()
  const startInput=document.getElementById('f-start-portfolio')

  if(editM){
    const m=state.months.find(x=>x.month===editM)
    const idx=sortedMs.findIndex(x=>x.month===editM)
    const prevM=idx>0?sortedMs[idx-1]:null
    document.getElementById('modal-title').textContent='Edit Month'
    document.getElementById('f-month').value=editM
    document.getElementById('f-month').disabled=true
    // autoStart = prev month end (contribution already included in endPortfolio)
    const autoStart = prevM?.actualPortfolio ?? null
    startInput.value = autoStart ?? (m?.startPortfolio ?? '')
    startInput.disabled = autoStart !== null
    startInput.style.opacity = autoStart !== null ? '0.5' : '1'
    document.getElementById('f-portfolio').value=m?.actualPortfolio??''
    document.getElementById('f-planned').value=m?.plannedContribution??''
    document.getElementById('f-actual-c').value=m?.actualContribution??''
    document.getElementById('f-benchmark').value=m?.benchmarkReturn??''
    document.getElementById('f-note').value=m?.note??''
    document.getElementById('del-btn').style.display='flex'
  } else {
    document.getElementById('modal-title').textContent='Add Month'
    document.getElementById('f-month').value=''
    document.getElementById('f-month').disabled=false
    const lastM=sortedMs.length?sortedMs[sortedMs.length-1]:null
    const autoStart = lastM?.actualPortfolio ?? null
    startInput.value=autoStart??''
    startInput.disabled=autoStart!==null
    startInput.style.opacity=autoStart!==null?'0.5':'1'
    document.getElementById('f-portfolio').value=''
    document.getElementById('f-planned').value=''
    document.getElementById('f-actual-c').value=''
    document.getElementById('f-benchmark').value=''
    document.getElementById('f-note').value=''
    document.getElementById('del-btn').style.display='none'
  }
  document.getElementById('modal-overlay').classList.remove('hidden')
  document.body.style.overflow='hidden'
}
function closeModal(){document.getElementById('modal-overlay').classList.add('hidden');document.body.style.overflow='';editM=null}
function handleOverlayClick(e){if(e.target===document.getElementById('modal-overlay'))closeModal()}
function saveMonth(){
  const mo=document.getElementById('f-month').value
  if(!mo){toast('Please select a month');return}
  const startInput=document.getElementById('f-start-portfolio')
  // If the field is disabled, autoStart is in control — read it directly from the input
  // (disabled inputs are readable via .value in JS even if not submitted in forms)
  const startVal = startInput.value !== '' ? +startInput.value : null
  const portfolioRaw = document.getElementById('f-portfolio').value
  const actualPortfolio = portfolioRaw !== '' ? +portfolioRaw : null
  if (actualPortfolio !== null && (isNaN(actualPortfolio) || actualPortfolio < 0)) {
    toast('Portfolio value must be a positive number'); return
  }
  const plannedRaw = document.getElementById('f-planned').value
  const plannedContribution = plannedRaw !== '' ? +plannedRaw : 0
  if (isNaN(plannedContribution) || plannedContribution < 0) {
    toast('Planned contribution must be a positive number'); return
  }
  const actualCRaw = document.getElementById('f-actual-c').value
  const actualContribution = actualCRaw !== '' ? +actualCRaw : 0
  if (isNaN(actualContribution) || actualContribution < 0) {
    toast('Actual contribution must be a positive number'); return
  }
  const benchmarkRaw = document.getElementById('f-benchmark').value
  const benchmarkReturn = benchmarkRaw !== '' ? +benchmarkRaw : null
  const row={
    month:mo,
    startPortfolio:startVal,
    actualPortfolio,
    plannedContribution,
    actualContribution,
    benchmarkReturn: benchmarkReturn !== null && !isNaN(benchmarkReturn) ? benchmarkReturn : null,
    note:document.getElementById('f-note').value.trim().slice(0, 500),
  }
  const idx=state.months.findIndex(m=>m.month===mo)
  if(idx>=0)state.months[idx]=row;else state.months.push(row)
  save();closeModal();render();toast('Saved ✓')
}
function deleteMonth(){
  if(!editM)return
  state.months=state.months.filter(m=>m.month!==editM)
  save();closeModal();render();toast('Deleted')
}

