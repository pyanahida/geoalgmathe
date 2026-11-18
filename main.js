import { parseExpression } from './parser.js';
import { plot, setViewport, getViewport } from './plotter.js';

const input = document.getElementById('expr');
const resultEl = document.getElementById('result');
const canvas = document.getElementById('plot');
const themeBtn = document.getElementById('theme-toggle');

let currentAST = null;

// ---- Canvas 尺寸 ----
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
}

// ---- 渲染 ----
function render() {
  const expr = input.value.trim();
  resultEl.classList.remove('error');

  if (!expr) {
    currentAST = null;
    plot(canvas, null);
    resultEl.textContent = '';
    return;
  }

  try {
    let actualExpr = expr;
    if (/^y\s*=?\s*/i.test(expr)) {
      actualExpr = expr.replace(/^y\s*=\s*/, '');
    }

    currentAST = parseExpression(actualExpr);
    plot(canvas, currentAST);
    resultEl.textContent = '✓ parsed & plotted';
  } catch (e) {
    resultEl.textContent = `✗ ${e.message}`;
    resultEl.classList.add('error');
  }
}

// ---- 坐标转换 ----
function pxToMathX(px) {
  const { xMin, xMax } = getViewport();
  return xMin + (px / canvas.width) * (xMax - xMin);
}
function pxToMathY(py) {
  const { yMin, yMax } = getViewport();
  return yMin + ((canvas.height - py) / canvas.height) * (yMax - yMin);
}

// ---- 拖拽平移（桌面 + 手机单指） ----
let dragging = false;
let lastX = 0, lastY = 0;

canvas.addEventListener('pointerdown', (e) => {
  // 只响应单指/鼠标左键
  if (e.pointerType === 'touch' && e.isPrimary === false) return;
  dragging = true;
  canvas.classList.add('dragging');
  lastX = e.clientX;
  lastY = e.clientY;
  // 不再调用 setPointerCapture
});

canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;

  const dxPx = e.clientX - lastX;
  const dyPx = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;

  const { xMin, xMax, yMin, yMax } = getViewport();
  const dxMath = (dxPx / canvas.width) * (xMax - xMin);
  const dyMath = (dyPx / canvas.height) * (yMax - yMin);

  setViewport({
    xMin: xMin - dxMath,
    xMax: xMax - dxMath,
    yMin: yMin + dyMath,
    yMax: yMax + dyMath
  });

  render();
});

canvas.addEventListener('pointerup', () => {
  dragging = false;
  canvas.classList.remove('dragging');
});

canvas.addEventListener('pointercancel', () => {
  dragging = false;
  canvas.classList.remove('dragging');
});

// ---- 滚轮缩放（桌面） ----
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 0.9 : 1.1;
  applyZoom(factor, e.clientX, e.clientY);
}, { passive: false });

// ---- 手机双指缩放 ----
let touchDist = 0;
let touchCenter = null;

canvas.addEventListener('touchstart', (e) => {
  if (e.touches.length === 2) {
    // 双指：取消拖拽，记录初始距离和中心
    dragging = false;
    canvas.classList.remove('dragging');

    const t1 = e.touches[0];
    const t2 = e.touches[1];
    touchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    touchCenter = {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2
    };
  }
}, { passive: true });

canvas.addEventListener('touchmove', (e) => {
  if (e.touches.length === 2) {
    e.preventDefault(); // 阻止浏览器默认行为
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

    if (touchDist > 0) {
      const scale = dist / touchDist;
      const factor = 1 / scale;

      // 以双指中心为锚点
      const center = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2
      };

      applyZoomAt(factor, center.x, center.y);
      touchDist = dist;
    }
  }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  if (e.touches.length < 2) {
    touchDist = 0;
    touchCenter = null;
  }
});

// ---- 缩放逻辑 ----
function applyZoom(factor, clientX, clientY) {
  const dpr = window.devicePixelRatio || 1;
  const px = clientX * dpr;
  const py = clientY * dpr;
  applyZoomAt(factor, px, py);
}

function applyZoomAt(factor, px, py) {
  const { xMin, xMax, yMin, yMax } = getViewport();

  const mx = pxToMathX(px);
  const my = pxToMathY(py);

  setViewport({
    xMin: mx - (mx - xMin) * factor,
    xMax: mx + (xMax - mx) * factor,
    yMin: my - (my - yMin) * factor,
    yMax: my + (yMax - my) * factor
  });

  render();
}

// ---- 日夜模式 ----
function toggleTheme() {
  const isLight = document.body.classList.toggle('light');
  themeBtn.textContent = isLight ? '☀️' : '🌙';
  try { localStorage.setItem('theme', isLight ? 'light' : 'dark'); } catch {}
  render(); // 重绘以更新轴线颜色
}

const savedTheme = (() => { try { return localStorage.getItem('theme'); } catch { return null; } })();
if (savedTheme === 'light') {
  document.body.classList.add('light');
  themeBtn.textContent = '☀️';
}

themeBtn.addEventListener('click', toggleTheme);

// ---- 事件绑定 ----
input.addEventListener('input', render);

window.addEventListener('resize', () => {
  resizeCanvas();
  render();
});

// ---- 初始化 ----
resizeCanvas();
render();
