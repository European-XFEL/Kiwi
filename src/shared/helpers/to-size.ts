export const toSize = (v: unknown, fallback: string) =>
  typeof v === 'number'
    ? `${v}px`
    : typeof v === 'string' && v.trim()
      ? v
      : fallback;
