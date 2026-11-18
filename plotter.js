import { evaluate } from './evaluator.js';
import { Frac } from './fraction.js';

// Viewport 状态（由 main.js 管理）
let viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };

export function setViewport(v) {
  viewport = v;
}

export function getViewport() {
  return viewport;
}

export function plot(canvas, ast) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  const { xMin, xMax, yMin, yMax } = viewport;
  drawGrid(ctx, W, H, xMin, xMax, yMin, yMax);
  drawAxes(ctx, W, H, xMin, xMax, yMin, yMax);

  if (!ast) return;

  // 读取主题色
  const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#00ffcc';

  ctx.strokeStyle = accent;
  ctx.lineWidth = 2.5;
  ctx.beginPath();

  const steps = W * 2;
  const dx = (xMax - xMin) / steps;
  let started = false;

  for (let i = 0; i <= steps; i++) {
    const x = xMin + i * dx;
    let y;

    try {
      const result = evaluate(ast, { x: new Frac(x) });
      y = result instanceof Frac ? result.toNumber() : result;
    } catch {
      started = false;
      continue;
    }

    if (!isFinite(y)) {
      started = false;
      continue;
    }

    const px = ((x - xMin) / (xMax - xMin)) * W;
    const py = H - ((y - yMin) / (yMax - yMin)) * H;

    if (!started) {
      ctx.moveTo(px, py);
      started = true;
    } else {
      ctx.lineTo(px, py);
    }
  }

  ctx.stroke();
}

function drawGrid(ctx, W, H, xMin, xMax, yMin, yMax) {
  const gridColor = getComputedStyle(document.body).getPropertyValue('--grid').trim() || 'rgba(0,255,204,.08)';
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;

  // 动态网格步长
  const xRange = xMax - xMin;
  const targetCells = 20;
  let mag = Math.pow(10, Math.floor(Math.log10(xRange / targetCells)));
  const norm = (xRange / targetCells) / mag;
  const mult = norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10;
  const stepX = mag * mult;

  const yRange = yMax - yMin;
  mag = Math.pow(10, Math.floor(Math.log10(yRange / targetCells)));
  const normY = (yRange / targetCells) / mag;
  const multY = normY < 1.5 ? 1 : normY < 3.5 ? 2 : normY < 7.5 ? 5 : 10;
  const stepY = mag * multY;

  // 竖线
  for (let x = Math.ceil(xMin / stepX) * stepX; x <= xMax; x += stepX) {
    const px = ((x - xMin) / (xMax - xMin)) * W;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, H);
    ctx.stroke();
  }
  // 横线
  for (let y = Math.ceil(yMin / stepY) * stepY; y <= yMax; y += stepY) {
    const py = H - ((y - yMin) / (yMax - yMin)) * H;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(W, py);
    ctx.stroke();
  }
}

function drawAxes(ctx, W, H, xMin, xMax, yMin, yMax) {
  const axisColor = getComputedStyle(document.body).getPropertyValue('--axis').trim() || '#00ffcc';
  ctx.strokeStyle = axisColor;
  ctx.lineWidth = 2;

  const xZero = -xMin / (xMax - xMin) * W;
  if (xZero >= 0 && xZero <= W) {
    ctx.beginPath();
    ctx.moveTo(xZero, 0);
    ctx.lineTo(xZero, H);
    ctx.stroke();
  }

  const yZero = H - (-yMin / (yMax - yMin) * H);
  if (yZero >= 0 && yZero <= H) {
    ctx.beginPath();
    ctx.moveTo(0, yZero);
    ctx.lineTo(W, yZero);
    ctx.stroke();
  }
}
