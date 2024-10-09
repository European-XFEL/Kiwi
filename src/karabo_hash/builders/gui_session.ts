import { Hash, makeHash } from "karabo-ts";

export const buildLoginHash = (
  clientId: string,
  version: string,
  oneTimeToken?: string,
  clientUserId?: string
): Hash => {
  return makeHash({
    type: "login",
    clientId: clientId,
    version: version,
    ...(oneTimeToken && { oneTimeToken: oneTimeToken }),
    ...(clientUserId && { clientUserId: clientUserId }),
  });
}
