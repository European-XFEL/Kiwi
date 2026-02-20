export function toString(karabo_value: any): string {
  return JSON.stringify(karabo_value, (_key, value_) =>
    typeof value_ === 'bigint' ? value_.toString() + 'n' : value_
  );
}
