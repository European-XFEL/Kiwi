export const getInitials = (text?: string): string => {
  if (!text) return '?';

  const trimmed = text.trim();
  const words = trimmed.split(/\s+/);

  if (words.length === 1) {
    return trimmed.charAt(0).toUpperCase();
  }

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
};
