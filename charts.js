/* ============================================================
   WEALTH ARC — CHARTS
   Small canvas chart set: line, bars, stacked bars.
   Minimal ink, tabular labels, touch-first interaction.
   ============================================================ */

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/** Resolve "var(--x)" / "--x" / literal colour to a canvas-usable string. */
function resolveColor(c) {
  if (!c) return '#888'
  const m = /^var\((--[\w-]+)\)$/.exec(c.trim())
  if (m) return cssVar(m[1]) || '#888'
  if (c.trim().startsWith('--')) return cssVar(c.trim()) || '#888'
  return c
}

/** Set up a crisp canvas; returns {ctx, w, h} in CSS pixels. */
function prepCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3)
  const rect = canvas.getBoundingClientRect()
  const w = Math.max(1, Math.round(rect.width))
  const h = Math.max(1, Math.round(rect.height))
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  return { ctx, w, h }
}

/** Monotone cubic path — smooth without inventing peaks. */
function monotoneTo(ctx, pts) {
  const n = pts.length
  if (n === 0) return
  if (n === 1) { ctx.moveTo(pts[0].x, pts[0].y); return }

  const dx = [], dy = [], m = []
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x
    dy[i] = pts[i + 1].y - pts[i].y
    m[i] = dx[i] === 0 ? 0 : dy[i] / dx[i]
  }
  const t = new Array(n)
  t[0] = m[0]
  t[n - 1] = m[n - 2]
  for (let i = 1; i < n - 1; i++) t[i] = (m[i - 1] * m[i] <= 0) ? 0 : (m[i - 1] + m[i]) / 2
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue }
    const a = t[i] / m[i], b = t[i + 1] / m[i]
    const s = a * a + b * b
    if (s > 9) {
      const tau = 3 / Math.sqrt(s)
      t[i] = tau * a * m[i]
      t[i + 1] = tau * b * m[i]
    }
  }
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i]
    ctx.bezierCurveTo(
      pts[i].x + h / 3, pts[i].y + t[i] * h / 3,
      pts[i + 1].x - h / 3, pts[i + 1].y - t[i + 1] * h / 3,
      pts[i + 1].x, pts[i + 1].y,
    )
  }
}

/** Nice round step for gridlines. */
function niceStep(range, target) {
  if (!(range > 0)) return 1
  const raw = range / Math.max(1, target)
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10
  return step * mag
}

/* ---- Interaction plumbing --------------------------------
   Listeners are attached to a canvas once; redraws only swap
   the callback, so repainting mid-gesture is safe.          */
const pointerState = new WeakMap()

function bindPointer(canvas, count, onIndex) {
  const existing = pointerState.get(canvas)
  if (existing) { existing.count = count; existing.cb = onIndex; return }

  const st = { count, cb: onIndex }
  pointerState.set(canvas, st)

  const pick = e => {
    const rect = canvas.getBoundingClientRect()
    const touch = e.touches && e.touches[0]
    const x = (touch ? touch.clientX : e.clientX) - rect.left
    const pad = rect.width * 0.04
    const usable = Math.max(1, rect.width - pad * 2)
    const ratio = Math.max(0, Math.min(1, (x - pad) / usable))
    const i = st.count <= 1 ? 0 : Math.round(ratio * (st.count - 1))
    st.cb(i, x)
  }
  const clear = () => st.cb(null, 0)

  canvas.addEventListener('pointerdown', pick)
  canvas.addEventListener('pointermove', e => {
    if (e.buttons || e.pointerType === 'mouse') pick(e)
  })
  canvas.addEventListener('pointerup', clear)
  canvas.addEventListener('pointercancel', clear)
  canvas.addEventListener('pointerleave', clear)
  canvas.addEventListener('touchstart', e => { e.preventDefault(); pick(e) }, { passive: false })
  canvas.addEventListener('touchmove', e => { e.preventDefault(); pick(e) }, { passive: false })
  canvas.addEventListener('touchend', clear)
}

