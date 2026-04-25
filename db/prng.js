/**
 * Deterministic PRNG used to seed per-session demo databases.
 *
 * Same `seed` → same sequence → same demo dataset. Different `seed` → different
 * dataset. That's how every demo visitor sees their own variety of alerts /
 * cases / rules without us shipping a static template.
 */

function hashSid(sid) {
  // FNV-1a 32-bit, simple and dependency-free
  let h = 0x811c9dc5;
  for (let i = 0; i < sid.length; i++) {
    h ^= sid.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(sid) {
  return mulberry32(hashSid(String(sid || 'default')));
}

module.exports = { hashSid, mulberry32, makeRng };
