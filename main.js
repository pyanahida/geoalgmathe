import { parseExpression, parseEquationAST } from './parser.js';
import { evaluate, evaluateY } from './evaluator.js';
import { toFrac } from './fraction.js';
import { drawPlot } from './plotter.js';

const exprList = document.getElementById('expr-list');
const resultEl = document.getElementById('result');
const canvas = document.getElementById('plot');
const themeBtn = document.getElementById('theme-toggle');

let viewportState = { panX: 0, panY: 0, scale: 50 };
let theme = document.body.classList.contains('light') ? 'light' : 'dark';
let renderPending = false;

function scheduleRender() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => {
    renderPending = false;
    render();
  });
}

// ---- 行管理 ----
let rowCounter = 0;
function createRow(value = '') {
  const index = rowCounter++;
  const div = document.createElement('div');
  div.className = 'expr-row';
  div.dataset.index = index;
  const btn = document.createElement('button');
  btn.className = 'status-btn';
  btn.type = 'button';
  btn.title = '正常';
  btn.innerHTML = '<span class="status-icon"></span>';
  btn.addEventListener('click', () => {
    const err = btn.dataset.errMsg;
    if (err) alert('表达式错误：\n\n' + err);
  });
  const input = document.createElement('input');
  input.className = 'expr-input';
  input.type = 'text';
  input.placeholder = 'e.g. 3x';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.value = value;
  input.addEventListener('input', () => {
    updateRowStatus(div, input.value);
    scheduleRender();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newRow = createRow('');
      const newInput = newRow.querySelector('.expr-input');
      newInput.focus();
      scheduleRender();
      return;
    }
    if (e.key === 'Backspace' && !input.value && exprList.children.length > 1) {
      e.preventDefault();
      const prev = div.previousElementSibling;
      div.remove();
      scheduleRender();
      if (prev) {
        prev.querySelector('.expr-input').focus();
      }
    }
  });
  div.appendChild(btn);
  div.appendChild(input);
  exprList.appendChild(div);
  updateRowStatus(div, value);
  return div;
}

function updateRowStatus(row, expr) {
  const btn = row.querySelector('.status-btn');
  const icon = btn.querySelector('.status-icon');
  const trimmed = expr.trim();
  if (!trimmed) {
    icon.textContent = '';
    btn.classList.remove('err', 'ok');
    btn.dataset.errMsg = '';
    return;
  }
  try {
    parseExpression(trimmed);
    icon.textContent = '✔️';
    btn.classList.remove('err');
    btn.classList.add('ok');
    btn.dataset.errMsg = '';
  } catch (e) {
    icon.textContent = '❌';
    btn.classList.remove('ok');
    btn.classList.add('err');
    btn.dataset.errMsg = `「${trimmed}」: ${e.message}`;
  }
}

// ---- 初始化 ----
exprList.innerHTML = '';
createRow('');

// ---- 解析 ----
function isImplicitOrVertical(ast) {
  if (!ast || ast.type !== 'Binary' || ast.op !== 'EQ') return false;
  const isX = n => n.type === 'Var' && n.name === 'x';
  const isConst = n => n.type === 'Frac' || n.type === 'Num';
  if ((isX(ast.left) && isConst(ast.right)) || (isX(ast.right) && isConst(ast.left))) return true;
  const left = ast.left;
  if (
    left.type === 'Binary' && left.op === 'POW' &&
    left.left.type === 'Var' && left.left.name === 'y' &&
    left.right.type === 'Frac' && left.right.value.den === 1 && left.right.value.num === 2
  ) return true;
  return false;
}

function parseAll() {
  const rows = exprList.querySelectorAll('.expr-row');
  const exprs = [];
  let hasError = false;
  rows.forEach((row) => {
    const input = row.querySelector('.expr-input');
    const expr = input.value.trim();
    if (!expr) return;
    try {
      const ast = parseExpression(expr);
      const eqAST = parseEquationAST(expr);
      const needsAST = isImplicitOrVertical(eqAST);
      let fn = null;
      if (!needsAST) {
        fn = x => {
          const r = evaluate(ast, { x });
          return r && typeof r.toNumber === 'function' ? r.toNumber() : Number(r);
        };
      }
      exprs.push({ fn, eqAST, raw: expr, needsAST });
    } catch {
      hasError = true;
      exprs.push({ fn: null, eqAST: null, raw: expr, needsAST: false });
    }
  });
  return { exprs, hasError };
}

