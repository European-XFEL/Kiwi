import type { PropertyProxy } from '../PropertyProxy';

export function getEditorValue(proxy: PropertyProxy | undefined): unknown {
  const edit = proxy?.edit_value;
  return edit !== undefined ? (edit.value_ ?? edit) : proxy?.value;
}
