// Pure RFC-4648 UTF-8 <-> Base64 utilities (zero Node Buffer polyfill, O(1) LUT)

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const DECODE_LUT = new Int8Array(128).fill(-1);
for (let i = 0; i < CHARS.length; i++) {
  DECODE_LUT[CHARS.charCodeAt(i)] = i;
}

export function encodeUtf8ToBase64(input: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }

  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triplet = (b0 << 16) | (b1 << 8) | b2;

    out += CHARS[(triplet >> 18) & 0x3f];
    out += CHARS[(triplet >> 12) & 0x3f];
    out += i + 1 < bytes.length ? CHARS[(triplet >> 6) & 0x3f] : '=';
    out += i + 2 < bytes.length ? CHARS[triplet & 0x3f] : '=';
  }
  return out;
}

export function decodeBase64ToUtf8(b64: string): string {
  const bytes: number[] = [];
  let q0 = -1;
  let q1 = -1;
  let q2 = -1;
  let count = 0;

  for (let i = 0; i < b64.length; i++) {
    const code = b64.charCodeAt(i);
    if (code === 61 /* '=' */) {
      if (count === 2) {
        bytes.push((q0 << 2) | (q1 >> 4));
      } else if (count === 3) {
        bytes.push((q0 << 2) | (q1 >> 4));
        bytes.push(((q1 & 0x0f) << 4) | (q2 >> 2));
      }
      count = 0;
      break;
    }
    if (code >= 128) continue;
    const val = DECODE_LUT[code];
    if (val < 0) continue;

    if (count === 0) {
      q0 = val;
      count = 1;
    } else if (count === 1) {
      q1 = val;
      count = 2;
    } else if (count === 2) {
      q2 = val;
      count = 3;
    } else {
      bytes.push((q0 << 2) | (q1 >> 4));
      bytes.push(((q1 & 0x0f) << 4) | (q2 >> 2));
      bytes.push(((q2 & 0x03) << 6) | val);
      count = 0;
    }
  }

  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b0 = bytes[i++];
    if (b0 < 0x80) {
      out += String.fromCharCode(b0);
    } else if ((b0 & 0xe0) === 0xc0 && i < bytes.length) {
      const b1 = bytes[i++];
      out += String.fromCharCode(((b0 & 0x1f) << 6) | (b1 & 0x3f));
    } else if ((b0 & 0xf0) === 0xe0 && i + 1 < bytes.length) {
      const b1 = bytes[i++];
      const b2 = bytes[i++];
      out += String.fromCharCode(((b0 & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f));
    }
  }
  return out;
}
