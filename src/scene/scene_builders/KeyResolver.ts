/**
 * resolveRegistryKey.ts
 * Converts parsed JSON element metadata into a normalized registry key.
 * Used to look up the correct builder in SceneElementRegistry.
 */

export function resolveRegistryKey(json: any): string | null {
  const t = (s: any) => String(s ?? "").toLowerCase();

  if (json?.element_type === "layout" && json.layout_type) {
    return `layout:${t(json.layout_type)}`;
  }

  if (json?.element_type === "shape" && json.shape_type) {
    return `shape:${t(json.shape_type)}`;
  }

  if (json?.element_type === "widget" && json.widget_type) {
    if (json.parent_component === "DisplayComponent") {
      return `controller:display:${t(json.widget_type)}`;
    }
    if (json.parent_component === "EditableApplyLaterComponent") {
      return `controller:editable:${t(json.widget_type)}`;
    }
    return `widget:${t(json.widget_type)}`;
  }

  return null;
}
