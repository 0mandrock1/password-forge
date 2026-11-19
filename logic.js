export const LOWER = 'abcdefghijklmnopqrstuvwxyz';
export const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const DIGITS = '0123456789';
export const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?/';
export const AMBIGUOUS = new Set('Il1O0o|');
export const ATTACK_RATE = 1e10;
export const PHRASE_SYMBOLS = '!@#$%^&*+?=';

export function secureInt(max, cryptoSource = globalThis.crypto) {
  if (!Number.isSafeInteger(max) || max <= 0 || max > 4294967296) throw new RangeError('invalid random bound');
  if (!cryptoSource?.getRandomValues) throw new Error('Secure randomness unavailable');
  const range = 4294967296;
  const limit = Math.floor(range / max) * max;
  const buf = new Uint32Array(1);
  do { cryptoSource.getRandomValues(buf); } while (buf[0] >= limit);
  return buf[0] % max;
}

export function activeSets(opts) {
  const sets = [];
  if (opts.lower) sets.push(LOWER);
  if (opts.upper) sets.push(UPPER);
  if (opts.digits) sets.push(DIGITS);
  if (opts.symbols) sets.push(SYMBOLS);
  return opts.unambiguous ? sets.map(s => [...s].filter(c => !AMBIGUOUS.has(c)).join('')) : sets;
}

export function randomPassword(opts, cryptoSource = globalThis.crypto) {
  const { length } = opts;
  if (!Number.isInteger(length) || length < 8 || length > 128) throw new RangeError('length: 8..128');
  const sets = activeSets(opts).filter(Boolean);
  if (!sets.length) throw new Error('Select a character set');
  const pool = sets.join('');
  for (let attempt = 0; attempt < 10000; attempt++) {
    let candidate = '';
    for (let i = 0; i < length; i++) candidate += pool[secureInt(pool.length, cryptoSource)];
    if (sets.every(set => [...candidate].some(ch => set.includes(ch)))) return candidate;
  }
  throw new Error('Could not satisfy chosen constraints');
}

export function randomPhrase(words, count, separator = '-', cryptoSource = globalThis.crypto, options = {}) {
  if (!Array.isArray(words) || words.length < 1000 || !words.every(w => /^[a-z]+$/.test(w))) throw new Error('Invalid dictionary');
  if (!Number.isInteger(count) || count < 4 || count > 12) throw new RangeError('words: 4..12');
  if (!['-', ' ', '.', '_'].includes(separator)) throw new Error('Invalid separator');

  const selected = Array.from({ length: count }, () => words[secureInt(words.length, cryptoSource)]);

  // Non-zero capitalization mask: every enabled output has >=1 capitalized word.
  // Each mask is equiprobable; no extra entropy is claimed for deterministic casing.
  if (options.uppercase) {
    const mask = 1 + secureInt(2 ** count - 1, cryptoSource);
    for (let i = 0; i < count; i++) {
      if (mask & (1 << i)) selected[i] = selected[i][0].toUpperCase() + selected[i].slice(1);
    }
  }
  // Stable, non-overlapping suffix positions allow exact output-count accounting.
  let result = selected.join(separator);
  if (options.digits) {
    result += DIGITS[secureInt(10, cryptoSource)] + DIGITS[secureInt(10, cryptoSource)];
  }
  if (options.symbols) result += PHRASE_SYMBOLS[secureInt(PHRASE_SYMBOLS.length, cryptoSource)];
  return result;
}

export function characterEntropy(opts) {
  const sets = activeSets(opts).filter(Boolean);
  if (!sets.length || opts.length < sets.length) return 0;
  const total = sets.join('').length;
  let probability = 0;
  for (let mask = 0; mask < (1 << sets.length); mask++) {
    let excluded = 0, bits = 0;
    for (let j = 0; j < sets.length; j++) if (mask & (1 << j)) {
      excluded += sets[j].length;
      bits++;
    }
    probability += (bits % 2 ? -1 : 1) * Math.pow((total - excluded) / total, opts.length);
  }
  return opts.length * Math.log2(total) + Math.log2(Math.max(Number.MIN_VALUE, probability));
}

export function phraseEntropy(dictionarySize, count, options = {}) {
  if (dictionarySize < 2 || count < 1) return 0;
  const wordsBits = count * Math.log2(dictionarySize);
  const capitalizationBits = options.uppercase ? Math.log2(2 ** count - 1) : 0;
  const digitsBits = options.digits ? Math.log2(100) : 0;
  const symbolsBits = options.symbols ? Math.log2(PHRASE_SYMBOLS.length) : 0;
  return wordsBits + capitalizationBits + digitsBits + symbolsBits;
}

export function estimateSeconds(bits, rate = ATTACK_RATE) {
  return Math.pow(2, bits - 1) / rate;
}

export function strength(bits) {
  if (bits < 40) return { grade: 0, text: 'Слабкий', status: 'weak' };
  if (bits < 64) return { grade: 1, text: 'Помірний', status: 'moderate' };
  if (bits < 80) return { grade: 2, text: 'Сильний', status: 'strong' };
  return { grade: 3, text: 'Дуже сильний', status: 'excellent' };
}

export function humanTime(seconds) {
  if (seconds < 1) return 'менше секунди';
  const units = [
    [31557600 * 1e9, 'млрд років'],
    [31557600 * 1e6, 'млн років'],
    [31557600 * 1e3, 'тис. років'],
    [31557600, 'років'],
    [86400, 'днів'],
    [3600, 'годин'],
    [60, 'хвилин'],
    [1, 'секунд']
  ];
  if (!Number.isFinite(seconds)) return 'практично необмежено';
  for (const [unit, label] of units) {
    if (seconds >= unit) {
      const n = seconds / unit;
      return (n >= 100 ? Math.round(n).toLocaleString('uk-UA') : n >= 10 ? n.toFixed(0) : n.toFixed(1)) + ' ' + label;
    }
  }
  return 'менше секунди';
}
