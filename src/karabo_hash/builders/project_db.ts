import { DbItemInfo } from '../../karabo_data/ProjectDbInfo';
import { Hash, HashList } from '@/karabo-hash/hash';

const PROJECT_DB_DEVICE_ID = 'KaraboProjectDB';
const REQUEST_GENERIC_TYPE = 'requestGeneric';
const SLOT_GENERIC_REQUEST = 'slotGenericRequest';

export const buildListDomainsHash = () => {
  const hash = new Hash({
    type: REQUEST_GENERIC_TYPE,
    empty: true,
    timeout: 10,
    instanceId: PROJECT_DB_DEVICE_ID,
    slot: SLOT_GENERIC_REQUEST,
    replyType: 'projectListDomains',
  });
  hash.set('args.type', 'listDomains');
  return hash;
};

export const buildListProjectsHash = (domain: string) => {
  return new Hash({
    type: REQUEST_GENERIC_TYPE,
    args: new Hash({
      type: 'listItems',
      domain: domain,
      item_types: ['project'],
    }),
    // false causes the GUI Server to echo back the request parameters, from where the domain will be extracted
    empty: false,
    timeout: 10,
    instanceId: PROJECT_DB_DEVICE_ID,
    slot: SLOT_GENERIC_REQUEST,
    replyType: 'projectListItems',
  });
};

export const buildLoadItemsHash = (items: DbItemInfo[]) => {
  let itemsHashes: Hash[] = [];
  for (const item of items) {
    const itemHash = new Hash({
      domain: item.domain,
      uuid: item.uuid,
      item_type: item.item_type,
    });
    itemsHashes.push(itemHash);
  }
  const hash = new Hash({
    type: REQUEST_GENERIC_TYPE,
    empty: false,
    timeout: 10,
    instanceId: PROJECT_DB_DEVICE_ID,
    slot: SLOT_GENERIC_REQUEST,
    replyType: 'projectLoadItems',
  });

  const hashList = new HashList(itemsHashes);
  hash.set('args.type', 'loadItems');
  hash.set('args.items', hashList);
  return hash;
};
