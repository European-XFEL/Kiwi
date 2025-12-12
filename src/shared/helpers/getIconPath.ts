// src/shared/helpers/getIconPath.ts

// public base (only for icons that are still in public/)
const ICON_BASE = '/icons';

const DEFAULTS = {
  STATEFUL: 'no_icon',
  FALLBACK: 'no_icon',
} as const;

const IMAGE_EXTENSIONS = ['svg', 'png', 'jpg', 'jpeg', 'webp'] as const;

// Based on original Karabo GUI get_alarm_svg mapping
const ALARM_ICONS: Record<string, string> = {
  none: 'alarm_none',
  warn: 'warning',
  alarm: 'critical',
  interlock: 'interlock',
};

// TYPES
type IconProps = {
  krbClass?: string;
  widget?: string;
  iconName?: string;
  infoType?: string;
  alarmCondition?: string; // From DevicePropertyConnector value
};

// helper
function sanitizeFileName(name?: string, fallback = DEFAULTS.FALLBACK): string {
  if (!name?.trim()) return fallback;

  const clean = name
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/gi, '_')
    .toLowerCase();

  return clean === 'icon_default' ? DEFAULTS.FALLBACK : clean;
}

/**
 * NEW: we return a descriptor so components can:
 * - use `key` to look up preloaded React SVGs (stateful, now in src/)
 * - use `paths` to fall back to public files (general, still in /public)
 */
export function getIconDescriptor(props: IconProps): {
  key: string; // canonical name, e.g. "icon_massflow_controller"
  category: 'stateful' | 'general';
  paths: string[]; // public URLs, may be [] for stateful now in src
} {
  let fileName: string;
  let category: 'stateful' | 'general';

  // StatefulIconWidget → was in public/icons/stateful/*, now moved to src/stateful_icons/*
  if (
    props.krbClass === 'DisplayComponent' &&
    props.widget === 'StatefulIconWidget'
  ) {
    fileName = sanitizeFileName(props.iconName, DEFAULTS.STATEFUL);
    category = 'stateful';

    // since stateful icons are now in src/, we don’t have public URLs for them anymore
    return {
      key: fileName,
      category,
      paths: [], // component will try preloaded React icons first
    };
  }

  // PopupButtonWidget → still served from public/icons/general/*
  if (props.krbClass === 'PopupButtonWidget') {
    fileName = sanitizeFileName(props.infoType, DEFAULTS.FALLBACK);
    category = 'general';
  }
  // GlobalAlarm → public/icons/general/* based on property value
  else if (
    props.krbClass === 'DisplayComponent' &&
    props.widget === 'GlobalAlarm'
  ) {
    const condition = (props.alarmCondition || 'none').toLowerCase();
    fileName = ALARM_ICONS[condition] || ALARM_ICONS.none;
    category = 'general';
  }
  // fallback → treat as general
  else {
    fileName = sanitizeFileName(props.iconName, DEFAULTS.FALLBACK);
    category = 'general';
  }

  // for general we still build public URLs like before
  const paths = IMAGE_EXTENSIONS.map(
    (ext) => `${ICON_BASE}/${category}/${fileName}.${ext}`
  );

  return { key: fileName, category, paths };
}

/**
 * BACKWARD-COMPAT:
 * your old function can now just call the new one
 */
export function getIconPaths(props: IconProps): string[] {
  return getIconDescriptor(props).paths;
}

/**
 * BACKWARD-COMPAT:
 * first path (usually .svg)
 */
export function getPrimaryIconPath(props: IconProps): string {
  const { paths } = getIconDescriptor(props);
  return paths[0] ?? ''; // stateful might return ""
}

export default getIconPaths;
