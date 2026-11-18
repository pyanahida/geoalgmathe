import { Frac, toFrac, decimalToFrac } from './fraction.js';

// 将 AST 中的数字字面量转为 Frac 节点
function normalizeAST(node) {
  if (node.type === 'Num') {
    const val = parseFloat(node.value);
    return { type: 'Frac', value: decimalToFrac(val) };
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
  return node; // Var
}

export function evaluate(ast, vars = {}) {
  const node = normalizeAST(ast);

  function walk(n) {
    switch (n.type) {
      case 'Frac':
        return n.value;

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
          case 'POW': {
            // 指数为整数时保持分数精度
            if (r.den === 1 && Number.isInteger(r.num)) {
              return l.pow(r.num);
            }
            return l.toNumber() ** r.toNumber();
          }
          default: throw new Error(`未知运算符: ${n.op}`);
        }
      }

      default:
        throw new Error(`未知节点: ${n.type}`);
    }
  }

  return walk(node);
}
