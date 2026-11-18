// 表达式解析器
// 支持：+ - × ÷ * / ^ ( ) 0-9 . x y
// 隐式乘法：7x → 7*x, 2(x+1) → 2*(x+1), x(x+1) → x*(x+1)

// Token 类型
const T = {
  NUM: 'NUM', PLUS: 'PLUS', MINUS: 'MINUS',
  MUL: 'MUL', DIV: 'DIV', POW: 'POW',
  LPAREN: 'LPAREN', RPAREN: 'RPAREN',
  VAR: 'VAR', EOF: 'EOF'
};

function tokenize(input) {
  const tokens = [];
  let i = 0;
  const s = input.replace(/\s+/g, '');

  while (i < s.length) {
    const c = s[i];

    if (c >= '0' && c <= '9' || c === '.') {
      let num = '';
      let dots = 0;
      while (i < s.length && (s[i] >= '0' && s[i] <= '9' || s[i] === '.')) {
        if (s[i] === '.') dots++;
        num += s[i++];
      }
      if (dots > 1) throw new Error(`非法数字: ${num}`);
      tokens.push({ type: T.NUM, value: num });
      continue;
    }

    switch (c) {
      case '+': tokens.push({ type: T.PLUS }); i++; break;
      case '-': tokens.push({ type: T.MINUS }); i++; break;
      case '*': tokens.push({ type: T.MUL }); i++; break;
      case '/': tokens.push({ type: T.DIV }); i++; break;
      case '×': tokens.push({ type: T.MUL }); i++; break;
      case '÷': tokens.push({ type: T.DIV }); i++; break;
      case '^': tokens.push({ type: T.POW }); i++; break;
      case '(': tokens.push({ type: T.LPAREN }); i++; break;
      case ')': tokens.push({ type: T.RPAREN }); i++; break;
      case 'x':
      case 'y':
        tokens.push({ type: T.VAR, value: c });
        i++;
        // 隐式乘法：x 后面紧跟数字或 ( 或 x/y
        if (i < s.length) {
          const next = s[i];
          if (next >= '0' && next <= '9' || next === '(' || next === 'x' || next === 'y') {
            tokens.push({ type: T.MUL });
          }
        }
        break;
      default:
        throw new Error(`无法识别的字符: "${c}" at pos ${i}`);
    }
  }

  // 隐式乘法：数字后紧跟 ( 或 x/y
  for (let j = 0; j < tokens.length - 1; j++) {
    const cur = tokens[j];
    const nxt = tokens[j + 1];
    if (
      cur.type === T.NUM && (nxt.type === T.LPAREN || nxt.type === T.VAR) ||
      cur.type === T.RPAREN && (nxt.type === T.LPAREN || nxt.type === T.VAR || nxt.type === T.NUM) ||
      cur.type === T.VAR && (nxt.type === T.LPAREN || nxt.type === T.VAR || nxt.type === T.NUM)
    ) {
      tokens.splice(j + 1, 0, { type: T.MUL });
      j++;
    }
  }

  tokens.push({ type: T.EOF });
  return tokens;
}

// ---- Pratt 解析器 ----

function parse(tokens) {
  let pos = 0;

  function peek() { return tokens[pos]; }
  function advance() { return tokens[pos++]; }

  // 优先级
  const PREC = {
    [T.PLUS]: 1, [T.MINUS]: 1,
    [T.MUL]: 2, [T.DIV]: 2,
    [T.POW]: 3
  };

  function parseExpr(minPrec = 0) {
    let left = parsePrefix();

    while (peek().type !== T.EOF && peek().type !== T.RPAREN) {
      const op = peek();
      const prec = PREC[op.type];
      if (prec == null || prec < minPrec) break;

      advance();
      const nextMinPrec = op.type === T.POW ? prec : prec + 1;
      const right = parseExpr(nextMinPrec);
      left = { type: 'Binary', op: op.type, left, right };
    }

    return left;
  }

  function parsePrefix() {
    const tok = advance();

    switch (tok.type) {
      case T.NUM:
        return { type: 'Num', value: tok.value };
      case T.VAR:
        return { type: 'Var', name: tok.value };
      case T.MINUS:
        return { type: 'Unary', op: 'MINUS', expr: parsePrefix() };
      case T.LPAREN: {
        const expr = parseExpr();
        const next = advance();
        if (next.type !== T.RPAREN) throw new Error('缺少右括号');
        return expr;
      }
      default:
        throw new Error(`意外的 token: ${tok.type}`);
    }
  }

  const ast = parseExpr();
  if (peek().type !== T.EOF) throw new Error('表达式未完全解析');
  return ast;
}

// 对外 API
export function parseExpression(input) {
  const tokens = tokenize(input);
  return parse(tokens);
}
