import { HashValue, SchemaValue, UInt8 } from 'karabo-ts';

// TODO: add and export the type below in the upstream karabo-ts package
export type VectorElementType = bigint | number | string | UInt8;

// TODO: this is the internal ValueTypes declared for the Hash values in
//       the karabo-ts package. Open a PR to export the ValueType in the
//       upstream karabo-ts package
export type HashValueType =
  | number
  | number[]
  | string
  | string[]
  | bigint
  | bigint[]
  | HashValue
  | HashValue[]
  | SchemaValue
  | boolean
  | boolean[]
  | Uint8Array
  | VectorElementType[][];
