import { DbItemInfo } from "../../karabo_data/ProjectDbInfo";
import { Hash, HashTypes, HashValue, String, VectorHash } from "../types";

const DB_TOKEN = "admin";
const PROJECT_DB_DEVICE_ID = "KaraboProjectDB";
const REQUEST_GENERIC_TYPE = "requestGeneric";
const SLOT_GENERIC_REQUEST = "slotGenericRequest";

export const buildBeginUserSessionHash = () => {
  const hashVal: HashValue = {};
  const hashArgsVal: HashValue = {};
  hashVal.type = {
    value: { type_: HashTypes.String, value_: REQUEST_GENERIC_TYPE },
    attrs: {},
  };
  hashArgsVal.token = {
    value: { type_: HashTypes.String, value_: DB_TOKEN },
    attrs: {},
  };
  hashArgsVal.type = {
    value: { type_: HashTypes.String, value_: "beginUserSession" },
    attrs: {},
  };
  hashVal.args = {
    value: { type_: HashTypes.Hash, value_: new Hash(hashArgsVal) },
    attrs: {},
  };
  hashVal.empty = {
    value: { type_: HashTypes.Bool, value_: false },
    attrs: {},
  };
  hashVal.timeout = {
    value: { type_: HashTypes.Int32, value_: 10 },
    attrs: {},
  };
  hashVal.instanceId = {
    value: { type_: HashTypes.String, value_: PROJECT_DB_DEVICE_ID },
    attrs: {},
  };
  hashVal.slot = {
    value: { type_: HashTypes.String, value_: SLOT_GENERIC_REQUEST },
    attrs: {},
  };
  hashVal.replyType = {
    value: { type_: HashTypes.String, value_: "projectBeginUserSession" },
    attrs: {},
  };

  return new Hash(hashVal);
};

export const buildListDomainsHash = () => {
  const hashVal: HashValue = {};
  const hashArgsVal: HashValue = {};
  hashVal.type = {
    value: { type_: HashTypes.String, value_: REQUEST_GENERIC_TYPE },
    attrs: {},
  };
  hashArgsVal.token = {
    value: { type_: HashTypes.String, value_: DB_TOKEN },
    attrs: {},
  };
  hashArgsVal.type = {
    value: { type_: HashTypes.String, value_: "listDomains" },
    attrs: {},
  };
  hashVal.args = {
    value: { type_: HashTypes.Hash, value_: new Hash(hashArgsVal) },
    attrs: {},
  };
  hashVal.empty = {
    value: { type_: HashTypes.Bool, value_: true },
    attrs: {},
  };
  hashVal.timeout = {
    value: { type_: HashTypes.Int32, value_: 10 },
    attrs: {},
  };
  hashVal.instanceId = {
    value: { type_: HashTypes.String, value_: PROJECT_DB_DEVICE_ID },
    attrs: {},
  };
  hashVal.slot = {
    value: { type_: HashTypes.String, value_: SLOT_GENERIC_REQUEST },
    attrs: {},
  };
  hashVal.replyType = {
    value: { type_: HashTypes.String, value_: "projectListDomains" },
    attrs: {},
  };

  return new Hash(hashVal);
};

export const buildListProjectsHash = (domain: string) => {
  const hashVal: HashValue = {};
  const hashArgsVal: HashValue = {};
  hashVal.type = {
    value: { type_: HashTypes.String, value_: REQUEST_GENERIC_TYPE },
    attrs: {},
  };
  hashArgsVal.token = {
    value: { type_: HashTypes.String, value_: DB_TOKEN },
    attrs: {},
  };
  hashArgsVal.type = {
    value: { type_: HashTypes.String, value_: "listItems" },
    attrs: {},
  };
  hashArgsVal.domain = {
    value: { type_: HashTypes.String, value_: domain },
    attrs: {},
  };
  hashArgsVal.item_types = {
    value: { type_: HashTypes.VectorString, value_: ["project"] },
    attrs: {},
  };
  hashVal.args = {
    value: { type_: HashTypes.Hash, value_: new Hash(hashArgsVal) },
    attrs: {},
  };
  hashVal.empty = {
    // false causes the GUI Server to echo back the request parameters, from where the domain will be extracted
    value: { type_: HashTypes.Bool, value_: false },
    attrs: {},
  };
  hashVal.timeout = {
    value: { type_: HashTypes.Int32, value_: 10 },
    attrs: {},
  };
  hashVal.instanceId = {
    value: { type_: HashTypes.String, value_: PROJECT_DB_DEVICE_ID },
    attrs: {},
  };
  hashVal.slot = {
    value: { type_: HashTypes.String, value_: SLOT_GENERIC_REQUEST },
    attrs: {},
  };
  hashVal.replyType = {
    value: { type_: HashTypes.String, value_: "projectListItems" },
    attrs: {},
  };

  return new Hash(hashVal);
};

export const buildLoadItemsHash = (items: DbItemInfo[]) => {
  const hashVal: HashValue = {};
  hashVal.type = {
    value: { type_: HashTypes.String, value_: REQUEST_GENERIC_TYPE },
    attrs: {},
  };
  const hashItemsVal: HashValue[] = [];
  for (const item of items) {
    const hashItemVal: HashValue = {};
    hashItemVal.domain = {
      value: { type_: HashTypes.String, value_: item.domain },
      attrs: {},
    };
    hashItemVal.uuid = {
      value: new String(item.uuid),
      attrs: {},
    };
    hashItemsVal.push(hashItemVal);
  }
  const hashArgsVal: HashValue = {};
  hashArgsVal.items = {
    value: new VectorHash(hashItemsVal),
    attrs: {},
  };
  hashArgsVal.token = {
    value: { type_: HashTypes.String, value_: DB_TOKEN },
    attrs: {},
  };
  hashArgsVal.type = {
    value: { type_: HashTypes.String, value_: "loadItems" },
    attrs: {},
  };
  hashVal.args = {
    value: { type_: HashTypes.Hash, value_: new Hash(hashArgsVal) },
    attrs: {},
  };
  hashVal.empty = {
    value: { type_: HashTypes.Bool, value_: true },
    attrs: {},
  };
  hashVal.timeout = {
    value: { type_: HashTypes.Int32, value_: 10 },
    attrs: {},
  };
  hashVal.instanceId = {
    value: { type_: HashTypes.String, value_: PROJECT_DB_DEVICE_ID },
    attrs: {},
  };
  hashVal.slot = {
    value: { type_: HashTypes.String, value_: SLOT_GENERIC_REQUEST },
    attrs: {},
  };
  hashVal.replyType = {
    value: { type_: HashTypes.String, value_: "projectLoadItems" },
    attrs: {},
  };

  return new Hash(hashVal);
};
