const T = {
  NUM: 'NUM', PLUS: 'PLUS', MINUS: 'MINUS',
  MUL: 'MUL', DIV: 'DIV', POW: 'POW',
  EQ: 'EQ',
  LPAREN: 'LPAREN', RPAREN: 'RPAREN',
  VAR: 'VAR', EOF: 'EOF'
};

// ---- 预处理：支持 y 在等号任意侧 ----
function preprocess(input) {
  const eqIdx = input.indexOf('=');
  if (eqIdx === -1) return input;

  if (eqIdx === 0) return input.slice(1).trim();

  let left = input.slice(0, eqIdx).trim();
  let right = input.slice(eqIdx + 1).trim();

  console.log('[parser] equation detected:', left, '=', right);

  // ★ 新增：如果 y 在右边，交换
  const leftHasY = /(^|[^a-zA-Z])y([^a-zA-Z]|$)/.test(left);
  const rightHasY = /(^|[^a-zA-Z])y([^a-zA-Z]|$)/.test(right);

  if (!leftHasY && !rightHasY) {
    // 没有 y，走原逻辑（当作 y = ... 处理）
    console.log('[parser] no y found, treating as y = 0');
    return input;
  }

  if (!leftHasY && rightHasY) {
    // y 在右侧，交换
    console.log('[parser] y on right side, swapping');
    [left, right] = [right, left];
  }

  // 此时 y 一定在 left
  if (/^\s*y\s*$/.test(left)) {
    console.log('[parser] simple y = f(x), RHS:', right);
    return right;
  }

  // 走原有移项逻辑
  const result = isolateY(left, right);
  console.log('[parser] isolated y =', result);
  return result;
}

// ---- 移项（原有逻辑完整保留）----
function isolateY(left, right) {
  const tokens = tokenizeForY(left);
  let i = 0;
  let yCoeff = 0;

  while (i < tokens.length) {
    const t = tokens[i];

    if (t.type === T.VAR && t.value === 'y') {
      let coeff = 1;
      if (i > 0 && tokens[i - 1].type === T.NUM) {
        coeff = parseFloat(tokens[i - 1].value);
        if (i > 1 && tokens[i - 2].type === T.MINUS) coeff = -coeff;
      } else if (i > 0 && tokens[i - 1].type === T.MINUS) {
        coeff = -1;
      }
      yCoeff += coeff;

      if (i > 0 && tokens[i - 1].type === T.NUM) {
        if (i > 1 && tokens[i - 2].type === T.MINUS) {
          tokens.splice(i - 2, 3, { type: T.NUM, value: '0' });
          i -= 2;
        } else {
          tokens.splice(i - 1, 2, { type: T.NUM, value: '0' });
          i--;
        }
      } else if (i > 0 && tokens[i - 1].type === T.MINUS) {
        tokens.splice(i - 1, 2, { type: T.NUM, value: '0' });
        i--;
      } else {
        tokens.splice(i, 1, { type: T.NUM, value: '0' });
      }
    } else {
      i++;
    }
  }

  const remainder = tokens.filter(t => t.type !== T.EOF).map(t => {
    switch (t.type) {
      case T.NUM: return t.value;
      case T.PLUS: return '+';
      case T.MINUS: return '-';
      case T.MUL: return '*';
      case T.DIV: return '/';
      case T.POW: return '^';
      case T.LPAREN: return '(';
      case T.RPAREN: return ')';
      default: return '';
    }
  }).join('');

  if (yCoeff === 0) {
    throw new Error('No y term found in equation');
  }

  const rhs = right || '0';
  let expr;

  if (remainder === '0' || remainder === '') {
    expr = `(${rhs}) / ${yCoeff}`;
  } else {
    expr = `(${rhs} - (${remainder})) / ${yCoeff}`;
  }

  console.log(`[parser] yCoeff=${yCoeff}, remainder="${remainder}", expr="${expr}"`);
  return expr;
}

function tokenizeForY(input) {
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
      case '=': tokens.push({ type: T.EQ }); i++; break;
      case '(': tokens.push({ type: T.LPAREN }); i++; break;
      case ')': tokens.push({ type: T.RPAREN }); i++; break;
      case 'x':
      case 'y':
        tokens.push({ type: T.VAR, value: c });
        i++;
        break;
      default:
        i++;
    }
  }

  tokens.push({ type: T.EOF });
  return tokens;
}

// ---- Tokenize（主入口，含隐式乘法补全）----
function tokenize(input) {
  const s = preprocess(input);
  console.log('[parser] preprocessed:', s);

  const tokens = [];
  let i = 0;
  const str = s.replace(/\s+/g, '');

  while (i < str.length) {
    const c = str[i];

    if (c >= '0' && c <= '9' || c === '.') {
      let num = '';
      let dots = 0;
      while (i < str.length && (str[i] >= '0' && str[i] <= '9' || str[i] === '.')) {
        if (str[i] === '.') dots++;
        num += str[i++];
      }
      if (dots > 1) throw new Error(`Invalid number: ${num}`);
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
        if (i < str.length) {
          const next = str[i];
          if (next >= '0' && next <= '9' || next === '(' || next === 'x' || next === 'y') {
            tokens.push({ type: T.MUL });
          }
        }
        break;
      default:
        throw new Error(`Unrecognized character: "${c}"`);
    }
  }

  // 隐式乘法补全
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
  console.log('[parser] tokens:', tokens.filter(t => t.type !== T.EOF).map(t => t.type === T.NUM || t.type === T.VAR ? `${t.type}:${t.value}` : t.type));
  return tokens;
}

// ---- Pratt Parser（完整保留）----
function parse(tokens) {
  let pos = 0;

  function peek() { return tokens[pos]; }
  function advance() { return tokens[pos++]; }

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
        if (next.type !== T.RPAREN) throw new Error('Missing closing parenthesis');
        return expr;
      }
      default:
        throw new Error(`Unexpected token: ${tok.type}`);
    }
  }

  const ast = parseExpr();
  if (peek().type !== T.EOF) throw new Error('Expression not fully parsed');
  console.log('[parser] AST:', JSON.stringify(ast, null, 2));
  return ast;
}

export function parseExpression(input) {
  console.log('[parser] input:', input);
  const tokens = tokenize(input);
  return parse(tokens);
}