/* ============================================================
   LINE CHART
   cfg = {
     labels: ['2026-01', ...],
     series: [{ values:[n|null], color:'var(--x)', width:2, dash:[3,3], fill:true }],
     onHover(index|null),
     baselineZero: false,
   }
   ============================================================ */
function lineChart(canvas, cfg) {
  const { ctx, w, h } = prepCanvas(canvas)
  const labels = cfg.labels || []
  const series = (cfg.series || []).filter(s => s && s.values && s.values.length)
  if (!series.length || w < 40) return

  const padX = w * 0.04
  const padTop = 14
  const padBottom = 22
  const plotW = w - padX * 2
  const plotH = h - padTop - padBottom
  const n = labels.length

  // Extent across every visible series
  let min = Infinity, max = -Infinity
  series.forEach(s => s.values.forEach(v => {
    if (v == null || !Number.isFinite(v)) return
    if (v < min) min = v
    if (v > max) max = v
  }))
  if (!Number.isFinite(min)) return
  if (cfg.baselineZero) min = Math.min(min, 0)
  if (min === max) { min -= Math.abs(min) * 0.1 || 1; max += Math.abs(max) * 0.1 || 1 }

  const headroom = (max - min) * 0.12
  min -= headroom
  max += headroom

  const xAt = i => n <= 1 ? padX + plotW / 2 : padX + (i / (n - 1)) * plotW
  const yAt = v => padTop + plotH - ((v - min) / (max - min)) * plotH

  // Gridlines — three, unlabelled inside the plot, values on the left edge
  const step = niceStep(max - min, 3)
  ctx.strokeStyle = resolveColor('var(--chart-grid)')
  ctx.lineWidth = 1
  ctx.font = '500 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillStyle = resolveColor('var(--text-3)')
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'

  const first = Math.ceil(min / step) * step
  for (let g = first; g <= max; g += step) {
    const y = Math.round(yAt(g)) + 0.5
    if (y < padTop || y > padTop + plotH) continue
    ctx.beginPath()
    ctx.moveTo(padX, y)
    ctx.lineTo(w - padX, y)
    ctx.stroke()
    if (cfg.gridLabels !== false) ctx.fillText(cfg.formatTick ? cfg.formatTick(g) : String(Math.round(g)), padX + 2, y - 3)
  }

  // Series, back to front
  series.forEach(s => {
    const pts = []
    s.values.forEach((v, i) => {
      if (v == null || !Number.isFinite(v)) return
      pts.push({ x: xAt(i), y: yAt(v) })
    })
    if (!pts.length) return

    const color = resolveColor(s.color || 'var(--chart-line)')

    if (s.fill && pts.length > 1) {
      const grad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH)
      grad.addColorStop(0, resolveColor(s.fillTop || 'var(--chart-fill-a)'))
      grad.addColorStop(1, resolveColor(s.fillBottom || 'var(--chart-fill-b)'))
      ctx.beginPath()
      monotoneTo(ctx, pts)
      ctx.lineTo(pts[pts.length - 1].x, padTop + plotH)
      ctx.lineTo(pts[0].x, padTop + plotH)
      ctx.closePath()
      ctx.fillStyle = grad
      ctx.fill()
    }

    ctx.beginPath()
    monotoneTo(ctx, pts)
    ctx.strokeStyle = color
    ctx.lineWidth = s.width || 2
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.globalAlpha = s.alpha == null ? 1 : s.alpha
    if (s.dash) ctx.setLineDash(s.dash)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1

    // End marker on the primary series only
    if (s.marker && pts.length) {
      const p = pts[pts.length - 1]
      ctx.beginPath()
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.beginPath()
      ctx.arc(p.x, p.y, 6.5, 0, Math.PI * 2)
      ctx.strokeStyle = color
      ctx.globalAlpha = 0.22
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  })

  // x labels — first, middle, last only
  if (cfg.xLabels !== false && n > 1) {
    ctx.fillStyle = resolveColor('var(--text-3)')
    ctx.font = '500 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textBaseline = 'top'
    const marks = n <= 3 ? [0, n - 1] : [0, Math.floor((n - 1) / 2), n - 1]
    marks.forEach((i, k) => {
      const label = cfg.formatX ? cfg.formatX(labels[i], i) : labels[i]
      ctx.textAlign = k === 0 ? 'left' : k === marks.length - 1 ? 'right' : 'center'
      ctx.fillText(label, xAt(i), padTop + plotH + 7)
    })
  }

  // Crosshair for the hovered index
  const hi = cfg.hoverIndex
  if (hi != null && hi >= 0 && hi < n) {
    const x = xAt(hi)
    ctx.beginPath()
    ctx.moveTo(x, padTop)
    ctx.lineTo(x, padTop + plotH)
    ctx.strokeStyle = resolveColor('var(--line-strong)')
    ctx.lineWidth = 1
    ctx.setLineDash([2, 3])
    ctx.stroke()
    ctx.setLineDash([])

    series.forEach(s => {
      const v = s.values[hi]
      if (v == null || !Number.isFinite(v) || s.noDot) return
      ctx.beginPath()
      ctx.arc(x, yAt(v), 4, 0, Math.PI * 2)
      ctx.fillStyle = resolveColor(cssVar('--bg-elevated') ? '--bg-elevated' : '#fff')
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = resolveColor(s.color || 'var(--chart-line)')
      ctx.stroke()
    })
  }

  if (cfg.onHover) {
    bindPointer(canvas, n, (i) => cfg.onHover(i, i == null ? null : xAt(i), padTop))
  }
  return { xAt, yAt, plotH, padTop }
}

