/**
 * warnOnce — report a scene problem once per key, not once per element.
 *
 * Scenes repeat the same unsupported widget or tag dozens of times, so an
 * unguarded warning is noise the reader learns to ignore. Anything a scene
 * silently drops should still say so exactly once.
 */

const warned = new Set<string>();

export function warnOnce(key: string, message: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(message);
}
