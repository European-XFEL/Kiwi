export function toString(karabo_value: any): string {
  return JSON.stringify(karabo_value, (key, value_) =>
    typeof value_ === 'bigint' ? value_.toString() + 'n' : value_
  );
}
