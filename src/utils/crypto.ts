/**
 * Simple character-shift cipher utility.
 * Encrypts ALL characters (not just letters) for better security.
 * Uses base64 encoding to ensure storage-safe output.
 */

const DEFAULT_KEYWORD = 'karabo';

function vigenereShift(char: string, keyChar: string, decrypt = false): string {
  const charCode = char.charCodeAt(0);
  const keyCode = keyChar.charCodeAt(0);

  // Use full ASCII range (0-255) for shifting
  let shift = keyCode % 256;
  if (decrypt) shift = -shift;

  // Apply shift with proper wrapping for negative values
  const shifted = (((charCode + shift) % 256) + 256) % 256;
  return String.fromCharCode(shifted);
}

function expandKeyword(keyword: string, length: number): string {
  const kw = keyword && keyword.length > 0 ? keyword : DEFAULT_KEYWORD;
  return kw.repeat(Math.floor(length / kw.length) + 1).slice(0, length);
}

// Base64 encoding/decoding for storage-safe output
function toBase64(str: string): string {
  // Convert to base64 using browser's btoa (safe for binary strings)
  return btoa(
    str
      .split('')
      .map((c) => String.fromCharCode(c.charCodeAt(0)))
      .join('')
  );
}

function fromBase64(base64: string): string {
  // Decode base64 using browser's atob
  return atob(base64);
}

export function encryptData(
  text: string,
  keyword: string = DEFAULT_KEYWORD
): string {
  if (!text) return '';
  const repeatedKey = expandKeyword(keyword, text.length);

  let encrypted = '';
  for (let i = 0; i < text.length; i++) {
    encrypted += vigenereShift(text[i], repeatedKey[i], false);
  }

  // Base64 encode to make storage-safe
  return toBase64(encrypted);
}

export function decryptData(
  text: string,
  keyword: string = DEFAULT_KEYWORD
): string {
  if (!text) return '';

  // Base64 decode first
  let encrypted: string;
  try {
    encrypted = fromBase64(text);
  } catch (err) {
    throw new Error('Invalid encrypted data: not valid base64');
  }

  const repeatedKey = expandKeyword(keyword, encrypted.length);

  let decrypted = '';
  for (let i = 0; i < encrypted.length; i++) {
    decrypted += vigenereShift(encrypted[i], repeatedKey[i], true);
  }
  return decrypted;
}
