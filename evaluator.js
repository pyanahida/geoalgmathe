import { Frac, toFrac, decimalToFrac } from './fraction.js';

function normalizeAST(node) {
  if (node.type === 'Num') {
    return { type: 'Frac', value: decimalToFrac(parseFloat(node.value)) };
  }
  if (node.type === 'Binary') {
    return {
      type: 'Binary', op: node.op,
      left: normalizeAST(node.left),
      right: normalizeAST(node.right)
    };
  }
  if (node.type === 'Unary') {
    return {
      type: 'Unary', op: node.op,
      expr: normalizeAST(node.expr)
    };
  }
  return node;
}

export function evaluate(ast, vars = {}) {
  const node = normalizeAST(ast);
  function walk(n) {
    switch (n.type) {
      case 'Frac': return n.value;
      case 'Var': {
        const name = n.name;
        if (vars[name] == null) throw new Error(`变量 ${name} 未赋值`);
        const v = vars[name];
        return v instanceof Frac ? v : toFrac(v);
      }
      case 'Unary': {
        const val = walk(n.expr);
        const f = toFrac(val);
        return n.op === 'MINUS' ? f.mul(-1) : f;
      }
      case 'Binary': {
        const L = walk(n.left);
        const R = walk(n.right);
        const l = toFrac(L);
        const r = toFrac(R);
        switch (n.op) {
          case 'PLUS': return l.add(r);
          case 'MINUS': return l.sub(r);
          case 'MUL': return l.mul(r);
          case 'DIV': return l.div(r);
          case 'POW':
            if (r.den === 1 && Number.isInteger(r.num)) {
              return l.pow(r.num);
            }
            return l.toNumber() ** r.toNumber();
          default: throw new Error(`未知运算符: ${n.op}`);
        }
      }
      default:
        throw new Error(`未知节点: ${n.type}`);
    }
  }
  return walk(node);
}

/**
 * ✅ 判断表达式类型，不逐点调用，只在交点计算时用
 */
export function evaluateY(ast, x) {
  const expr = ast;
  // x = 常数
  if (expr.type === 'Binary' && expr.op === 'EQ') {
    const isXConst = (n) => n.type === 'Var' && n.name === 'x';
    const isConst = (n) => n.type === 'Frac' || n.type === 'Num';
    if (isXConst(expr.left) && isConst(expr.right)) {
      return { type: 'vertical', x: evaluate(expr.right).toNumber() };
    }
    if (isXConst(expr.right) && isConst(expr.left)) {
      return { type: 'vertical', x: evaluate(expr.left).toNumber() };
    }
  }
  // y^2 = ...
  if (expr.type === 'Binary' && expr.op === 'EQ') {
    const left = expr.left;
    if (
      left.type === 'Binary' &&
      left.op === 'POW' &&
      left.left.type === 'Var' && left.left.name === 'y' &&
      left.right.type === 'Frac' &&
      left.right.value.den === 1 &&
      left.right.value.num === 2
    ) {
      const rhs = evaluate(expr.right, { x });
      let v;
      try { v = toFrac(rhs).sqrt(); }
      catch { return null; }
      const num = typeof v === 'number' ? v : v.toNumber();
      return { type: 'function', ys: [-num, num] };
    }
  }
  // 普通 y = f(x)
  try {
    const y = evaluate(expr, { x });
    return { type: 'function', ys: [y.toNumber()] };
  } catch {
    return null;
  }
}
