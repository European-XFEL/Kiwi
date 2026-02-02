import { Hash } from '@/karabo-hash/hash';

export const buildLoginHash = (
  clientId: string,
  version: string,
  oneTimeToken?: string,
  clientUserId?: string
): Hash => {
  return new Hash({
    type: 'login',
    clientId: clientId,
    version: version,
    ...(oneTimeToken && { oneTimeToken: oneTimeToken }),
    ...(clientUserId && { clientUserId: clientUserId }),
  });
};
