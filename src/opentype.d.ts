// Minimal declarations for the subset of opentype.js 2.0 used by the type engine.
declare module 'opentype.js' {
  interface Path {
    toPathData(options?: number | { decimalPlaces?: number; optimize?: boolean; flipY?: boolean }): string;
  }
  interface Glyph {
    index: number;
    advanceWidth?: number;
    getPath(x: number, y: number, fontSize: number): Path;
  }
  interface Font {
    unitsPerEm: number;
    tables: Record<string, unknown>;
    charToGlyph(char: string): Glyph;
  }
  const opentype: { parse(buffer: ArrayBuffer): Font };
  export default opentype;
  export type { Font, Glyph, Path };
}
