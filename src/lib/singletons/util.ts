const _DELIMITER = '\Details:\n';

export function get_reason_parts(msg: string): [string, string | undefined] {
  const splitted = msg.split(_DELIMITER, 2);
  if (splitted.length === 2) {
    return [splitted[0], splitted[1]];
  }
  return [msg, undefined];
}
