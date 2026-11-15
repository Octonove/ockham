// The words a request and a piece of code can have in common.
// A request says "prices" and the code says formatPrice: both must come out as "pric".

const STOP = new Set(`
a an and are as at be been but by can do does for from had has have how if in into is it its of on once
one only or so than that the their them then there these they this to too up was were what when where
which while who why will with without you your
el la los las un una unos unas de del al y o u que en con por para se su sus es son lo como mas no si ya
add make fix bug must should need now let use also each every get set new
`.trim().split(/\s+/));

// Words whose ending looks like a suffix and is not one.
const WHOLE = new Set(['customer', 'number', 'order', 'user', 'other', 'never', 'paper', 'water', 'center']);

const DOUBLED = /(bb|dd|gg|mm|nn|pp|rr|tt)$/;

/**
 * A word without its ending, so that the forms of a word meet: points and point,
 * validation and validate, shipping and ship. Crude on purpose: it has to be fast
 * and the same on both sides, not correct English.
 * @param {string} word  in lower case
 * @returns {string}
 */
export function stem(word) {
  let w = word;
  if (w.length < 4 || WHOLE.has(w)) return w;
  if (w.endsWith('ies')) w = `${w.slice(0, -3)}y`;
  else if (w.endsWith('sses')) w = w.slice(0, -2);
  else if (w.endsWith('s') && !/(ss|us|is)$/.test(w)) w = w.slice(0, -1);
  if (WHOLE.has(w)) return w;
  for (const ending of ['ations', 'ation', 'ators', 'ator', 'ating', 'ated', 'ables', 'able', 'ings', 'ing', 'ify', 'ed', 'er']) {
    if (w.endsWith(ending) && w.length - ending.length >= 3) {
      w = w.slice(0, -ending.length);
      if (DOUBLED.test(w)) w = w.slice(0, -1);
      break;
    }
  }
  if (w.length >= 8 && /i[sz]e$/.test(w)) w = w.slice(0, -3);
  if (w.length >= 6 && w.endsWith('ate')) w = w.slice(0, -3);
  if (w.length >= 5 && w.endsWith('e')) w = w.slice(0, -1);
  return w;
}

// Where a name written in one piece divides: parsePage, HTTPClient, sha256.
const INSIDE = /(?<=[\p{Ll}\p{N}])(?=\p{Lu})|(?<=\p{Lu})(?=\p{Lu}\p{Ll})|(?<=\p{L})(?=\p{N})|(?<=\p{N})(?=\p{L})/u;

/**
 * The words of a text or of a name, stemmed, in order, with the empty ones left out.
 * Numbers of two digits or more are kept: "20 per page" can find PAGE_SIZE = 20.
 * @param {string} text
 * @returns {string[]}
 */
export function words(text) {
  const out = [];
  for (const piece of String(text ?? '').split(/[^\p{L}\p{N}]+/u)) {
    for (const part of piece.split(INSIDE)) {
      if (!part) continue;
      if (/^\d+$/.test(part)) {
        if (part.length >= 2) out.push(part);
        continue;
      }
      const plain = part.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
      if (plain.length < 2 || STOP.has(plain)) continue;
      const word = stem(plain);
      if (!STOP.has(word)) out.push(word);
    }
  }
  return out;
}
