import { Hash, HashTypes, HashValue } from "../types";

export const buildLoginHash = (
  clientId: string,
  version: string,
  oneTimeToken?: string,
  clientUserId?: string
): Hash => {
  const hashVal: HashValue = {};

  hashVal.type = {
    value: { type_: HashTypes.String, value_: "login" },
    attrs: {},
  };
  hashVal.clientId = {
    value: { type_: HashTypes.String, value_: clientId },
    attrs: {},
  };
  hashVal.version = {
    value: { type_: HashTypes.String, value_: version },
    attrs: {},
  };
  if (oneTimeToken) {
    hashVal.oneTimeToken = {
      value: { type_: HashTypes.String, value_: oneTimeToken },
      attrs: {},
    };
  }
  if (clientUserId) {
    hashVal.clientUserId = {
      value: { type_: HashTypes.String, value_: clientUserId },
      attrs: {},
    };
  }

  return new Hash(hashVal);
};
