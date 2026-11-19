// plotter.js — 完整覆盖
import { Frac } from './fraction.js';
import { evaluate } from './evaluator.js';

function getColors(theme) {
  return theme === 'light'
    ? { bg: '#f5f5f8', axis: '#1a1a2e', grid: '#dcdce0', line: '#0a84ff', tick: '#1a1a2e' }
    : { bg: '#0a0a0f', axis: '#00ffcc', grid: '#1f2a2e', line: '#00ffcc', tick: '#00ffcc' };
}

export function drawPlot(canvas, exprFn, viewportState, theme) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const colors = getColors(theme);
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  // 尺寸同步
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ★ 清屏 + 重置路径（必须在每次绘制开头）
  ctx.clearRect(0, 0, w, h);
  ctx.beginPath();

  // 背景
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, w, h);

  // 从 viewportState 解构
  const { panX, panY, scale } = viewportState;

  // 逻辑坐标范围
  const xMin = (-w / 2 - panX) / scale;
  const xMax = ( w / 2 - panX) / scale;
  const yMin = (-h / 2 + panY) / scale;
  const yMax = ( h / 2 + panY) / scale;

  // ---- 网格 ----
  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();

  const targetCells = Math.max(8, Math.floor(w / 70));
  let mag = Math.pow(10, Math.floor(Math.log10((xMax - xMin) / targetCells)));
  let norm = ((xMax - xMin) / targetCells) / mag;
  let mult = norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10;
  const stepX = mag * mult;

  for (let x = Math.ceil(xMin / stepX) * stepX; x <= xMax; x += stepX) {
    const px = ((x - xMin) / (xMax - xMin)) * w;
    ctx.moveTo(px, 0); ctx.lineTo(px, h);
  }

  const yTargetCells = Math.max(8, Math.floor(h / 70));
  mag = Math.pow(10, Math.floor(Math.log10((yMax - yMin) / yTargetCells)));
  norm = ((yMax - yMin) / yTargetCells) / mag;
  mult = norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10;
  const stepY = mag * mult;

  for (let y = Math.ceil(yMin / stepY) * stepY; y <= yMax; y += stepY) {
    const py = h - ((y - yMin) / (yMax - yMin)) * h;
    ctx.moveTo(0, py); ctx.lineTo(w, py);
  }
  ctx.stroke();

  // ---- 坐标轴 + 刻度 ----
  const xZero = ((0 - xMin) / (xMax - xMin)) * w;
  const yZero = h - ((0 - yMin) / (yMax - yMin)) * h;

  ctx.strokeStyle = colors.axis;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (yZero >= 0 && yZero <= h) { ctx.moveTo(0, yZero); ctx.lineTo(w, yZero); }
  if (xZero >= 0 && xZero <= w) { ctx.moveTo(xZero, 0); ctx.lineTo(xZero, h); }
  ctx.stroke();

  // 刻度
  ctx.fillStyle = colors.tick;
  ctx.font = '11px Courier New';

  if (yZero >= -20 && yZero <= h + 20) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let x = Math.ceil(xMin / stepX) * stepX; x <= xMax; x += stepX) {
      if (Math.abs(x) < stepX / 10) continue;
      const px = ((x - xMin) / (xMax - xMin)) * w;
      ctx.beginPath(); ctx.moveTo(px, yZero - 4); ctx.lineTo(px, yZero + 4); ctx.strokeStyle = colors.axis; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = colors.tick;
      const label = Number.isInteger(x) ? String(x) : x.toFixed(2).replace(/\.?0+$/, '');
      ctx.fillText(label, px, yZero + 6);
    }
  }

  if (xZero >= -20 && xZero <= w + 20) {
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let y = Math.ceil(yMin / stepY) * stepY; y <= yMax; y += stepY) {
      if (Math.abs(y) < stepY / 10) continue;
      const py = h - ((y - yMin) / (yMax - yMin)) * h;
      ctx.beginPath(); ctx.moveTo(xZero - 4, py); ctx.lineTo(xZero + 4, py); ctx.strokeStyle = colors.axis; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = colors.tick;
      const label = Number.isInteger(y) ? String(y) : y.toFixed(2).replace(/\.?0+$/, '');
      ctx.fillText(label, xZero - 6, py);
    }
  }

  // ---- 函数曲线 ----
  if (!exprFn) return;

  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 2.5;
  ctx.beginPath();

  const steps = w * 2;
  const dx = (xMax - xMin) / steps;
  let started = false;

  for (let i = 0; i <= steps; i++) {
    const x = xMin + i * dx;
    let y;
    try {
      y = exprFn(x);
    } catch { started = false; continue; }

    if (typeof y !== 'number' || !isFinite(y)) { started = false; continue; }

    const px = ((x - xMin) / (xMax - xMin)) * w;
    const py = h - ((y - yMin) / (yMax - yMin)) * h;

    if (py < -1000 || py > h + 1000) { started = false; continue; }

    if (!started) { ctx.moveTo(px, py); started = true; }
    else { ctx.lineTo(px, py); }
  }
  ctx.stroke();
}
