import { DbItemInfo } from '../../karabo_data/ProjectDbInfo';
import { makeHash } from 'karabo-ts';

const PROJECT_DB_DEVICE_ID = 'KaraboProjectDB';
const REQUEST_GENERIC_TYPE = 'requestGeneric';
const SLOT_GENERIC_REQUEST = 'slotGenericRequest';

export const buildListDomainsHash = () => {
  return makeHash({
    type: REQUEST_GENERIC_TYPE,
    args: {
      type: 'listDomains',
    },
    empty: true,
    timeout: 10,
    instanceId: PROJECT_DB_DEVICE_ID,
    slot: SLOT_GENERIC_REQUEST,
    replyType: 'projectListDomains',
  });
};

export const buildListProjectsHash = (domain: string) => {
  return makeHash({
    type: REQUEST_GENERIC_TYPE,
    args: {
      type: 'listItems',
      domain: domain,
      item_types: ['project'],
    },
    // false causes the GUI Server to echo back the request parameters, from where the domain will be extracted
    empty: false,
    timeout: 10,
    instanceId: PROJECT_DB_DEVICE_ID,
    slot: SLOT_GENERIC_REQUEST,
    replyType: 'projectListItems',
  });
};

export const buildLoadItemsHash = (items: DbItemInfo[]) => {
  return makeHash({
    type: REQUEST_GENERIC_TYPE,
    args: {
      type: 'loadItems',
      items: items,
    },
    empty: false,
    timeout: 10,
    instanceId: PROJECT_DB_DEVICE_ID,
    slot: SLOT_GENERIC_REQUEST,
    replyType: 'projectLoadItems',
  });
};
