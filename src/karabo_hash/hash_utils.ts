import { Hash, HashAttributes, HashValues } from '@/karabo-hash/hash';
import { ValueTypes } from '@/karabo-hash/types';
import { HashTypes } from '@/karabo-hash/typenums';

/**
 * Return the value of a given hash's "type" property.
 *
 * @param hash the hash whose "type" property value should be returned.
 * @returns the value of the hash's "type" property (blank if the hash has no type property).
 */
export const hashProtocolType = (hash: Hash): string => {
  return (hash.getValue('type') as string) ?? '';
};

/**
 * Adds a size prefix to a binary serialized Hash.
 * @param encodedHash the binary serialized Hash whose size should be added as
 * a prefix.
 * @returns an Uint8Array consisting of the input array buffer plus a 4 bytes
 * prefix with the size of the input binary serialized Hash.
 */
export const packEncodedHash = (encodedHash: ArrayBuffer): Uint8Array => {
  const encodedHashView = new Uint8Array(encodedHash);
  const packedBuff = new ArrayBuffer(encodedHash.byteLength + 4);
  const packedBuffView = new DataView(packedBuff);
  packedBuffView.setUint32(0, encodedHash.byteLength, true);
  for (let i = 4; i < packedBuff.byteLength; i++) {
    packedBuffView.setUint8(i, encodedHashView[i - 4]);
  }
  return new Uint8Array(packedBuff);
};

/**
 * Removes the size prefix from a binary serialized Hash.
 * @param encodedHash binary serialized Hash whose size encoded in the first 4
 * bytes must be removed
 * @returns an Uint8Array consisting of the input array buffer except its first
 * 4 bytes
 */
export const unpackEncodedHash = (encodedHash: ArrayBuffer): Uint8Array => {
  return new Uint8Array(encodedHash.slice(4));
};

export interface HashLeafNode {
  path: string;
  value: ValueTypes;
  type: HashTypes;
  attrs: HashAttributes;
}

export const flattenHash = (
  hash: Hash,
  flattenVectorHash: boolean = false
): HashLeafNode[] => {
  function doFlattenHash(
    hash: Hash,
    hashLeaves: HashLeafNode[],
    currentPath: string = ''
  ) {
    for (const [itemPath] of hash.iterall()) {
      const currentKey =
        currentPath.length > 0 ? `${currentPath}.${itemPath}` : itemPath;
      const hashNode = hash.getElement(itemPath);
      if (typeof hashNode !== 'undefined') {
        if (hashNode.data instanceof Hash) {
          if (hashNode.data.size === 0 && hashNode.attrs !== undefined) {
            // Special case: the node is a Hash that doesn't contain items but
            // has attributes. This happens, for instance, for command slots.
            // They are also added as leaves, but their value will be 0.
            hashLeaves.push({
              path: currentKey,
              value: 0,
              type: hashNode.data.type_,
              attrs: hashNode.attrs,
            });
          } else if (hashNode.data.size > 0) {
            doFlattenHash(
              new Hash(hashNode.data.value_),
              hashLeaves,
              currentKey
            );
          }
        } else if (
          flattenVectorHash &&
          hashNode.data.type_ === HashTypes.VectorHash
        ) {
          const hashVector = hashNode.data.value_ as HashValues[];
          for (let i = 0; i < hashVector.length; i++) {
            doFlattenHash(
              new Hash(hashVector[i]),
              hashLeaves,
              `${currentKey}[${i}]`
            );
          }
        } else {
          hashLeaves.push({
            path: currentKey,
            value: hashNode.data.value_,
            type: hashNode.data.type_,
            attrs: hashNode.attrs,
          });
        }
      } // if (typeof HashNode !== "undefined")
    }
  }

  const hashLeaves: HashLeafNode[] = [];
  doFlattenHash(hash, hashLeaves);
  return hashLeaves;
};
