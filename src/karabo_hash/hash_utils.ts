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
