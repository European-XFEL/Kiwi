import { BinaryDecoder, Hash } from "karabo-ts";

/**
 * Parses a Blob, the type of WebSocketEvent.data, supposed to contain a
 * binary serialized hash.
 * @param blob the Blob to be parsed
 * @returns the Hash that was binary serialized in the input Blob.
 */
export const blobToHash = async (blob: Blob): Promise<Hash> => {
  // The Blob has to be converted to an ArrayBuffer
  // and then to an Uint8Array to be fed to the Hash binary decoder.
  // The first 4 bytes are the size in bytes of the Hash binary image
  // and must not be fed into the decoder.
  const arrBuff = await blob.arrayBuffer();
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
  let typeValue = "";
  if ("type" in hash.value) {
    typeValue = hash.value.type.value.value_ as string;
  }
  return typeValue;
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