function render() {
  resultEl.classList.remove('error');
  const { exprs, hasError } = parseAll();
  const normalFns = exprs.filter(e => e.fn && !e.needsAST).map(e => e.fn);
  const astExprs = exprs.filter(e => e.needsAST && e.eqAST);
  const lastAST = astExprs.length ? astExprs[astExprs.length - 1].eqAST : null;
  window._currentAST_ = lastAST;
  drawPlot(canvas, normalFns, astExprs.map(e => e.eqAST), viewportState, theme, []);
  if (hasError) {
    resultEl.textContent = '✗ 有表达式无法解析';
    resultEl.classList.add('error');
  } else {
    const count = exprs.filter(e => e.raw).length;
    resultEl.textContent = count ? `✓ ${count} 条表达式已渲染` : '';
  }
}

// ---- 拖拽 ----
let dragging = false, lastX = 0, lastY = 0, activePointerId = null;
canvas.addEventListener('pointerdown', e => {
  dragging = true;
  activePointerId = e.pointerId;
  lastX = e.clientX;
  lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add('dragging');
});
canvas.addEventListener('pointermove', e => {
  if (!dragging || e.pointerId !== activePointerId) return;
  viewportState.panX -= (e.clientX - lastX) / viewportState.scale;
  viewportState.panY += (e.clientY - lastY) / viewportState.scale;
  lastX = e.clientX;
  lastY = e.clientY;
  scheduleRender();
});
const endDrag = e => {
  if (e.pointerId !== activePointerId) return;
  dragging = false;
  activePointerId = null;
  canvas.classList.remove('dragging');
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
  const mx = (cx - w / 2 - panX) / oldScale;
  const my = (h / 2 + panY - cy) / oldScale;
  viewportState.panX = cx - w / 2 - mx * newScale;
  viewportState.panY = my * newScale + cy - h / 2;
  viewportState.scale = newScale;
  scheduleRender();
}, { passive: false });

// ---- 主题 ----
themeBtn.addEventListener('click', () => {
  document.body.classList.toggle('light');
  theme = document.body.classList.contains('light') ? 'light' : 'dark';
  themeBtn.textContent = theme === 'light' ? '☀️' : '🌙';
  render();
});

