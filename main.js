import { parseExpression, parseEquationAST } from './parser.js';
import { evaluate, evaluateY } from './evaluator.js';
import { toFrac } from './fraction.js';
import { drawPlot } from './plotter.js';

const input = document.getElementById('expr');
const resultEl = document.getElementById('result');
const canvas = document.getElementById('plot');
const themeBtn = document.getElementById('theme-toggle');

let currentExprFn = null;
let currentAST = null;
let viewportState = { panX: 0, panY: 0, scale: 50 };
let theme = document.body.classList.contains('light') ? 'light' : 'dark';

// ✅ 用 rAF 防抖渲染，避免阻塞主线程
let renderPending = false;
function scheduleRender() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => {
    renderPending = false;
    render();
  });
}

function render() {
  const t0 = performance.now(); // ✅ 开始计时

  const expr = input.value.trim();
  resultEl.classList.remove('error');
  if (!expr) {
    currentExprFn = null;
    currentAST = null;
    drawPlot(canvas, null, viewportState, theme, []);
    resultEl.textContent = '';
    return;
  }
  try {
    const ast = parseExpression(expr);
    currentAST = parseEquationAST(expr);
    window._currentAST_ = currentAST;
    currentExprFn = x => {
      const result = evaluate(ast, { x });
      return result && typeof result.toNumber === 'function'
        ? result.toNumber()
        : Number(result);
    };
    drawPlot(canvas, currentExprFn, viewportState, theme, []);
    resultEl.textContent = '✓ parsed & plotted';
  } catch (e) {
    resultEl.textContent = `✗ ${e.message}`;
    resultEl.classList.add('error');
    console.error('[main] render error:', e);
  }

  const t1 = performance.now(); // ✅ 结束计时
  console.log(`[性能] 渲染耗时: ${(t1 - t0).toFixed(3)} ms`);
}

// ---- 拖拽 ----
let dragging = false, lastX = 0, lastY = 0, activePointerId = null;
canvas.addEventListener('pointerdown', e => {
  dragging = true;
  activePointerId = e.pointerId;
  lastX = e.clientX;
  lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  if (!dragging || e.pointerId !== activePointerId) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;
  viewportState.panX -= dx / viewportState.scale;
  viewportState.panY += dy / viewportState.scale;
  scheduleRender(); // ✅ 改用防抖
});
const endDrag = e => {
  if (e.pointerId !== activePointerId) return;
  dragging = false;
  activePointerId = null;
  try { canvas.releasePointerCapture(e.pointerId); } catch {}
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

// ---- 缩放 ----
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const factor = e.deltaY < 0 ? 1.1 : 0.9;
  const oldScale = viewportState.scale;
  const newScale = oldScale * factor;
  const mx = (cx - w / 2 - viewportState.panX) / oldScale;
  const my = (h / 2 + viewportState.panY - cy) / oldScale;
  viewportState.panX = cx - w / 2 - mx * newScale;
  viewportState.panY = my * newScale + cy - h / 2;
  viewportState.scale = newScale;
  scheduleRender();
}, { passive: false });

// ---- 主题切换 ----
themeBtn.addEventListener('click', () => {
  const tStart = performance.now();
  console.log(`[主题] 按钮点击时间: ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}:${String(Math.floor(tStart % 1000)).padStart(3, '0')}`);
  console.log(`[主题] 开始切换，时间戳: ${tStart.toFixed(3)} ms`);

  document.body.classList.toggle('light');
  theme = document.body.classList.contains('light') ? 'light' : 'dark';
  themeBtn.textContent = theme === 'light' ? '☀️' : '🌙';

  // ✅ 强制同步绘制一次（主题色必须立即生效）
  render();

  const tEnd = performance.now();
  console.log(`[主题] 渲染完毕，时间戳: ${tEnd.toFixed(3)} ms`);
  console.log(`[主题] 切换+渲染总耗时: ${(tEnd - tStart).toFixed(3)} ms`);
});

// ---- 点击求交点 ----
canvas.addEventListener('click', e => {
  if (!currentAST) return;
  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const { panX, panY, scale } = viewportState;
  const xMin = (-w / 2 - panX) / scale;
  const xMax = (w / 2 - panX) / scale;
  const yMin = (-h / 2 + panY) / scale;
  const yMax = (h / 2 + panY) / scale;
  const mx = (cx - w / 2 - panX) / scale;
  const my = (h / 2 + panY - cy) / scale;
  const tol = 0.5 / scale;

  const intersections = [];

  for (let x = xMin; x <= xMax; x += (xMax - xMin) / 200) {
    try {
      const res = evaluateY(currentAST, x);
      if (!res) continue;
      if (res.type === 'vertical') {
        if (Math.abs(res.x - mx) < tol) {
          intersections.push({ x: res.x, y: 0 });
        }
      } else {
        for (const y of res.ys) {
          if (Math.abs(y - my) < tol) {
            if (Math.abs(y) < tol) intersections.push({ x, y: 0 });
            if (Math.abs(x) < tol) intersections.push({ x: 0, y });
          }
        }
      }
    } catch {}
  }

  drawPlot(canvas, currentExprFn, viewportState, theme, intersections);
  showIntersectionsKatex(intersections);
});

function fracToKatex(val) {
  if (typeof val !== 'number') return String(val);
  if (Number.isInteger(val)) return String(val);
  try {
    const f = toFrac(val);
    if (Math.abs(f.toNumber() - val) < 1e-12) {
      if (f.den === 1) return String(f.num);
      return `\\frac{${f.num}}{${f.den}}`;
    }
  } catch {}
  return val.toFixed(3).replace(/\.?0+$/, '');
}

function showIntersectionsKatex(points) {
  if (!points.length) {
    resultEl.innerHTML = '✓ 无交点';
    return;
  }
  let html = '交点：';
  points.forEach((p, i) => {
    html += `(${fracToKatex(p.x)}, ${fracToKatex(p.y)})`;
    if (i < points.length - 1) html += ', ';
  });
  resultEl.innerHTML = html;
  if (window.renderMathInElement) {
    renderMathInElement(resultEl, {
      delimiters: [{ left: '$$', right: '$$', display: false }]
    });
  }
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  if (canvas.width === cssW * dpr && canvas.height === cssH * dpr) return;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  render();
}

input.addEventListener('input', scheduleRender); // ✅ 防抖
window.addEventListener('resize', resizeCanvas);

// ---- 初始化 ----
resizeCanvas();
