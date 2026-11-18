// 分数系统 —— 避免浮点误差
// Frac(numerator, denominator)

export class Frac {
  constructor(num, den = 1) {
    if (den === 0) throw new Error('分母不能为零');
    const g = gcd(Math.abs(num), Math.abs(den));
    this.num = (den < 0 ? -num : num) / g;
    this.den = Math.abs(den) / g;
  }

  add(other) {
    const o = toFrac(other);
    return new Frac(
      this.num * o.den + o.num * this.den,
      this.den * o.den
    );
  }

  sub(other) {
    const o = toFrac(other);
    return new Frac(
      this.num * o.den - o.num * this.den,
      this.den * o.den
    );
  }

  mul(other) {
    const o = toFrac(other);
    return new Frac(this.num * o.num, this.den * o.den);
  }

  div(other) {
    const o = toFrac(other);
    return new Frac(this.num * o.den, this.den * o.num);
  }

  pow(n) {
    if (Number.isInteger(n)) {
      return new Frac(this.num ** n, this.den ** n);
    }
    // 非整数次幂退化为浮点
    return Math.pow(this.toNumber(), n);
  }

  toNumber() {
    return this.num / this.den;
  }

  toString() {
    if (this.den === 1) return String(this.num);
    return `${this.num}/${this.den}`;
  }
}

export function toFrac(val) {
  if (val instanceof Frac) return val;
  if (Number.isInteger(val)) return new Frac(val, 1);
  // 小数 → 分数
  return decimalToFrac(val);
}

export function decimalToFrac(dec, maxDen = 1000000) {
  if (Number.isInteger(dec)) return new Frac(dec, 1);

  const sign = dec < 0 ? -1 : 1;
  dec = Math.abs(dec);

  let bestNum = 1, bestDen = 1;
  let bestErr = Math.abs(dec - 1);

  for (let den = 1; den <= maxDen; den++) {
    const num = Math.round(dec * den);
    const err = Math.abs(dec - num / den);
    if (err < bestErr) {
      bestErr = err;
      bestNum = num;
      bestDen = den;
    }
    if (bestErr < 1e-12) break;
  }

  return new Frac(sign * bestNum, bestDen);
}

function gcd(a, b) {
  while (b) { [a, b] = [b, a % b]; }
  return a;
}