// ---- 点击：先检测是否点到了曲线，再求交点 ----
canvas.addEventListener('click', (e) => {
  const { exprs } = parseAll();
  if (!exprs.length) return;

  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const { panX, panY, scale } = viewportState;

  // 点击位置的数学坐标
  const mx = (cx - w / 2 - panX) / scale;
  const my = (h / 2 + panY - cy) / scale;

  // 容差：15 像素对应的数学坐标
  const pixelTol = 15;
  const mathTol = pixelTol / scale;

  // ---- 检测点击位置附近是否有函数图像经过 ----
  let hitCurve = false;

  for (const expr of exprs) {
    if (!expr.raw) continue;

    if (expr.fn && !expr.needsAST) {
      // 普通函数：在 mx 附近密集采样，看是否有 y 接近 my
      const sampleCount = 30;
      const sampleDx = mathTol / sampleCount * 2; // 覆盖 mx ± mathTol 范围
      for (let i = 0; i <= sampleCount; i++) {
        const x = mx - mathTol + i * sampleDx * 2;
        try {
          const y = expr.fn(x);
          if (typeof y === 'number' && isFinite(y)) {
            // 像素距离
            const py = h - ((y - ((-h / 2 + panY) / scale)) / ((h / 2 + panY) / scale - (-h / 2 + panY) / scale)) * h;
            // 简化：直接比较数学坐标距离
            if (Math.abs(y - my) <= mathTol) {
              hitCurve = true;
              break;
            }
          }
        } catch {}
      }
    } else if (expr.needsAST && expr.eqAST) {
      // AST 曲线
      const sampleCount = 30;
      const sampleDx = mathTol / sampleCount * 2;
      for (let i = 0; i <= sampleCount; i++) {
        const x = mx - mathTol + i * sampleDx * 2;
        try {
          const res = evaluateY(expr.eqAST, x);
          if (!res) continue;
          if (res.type === 'vertical') {
            if (Math.abs(res.x - mx) <= mathTol) {
              hitCurve = true;
              break;
            }
          } else if (res.type === 'function') {
            for (const y of res.ys) {
              if (typeof y === 'number' && isFinite(y) && Math.abs(y - my) <= mathTol) {
                hitCurve = true;
                break;
              }
            }
          }
        } catch {}
        if (hitCurve) break;
      }
    }
    if (hitCurve) break;
  }

  // ---- 没点到曲线上 → 清除交点标记，直接重绘 ----
  const normalFns = exprs.filter(e => e.fn && !e.needsAST).map(e => e.fn);
  const astExprs = exprs.filter(e => e.needsAST && e.eqAST);

  if (!hitCurve) {
    drawPlot(canvas, normalFns, astExprs.map(e => e.eqAST), viewportState, theme, []);
    resultEl.innerHTML = '✓ 点击函数图像以显示交点';
    return;
  }

  // ---- 点到曲线了 → 计算并显示交点 ----
  const xMin = (-w / 2 - panX) / scale;
  const xMax = (w / 2 - panX) / scale;
  const yMin = (-h / 2 + panY) / scale;
  const yMax = (h / 2 + panY) / scale;

  const intersections = [];

  for (const e of exprs) {
    if (e.fn && !e.needsAST) {
      // y 轴交点
      try {
        const y0 = e.fn(0);
        if (typeof y0 === 'number' && isFinite(y0) && 0 >= xMin && 0 <= xMax) {
          intersections.push({ x: 0, y: y0 });
        }
      } catch {}

      // x 轴交点：二分法
      const steps = 400;
      const dx = (xMax - xMin) / steps;
      let prevX = xMin, prevY;
      try { prevY = e.fn(prevX); } catch { prevY = NaN; }
      for (let i = 1; i <= steps; i++) {
        const x = xMin + i * dx;
        let y;
        try { y = e.fn(x); } catch { y = NaN; }
        if (typeof prevY === 'number' && isFinite(prevY) &&
            typeof y === 'number' && isFinite(y)) {
          if (prevY === 0) {
            intersections.push({ x: prevX, y: 0 });
          } else if (prevY * y < 0) {
            let lo = prevX, hi = x, flo = prevY, fhi = y;
            for (let k = 0; k < 60; k++) {
              const mid = (lo + hi) / 2;
              let fm;
              try { fm = e.fn(mid); } catch { break; }
              if (!isFinite(fm)) break;
              if (flo === 0) break;
              if (flo * fm <= 0) { hi = mid; fhi = fm; }
              else { lo = mid; flo = fm; }
            }
            intersections.push({ x: (lo + hi) / 2, y: 0 });
          }
        }
        prevX = x; prevY = y;
      }
    } else if (e.needsAST && e.eqAST) {
      // AST 曲线
      const steps = 400;
      const dx = (xMax - xMin) / steps;
      for (let i = 0; i <= steps; i++) {
        const x = xMin + i * dx;
        let res;
        try { res = evaluateY(e.eqAST, x); } catch { continue; }
        if (!res) continue;
        if (res.type === 'vertical') {
          if (res.x >= xMin && res.x <= xMax) {
            intersections.push({ x: res.x, y: 0 });
          }
        } else if (res.type === 'function') {
          for (const yv of res.ys) {
            if (typeof yv === 'number' && isFinite(yv) && Math.abs(yv) < 1e-6) {
              if (Math.abs(x) < 1e-9) continue; // 跳过原点避免重复
              intersections.push({ x, y: 0 });
            }
          }
        }
      }
    }
  }

  // ✅ 消除 -0，去重
  const seen = [];
  const dedup = [];
  for (const p of intersections) {
    const rx = p.x === 0 ? 0 : p.x;
    const ry = p.y === 0 ? 0 : p.y;
    const key = `${rx.toFixed(4)}_${ry.toFixed(4)}`;
    if (!seen.includes(key)) {
      seen.push(key);
      dedup.push({ x: rx, y: ry });
    }
  }

  // 只保留视口内
  const inView = dedup.filter(p => p.x >= xMin && p.x <= xMax && p.y >= yMin && p.y <= yMax);

  drawPlot(canvas, normalFns, astExprs.map(e => e.eqAST), viewportState, theme, inView);

  if (!inView.length) {
    resultEl.innerHTML = '✓ 该曲线在当前视口内与坐标轴无交点';
  } else {
    const uniqueStrs = [];
    let html = '与坐标轴交点：';
    for (const p of inView) {
      const str = `(${fracToKatex(p.x)}, ${fracToKatex(p.y)})`;
      if (!uniqueStrs.includes(str)) {
        uniqueStrs.push(str);
        html += str;
        if (uniqueStrs.length < inView.length) html += ', ';
      }
    }
    resultEl.innerHTML = html;
  }
});

function fracToKatex(val) {
  if (typeof val !== 'number') return String(val);
  if (Number.isInteger(val)) return String(val);
  try {
    const f = toFrac(val);
    if (Math.abs(f.toNumber() - val) < 1e-12) {
      return f.den === 1 ? String(f.num) : `\\frac{${f.num}}{${f.den}}`;
    }
  } catch {}
  return val.toFixed(3).replace(/\.?0+$/, '');
}

// ---- resize ----
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
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
