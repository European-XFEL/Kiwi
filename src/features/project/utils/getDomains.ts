import { Hash } from '@/karabo/data/hash';

export const getDomains = (hash: Hash): string[] => {
  const reason = hash.getValue('reason');
  if (reason.length > 0) {
    throw new Error(reason);
  }
  return hash.getValue('reply.domains') as string[];
};
