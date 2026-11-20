const T = {
  NUM: 'NUM', PLUS: 'PLUS', MINUS: 'MINUS',
  MUL: 'MUL', DIV: 'DIV', POW: 'POW',
  EQ: 'EQ',
  LPAREN: 'LPAREN', RPAREN: 'RPAREN',
  VAR: 'VAR', EOF: 'EOF'
};

function preprocess(input) {
  const eqIdx = input.indexOf('=');
  if (eqIdx === -1) return input;
  if (eqIdx === 0) return input.slice(1).trim();
  let left = input.slice(0, eqIdx).trim();
  let right = input.slice(eqIdx + 1).trim();
  const leftHasY = /(^|[^a-zA-Z])y([^a-zA-Z]|$)/.test(left);
  const rightHasY = /(^|[^a-zA-Z])y([^a-zA-Z]|$)/.test(right);
  if (!leftHasY && !rightHasY) return input;
  if (!leftHasY && rightHasY) {
    [left, right] = [right, left];
  }
  if (/^\s*y\s*$/.test(left)) return right;
  return isolateY(left, right);
}

function isolateY(left, right) {
  const tokens = tokenizeForY(left);
  let i = 0, yCoeff = 0;
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
  if (yCoeff === 0) throw new Error('No y term found in equation');
  const rhs = right || '0';
  let expr;
  if (remainder === '0' || remainder === '') {
    expr = `(${rhs}) / ${yCoeff}`;
  } else {
    expr = `(${rhs} - (${remainder})) / ${yCoeff}`;
  }
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
      while (i < s.length && (s[i] >= '0' && s[i] <= '9' || s[i] === '.')) {
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
        tokens.push({ type: T.VAR, value: c }); i++;
        break;
      default: i++;
    }
  }
  // ✅ 隐式乘号补全
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

function tokenize(input) {
  const s = preprocess(input);
  const tokens = [];
  let i = 0;
  const str = s.replace(/\s+/g, '');
  while (i < str.length) {
    const c = str[i];
    if (c >= '0' && c <= '9' || c === '.') {
      let num = '';
      while (i < str.length && (str[i] >= '0' && str[i] <= '9' || str[i] === '.')) {
        num += str[i++];
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
      case '(': tokens.push({ type: T.LPAREN }); i++; break;
      case ')': tokens.push({ type: T.RPAREN }); i++; break;
      case 'x':
      case 'y':
        tokens.push({ type: T.VAR, value: c }); i++;
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
  return parseExpr();
}

export function parseExpression(input) {
  const tokens = tokenize(input);
  return parse(tokens);
}

export function parseEquationAST(input) {
  const s = input.replace(/\s+/g, '');
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c >= '0' && c <= '9' || c === '.') {
      let num = '';
      while (i < s.length && (s[i] >= '0' && s[i] <= '9' || s[i] === '.')) num += s[i++];
      tokens.push({ type: T.NUM, value: num });
      continue;
    }
    switch (c) {
      case '+': tokens.push({ type: T.PLUS }); i++; break;
      case '-': tokens.push({ type: T.MINUS }); i++; break;
      case '*': tokens.push({ type: T.MUL }); i++; break;
      case '/': tokens.push({ type: T.DIV }); i++; break;
      case '^': tokens.push({ type: T.POW }); i++; break;
      case '=': tokens.push({ type: T.EQ }); i++; break;
      case '(': tokens.push({ type: T.LPAREN }); i++; break;
      case ')': tokens.push({ type: T.RPAREN }); i++; break;
      case 'x':
      case 'y':
        tokens.push({ type: T.VAR, value: c }); i++;
        break;
      default: i++;
    }
  }
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
  let eqIdx = -1;
  for (let k = 0; k < tokens.length; k++) {
    if (tokens[k].type === T.EQ) { eqIdx = k; break; }
  }
  if (eqIdx === -1) {
    return parse(tokens);
  }
  const leftTokens = tokens.slice(0, eqIdx);
  const rightTokens = tokens.slice(eqIdx + 1, tokens.length - 1);
  function parseSide(tks) {
    let p = 0;
    function adv() { return tks[p++]; }
    function peek2() { return tks[p]; }
    function parseExpr2(minPrec = 0) {
      let left = parsePrefix2();
      while (peek2() && peek2().type !== T.EOF && peek2().type !== T.RPAREN) {
        const op = peek2();
        const prec = { [T.PLUS]: 1, [T.MINUS]: 1, [T.MUL]: 2, [T.DIV]: 2, [T.POW]: 3 }[op.type];
        if (prec == null || prec < minPrec) break;
        adv();
        const nextMin = op.type === T.POW ? prec : prec + 1;
        const right = parseExpr2(nextMin);
        left = { type: 'Binary', op: op.type, left, right };
      }
      return left;
    }
    function parsePrefix2() {
      const tok = adv();
      switch (tok.type) {
        case T.NUM: return { type: 'Num', value: tok.value };
        case T.VAR: return { type: 'Var', name: tok.value };
        case T.MINUS: return { type: 'Unary', op: 'MINUS', expr: parsePrefix2() };
        case T.LPAREN: {
          const e = parseExpr2();
          if (adv().type !== T.RPAREN) throw new Error('Missing )');
          return e;
        }
        default: throw new Error('Unexpected');
      }
    }
    return parseExpr2();
  }
  return {
    type: 'Binary',
    op: 'EQ',
    left: parseSide(leftTokens),
    right: parseSide(rightTokens)
  };
}
