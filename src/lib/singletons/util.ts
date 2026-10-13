import natsort from 'natsort';
import { Hash } from '@/karabo/data/api';

const _DELIMITER = 'Details:\n';

export function sortTopologyServersByHost(servers: Hash): Hash {
  const entries = [...servers.iterall()];
  const compare = natsort();
  entries.sort((a, b) =>
    compare(a[2].findValue('host') ?? '', b[2].findValue('host') ?? '')
  );
  const sorted = new Hash();
  for (const [id, value, attributes] of entries) {
    sorted.setElement(id, value, attributes);
  }
  return sorted;
}

export function get_reason_parts(msg: string): [string, string | undefined] {
  const splitted = msg.split(_DELIMITER, 2);
  if (splitted.length === 2) {
    return [splitted[0], splitted[1]];
  }
  return [msg, undefined];
}