/* ============================================================
   BAR CHART — signed bars, zero baseline
   ============================================================ */
function barChart(canvas, cfg) {
  const { ctx, w, h } = prepCanvas(canvas)
  const vals = cfg.values || []
  if (!vals.length || w < 40) return

  const padX = w * 0.04
  const padTop = 12
  const padBottom = 20
  const plotW = w - padX * 2
  const plotH = h - padTop - padBottom

  let min = Math.min(0, ...vals.filter(Number.isFinite))
  let max = Math.max(0, ...vals.filter(Number.isFinite))
  if (min === max) max = min + 1
  const pad = (max - min) * 0.12
  max += pad
  if (min < 0) min -= pad

  const yAt = v => padTop + plotH - ((v - min) / (max - min)) * plotH
  const zeroY = yAt(0)

  const gap = Math.min(8, plotW / vals.length * 0.34)
  const bw = Math.max(3, (plotW - gap * (vals.length - 1)) / vals.length)
  const radius = Math.min(4, bw / 2)

  // Zero line
  ctx.beginPath()
  ctx.moveTo(padX, Math.round(zeroY) + 0.5)
  ctx.lineTo(w - padX, Math.round(zeroY) + 0.5)
  ctx.strokeStyle = resolveColor('var(--chart-grid)')
  ctx.lineWidth = 1
  ctx.stroke()

  const pos = resolveColor(cfg.color || 'var(--accent)')
  const neg = resolveColor(cfg.negColor || 'var(--neg)')

  vals.forEach((v, i) => {
    if (!Number.isFinite(v) || v === 0) return
    const x = padX + i * (bw + gap)
    const y = yAt(v)
    const top = Math.min(y, zeroY)
    const height = Math.max(1.5, Math.abs(zeroY - y))
    ctx.beginPath()
    const r = Math.min(radius, height / 2)
    if (v >= 0) {
      ctx.moveTo(x, top + height)
      ctx.lineTo(x, top + r)
      ctx.quadraticCurveTo(x, top, x + r, top)
      ctx.lineTo(x + bw - r, top)
      ctx.quadraticCurveTo(x + bw, top, x + bw, top + r)
      ctx.lineTo(x + bw, top + height)
    } else {
      ctx.moveTo(x, top)
      ctx.lineTo(x, top + height - r)
      ctx.quadraticCurveTo(x, top + height, x + r, top + height)
      ctx.lineTo(x + bw - r, top + height)
      ctx.quadraticCurveTo(x + bw, top + height, x + bw, top + height - r)
      ctx.lineTo(x + bw, top)
    }
    ctx.closePath()
    ctx.fillStyle = v >= 0 ? pos : neg
    ctx.globalAlpha = cfg.hoverIndex == null || cfg.hoverIndex === i ? 1 : 0.35
    ctx.fill()
    ctx.globalAlpha = 1
  })

  // x labels
  if (cfg.labels && cfg.labels.length === vals.length) {
    ctx.fillStyle = resolveColor('var(--text-3)')
    ctx.font = '500 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textBaseline = 'top'
    const every = Math.ceil(vals.length / 6)
    cfg.labels.forEach((l, i) => {
      if (i % every !== 0 && i !== vals.length - 1) return
      ctx.textAlign = 'center'
      ctx.fillText(l, padX + i * (bw + gap) + bw / 2, padTop + plotH + 6)
    })
  }

  if (cfg.onHover) {
    bindPointer(canvas, vals.length, i => cfg.onHover(i))
  }
}

