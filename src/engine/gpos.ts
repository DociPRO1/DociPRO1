/**
 * Minimal GPOS pair-kerning reader.
 *
 * opentype.js does not resolve PairPos subtables wrapped in Extension lookups
 * (lookup type 9), which is exactly how IBM Plex ships its kerning. Display
 * typography at 100px+ looks visibly wrong without kerning, so this module
 * reads the raw GPOS table straight from the WOFF container and builds a
 * flat pair → x-advance-adjustment map.
 *
 * Supported: PairPos format 1 (pair sets) and format 2 (class pairs),
 * direct (type 2) or extension-wrapped (type 9 → 2). Only XAdvance of the
 * first value record is used, which is what horizontal kerning needs.
 */
import { inflateSync } from 'node:zlib';

type Reader = DataView;

/** Extract and decompress one table from a WOFF 1.0 file. */
export function woffTable(buf: Uint8Array, tag: string): DataView | null {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const signature = dv.getUint32(0);
  if (signature !== 0x774f4646) throw new Error('Not a WOFF 1.0 font');
  const numTables = dv.getUint16(12);
  for (let i = 0; i < numTables; i++) {
    const o = 44 + i * 20;
    const t = String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3));
    if (t !== tag) continue;
    const offset = dv.getUint32(o + 4);
    const compLength = dv.getUint32(o + 8);
    const origLength = dv.getUint32(o + 12);
    const raw = buf.subarray(offset, offset + compLength);
    const data = compLength === origLength ? raw : inflateSync(raw);
    return new DataView(data.buffer, data.byteOffset, data.byteLength);
  }
  return null;
}

function coverage(r: Reader, off: number): number[] {
  const format = r.getUint16(off);
  const glyphs: number[] = [];
  if (format === 1) {
    const n = r.getUint16(off + 2);
    for (let i = 0; i < n; i++) glyphs.push(r.getUint16(off + 4 + i * 2));
  } else if (format === 2) {
    const n = r.getUint16(off + 2);
    for (let i = 0; i < n; i++) {
      const p = off + 4 + i * 6;
      const start = r.getUint16(p);
      const end = r.getUint16(p + 2);
      for (let g = start; g <= end; g++) glyphs.push(g);
    }
  }
  return glyphs;
}

function classDef(r: Reader, off: number): Map<number, number> {
  const m = new Map<number, number>();
  const format = r.getUint16(off);
  if (format === 1) {
    const start = r.getUint16(off + 2);
    const n = r.getUint16(off + 4);
    for (let i = 0; i < n; i++) m.set(start + i, r.getUint16(off + 6 + i * 2));
  } else if (format === 2) {
    const n = r.getUint16(off + 2);
    for (let i = 0; i < n; i++) {
      const p = off + 4 + i * 6;
      const start = r.getUint16(p);
      const end = r.getUint16(p + 2);
      const cls = r.getUint16(p + 4);
      for (let g = start; g <= end; g++) m.set(g, cls);
    }
  }
  return m;
}

const popcount = (v: number) => {
  let c = 0;
  for (let x = v; x; x >>= 1) c += x & 1;
  return c;
};

/** Reads the XAdvance field from a value record if present. */
function xAdvance(r: Reader, off: number, format: number): number {
  if (!(format & 0x0004)) return 0;
  let p = off;
  if (format & 0x0001) p += 2;
  if (format & 0x0002) p += 2;
  return r.getInt16(p);
}

function pairPos(r: Reader, off: number, out: Map<number, number>, key: (a: number, b: number) => number) {
  const format = r.getUint16(off);
  const cov = coverage(r, off + r.getUint16(off + 2));
  const vf1 = r.getUint16(off + 4);
  const vf2 = r.getUint16(off + 6);
  const size1 = popcount(vf1) * 2;
  const size2 = popcount(vf2) * 2;

  if (format === 1) {
    const setCount = r.getUint16(off + 8);
    for (let i = 0; i < setCount && i < cov.length; i++) {
      const setOff = off + r.getUint16(off + 10 + i * 2);
      const pairCount = r.getUint16(setOff);
      for (let j = 0; j < pairCount; j++) {
        const rec = setOff + 2 + j * (2 + size1 + size2);
        const second = r.getUint16(rec);
        const v = xAdvance(r, rec + 2, vf1);
        const k = key(cov[i]!, second);
        if (v !== 0 && !out.has(k)) out.set(k, v);
      }
    }
  } else if (format === 2) {
    const cd1 = classDef(r, off + r.getUint16(off + 8));
    const cd2 = classDef(r, off + r.getUint16(off + 10));
    const c1Count = r.getUint16(off + 12);
    const c2Count = r.getUint16(off + 14);
    const recSize = size1 + size2;
    // Invert class 2 so we can enumerate its glyphs.
    const byClass2 = new Map<number, number[]>();
    for (const [g, c] of cd2) {
      if (!byClass2.has(c)) byClass2.set(c, []);
      byClass2.get(c)!.push(g);
    }
    for (const first of cov) {
      const c1 = cd1.get(first) ?? 0;
      if (c1 >= c1Count) continue;
      for (let c2 = 1; c2 < c2Count; c2++) {
        const rec = off + 16 + (c1 * c2Count + c2) * recSize;
        const v = xAdvance(r, rec, vf1);
        if (v === 0) continue;
        for (const second of byClass2.get(c2) ?? []) {
          const k = key(first, second);
          if (!out.has(k)) out.set(k, v);
        }
      }
    }
  }
}

/** Builds a kerning lookup function from a WOFF font's GPOS table. */
export function readKerning(buf: Uint8Array): (left: number, right: number) => number {
  const r = woffTable(buf, 'GPOS');
  const pairs = new Map<number, number>();
  const key = (a: number, b: number) => a * 65536 + b;
  if (r) {
    const lookupList = r.getUint16(8);
    const n = r.getUint16(lookupList);
    for (let i = 0; i < n; i++) {
      const lo = lookupList + r.getUint16(lookupList + 2 + i * 2);
      const type = r.getUint16(lo);
      const subCount = r.getUint16(lo + 4);
      for (let s = 0; s < subCount; s++) {
        const so = lo + r.getUint16(lo + 6 + s * 2);
        if (type === 2) pairPos(r, so, pairs, key);
        else if (type === 9 && r.getUint16(so + 2) === 2) pairPos(r, so + r.getUint32(so + 4), pairs, key);
      }
    }
  }
  return (left, right) => pairs.get(key(left, right)) ?? 0;
}
