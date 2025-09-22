export function moveItemToFirstPosition<T>(arr: T[], fromIndex: number): T[] {
  if (!Array.isArray(arr)) throw new Error("arr must be an array");
  const len = arr.length;
  if (fromIndex < 0 || fromIndex >= len)
    throw new Error("fromIndex out of bounds");
  if (fromIndex === 0) return [...arr];

  const result = arr.slice();
  const [item] = result.splice(fromIndex, 1);
  result.unshift(item);
  return result;
}

export function moveItemToLastPosition<T>(arr: T[], fromIndex: number): T[] {
  if (!Array.isArray(arr)) throw new Error("arr must be an array");
  const len = arr.length;
  if (len === 0) return [];
  if (fromIndex < 0 || fromIndex >= len)
    throw new Error("fromIndex out of bounds");
  if (fromIndex === len - 1) return arr.slice();

  const result = arr.slice();
  const [item] = result.splice(fromIndex, 1);
  result.push(item);
  return result;
}

export function swapItemsInAnArray<T>(
  arr: T[],
  fromIndex: number,
  toIndex: number
): T[] {
  if (!Array.isArray(arr)) throw new Error("Invalid array");
  const len = arr.length;
  if (len === 0) throw new Error("Array cannot be empty");
  if (fromIndex < 0 || fromIndex >= len)
    throw new Error("fromIndex out of bounds");
  if (toIndex < 0 || toIndex >= len) throw new Error("toIndex out of bounds");
  if (fromIndex === toIndex) return arr.slice();

  const result = arr.slice();
  [result[fromIndex], result[toIndex]] = [result[toIndex], result[fromIndex]];
  return result;
}

export function moveItem<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  if (!Array.isArray(arr)) throw new Error("arr must be an array");
  const len = arr.length;
  if (fromIndex < 0 || fromIndex >= len)
    throw new Error("fromIndex out of bounds");
  if (toIndex < 0 || toIndex >= len) throw new Error("toIndex out of bounds");
  if (fromIndex === toIndex) return [...arr];

  const result = arr.slice();
  const [item] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, item);
  return result;
}