/* ============================================================
   STACKED BARS — allocation over time
   cfg = { labels:[], stacks:[{color, values:[]}] }
   ============================================================ */
function stackChart(canvas, cfg) {
  const { ctx, w, h } = prepCanvas(canvas)
  const labels = cfg.labels || []
  const stacks = cfg.stacks || []
  if (!labels.length || !stacks.length || w < 40) return

  const padX = w * 0.04
  const padTop = 10
  const padBottom = 20
  const plotW = w - padX * 2
  const plotH = h - padTop - padBottom

  const totals = labels.map((_, i) => stacks.reduce((s, st) => s + (st.values[i] || 0), 0))
  const max = Math.max(1, ...totals) * 1.06

  const gap = Math.min(9, plotW / labels.length * 0.32)
  const bw = Math.max(4, (plotW - gap * (labels.length - 1)) / labels.length)

  labels.forEach((_, i) => {
    let y = padTop + plotH
    const x = padX + i * (bw + gap)
    stacks.forEach(st => {
      const v = st.values[i] || 0
      if (v <= 0) return
      const seg = (v / max) * plotH
      ctx.fillStyle = resolveColor(st.color)
      ctx.globalAlpha = cfg.hoverIndex == null || cfg.hoverIndex === i ? 1 : 0.32
      ctx.fillRect(x, y - seg + 0.5, bw, Math.max(1, seg - 1))
      ctx.globalAlpha = 1
      y -= seg
    })
  })

  ctx.fillStyle = resolveColor('var(--text-3)')
  ctx.font = '500 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textBaseline = 'top'
  const every = Math.ceil(labels.length / 6)
  labels.forEach((l, i) => {
    if (i % every !== 0 && i !== labels.length - 1) return
    ctx.textAlign = 'center'
    ctx.fillText(l, padX + i * (bw + gap) + bw / 2, padTop + plotH + 6)
  })

  if (cfg.onHover) bindPointer(canvas, labels.length, i => cfg.onHover(i))
}

/* ---- Redraw registry ------------------------------------- */
/* Views register their draw callbacks so theme changes and
   resizes can repaint without a full re-render. */
const chartRedraws = new Set()

function registerChart(fn) {
  chartRedraws.add(fn)
  fn()
  return fn
}

function clearCharts() { chartRedraws.clear() }

function redrawCharts() { chartRedraws.forEach(fn => { try { fn() } catch (e) {} }) }

let resizeTimer = null
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(redrawCharts, 120)
})
