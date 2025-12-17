import {
  Attributes,
  BinaryDecoder,
  Hash,
  HashTypes,
  HashValue,
} from 'karabo-ts';
import { HashValueType } from './HashValueType';

/**
 * Decodes a Hash from an array buffer with its binary serialized form.
 * @param arrBuff an ArrayBuffer with the binary serialized hash.
 * @returns the decoded hash.
 */
export const decodeBinHash = (arrBuff: ArrayBuffer): Hash => {
  // The first 4 bytes are the size in bytes of the Hash binary image
  // and must not be fed into the decoder.
  const buffData = new Uint8Array(arrBuff.slice(4));
  const hashDecoder = new BinaryDecoder(buffData);
  const hash = hashDecoder.read();
  return hash;
};

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
 * @returns an array buffer consisting of the input array buffer plus a 4 bytes
 * prefix with the size of the input binary serialized Hash.
 */
export const packEncodedHash = (encodedHash: ArrayBuffer): ArrayBuffer => {
  const encodedHashView = new Uint8Array(encodedHash);
  const packedBuff = new ArrayBuffer(encodedHash.byteLength + 4);
  const packedBuffView = new DataView(packedBuff);
  packedBuffView.setUint32(0, encodedHash.byteLength, true);
  for (let i = 4; i < packedBuff.byteLength; i++) {
    packedBuffView.setUint8(i, encodedHashView[i - 4]);
  }
  return packedBuff;
};

export interface HashLeafNode {
  path: string;
  value: HashValueType;
  type: HashTypes;
  attrs: Attributes;
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
      const hashNode = hash.getNode(itemPath);
      if (typeof hashNode !== 'undefined') {
        if (hashNode.value.type_ === HashTypes.Hash) {
          if (
            Object.entries(hashNode.value.value_).length === 0 &&
            hashNode.attrs !== undefined
          ) {
            // Special case: the node is a Hash that doesn't contain items but
            // has attributes. This happens, for instance, for command slots.
            // They are also added as leaves, but their value will be an empty
            // hash.
            hashLeaves.push({
              path: currentKey,
              value: hashNode.value.value_,
              type: hashNode.value.type_,
              attrs: hashNode.attrs,
            });
          } else if (Object.entries(hashNode.value.value_).length > 0) {
            doFlattenHash(
              new Hash(hashNode.value.value_ as HashValue),
              hashLeaves,
              currentKey
            );
          }
        } else if (
          flattenVectorHash &&
          hashNode.value.type_ === HashTypes.VectorHash
        ) {
          const hashVector = hashNode.value.value_ as HashValue[];
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
            value: hashNode.value.value_,
            type: hashNode.value.type_,
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
