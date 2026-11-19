import { parseExpression } from './parser.js';
import { evaluate } from './evaluator.js';
import { drawPlot } from './plotter.js';

const input = document.getElementById('expr');
const resultEl = document.getElementById('result');
const canvas = document.getElementById('plot');
const themeBtn = document.getElementById('theme-toggle');

let currentExprFn = null;
let viewportState = { panX: 0, panY: 0, scale: 50 };
let theme = document.body.classList.contains('light') ? 'light' : 'dark';

function render() {
  const expr = input.value.trim();
  resultEl.classList.remove('error');
  if (!expr) {
    currentExprFn = null;
    drawPlot(canvas, null, viewportState, theme);
    resultEl.textContent = '';
    return;
  }
  try {
    const ast = parseExpression(expr);
    currentExprFn = x => {
      const result = evaluate(ast, { x });
      return result && typeof result.toNumber === 'function'
        ? result.toNumber()
        : Number(result);
    };
    drawPlot(canvas, currentExprFn, viewportState, theme);
    resultEl.textContent = '✓ parsed & plotted';
  } catch (e) {
    resultEl.textContent = `✗ ${e.message}`;
    resultEl.classList.add('error');
    console.error('[main] render error:', e);
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
  render();
});

const endDrag = e => {
  if (e.pointerId !== activePointerId) return;
  dragging = false;
  activePointerId = null;
  try { canvas.releasePointerCapture(e.pointerId); } catch {}
};

canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

// ---- 缩放（围绕鼠标位置） ----
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

  // 鼠标对应的数学坐标（与 plotter.js 公式一致）
  const mx = (cx - w / 2 - viewportState.panX) / oldScale;
  const my = (h / 2 + viewportState.panY - cy) / oldScale;

  // 调整 pan 使鼠标位置不变
  viewportState.panX = cx - w / 2 - mx * newScale;
  viewportState.panY = my * newScale + cy - h / 2;
  viewportState.scale = newScale;

  render();
}, { passive: false });

// ---- 主题 ----
themeBtn.addEventListener('click', () => {
  document.body.classList.toggle('light');
  theme = document.body.classList.contains('light') ? 'light' : 'dark';
  themeBtn.textContent = theme === 'light' ? '☀️' : '🌙';
  render();
});

input.addEventListener('input', render);
window.addEventListener('resize', resizeCanvas);

// ---- 初始化 ----
resizeCanvas();
