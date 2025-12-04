// Mock for karabo-ts to avoid ES module issues in Jest
export const HashTypes = {
  Bool: 0,
  VectorBool: 1,
  Char: 2,
  VectorChar: 3,
  Int8: 4,
  VectorInt8: 5,
  UInt8: 6,
  VectorUInt8: 7,
  Int16: 8,
  VectorInt16: 9,
  UInt16: 10,
  VectorUInt16: 11,
  Int32: 12,
  VectorInt32: 13,
  UInt32: 14,
  VectorUInt32: 15,
  Int64: 16,
  VectorInt64: 17,
  UInt64: 18,
  VectorUInt64: 19,
  Float32: 20,
  VectorFloat32: 21,
  Float64: 22,
  VectorFloat64: 23,
  ComplexFloat: 24,
  VectorComplexFloat: 25,
  ComplexDouble: 26,
  VectorComplexDouble: 27,
  String: 28,
  VectorString: 29,
  Hash: 30,
  VectorHash: 31,
  Schema: 32,
  None: 35,
  ByteArray: 37
};

// Mock makeHash function
export const makeHash = (obj) => {
  return obj; // Simple mock that returns the object as-is
};
