//config
const ICON_BASE = "/icons";

const DEFAULTS = {
  STATEFUL: "no_icon",
  FALLBACK: "no_icon",
} as const;

const IMAGE_EXTENSIONS = ["svg", "png", "jpg", "jpeg", "webp"] as const;

// Based on original Karabo GUI get_alarm_svg mapping
const ALARM_ICONS: Record<string, string> = {
  none: "alarm_none",
  warn: "warning",
  alarm: "critical",
  interlock: "interlock",
};

// TYPES
type IconProps = {
  krbClass?: string;
  widget?: string;
  iconName?: string;
  infoType?: string;
  alarmCondition?: string; // From DevicePropertyConnector value
};

//helper
function sanitizeFileName(name?: string, fallback = DEFAULTS.FALLBACK): string {
  if (!name?.trim()) return fallback;

  const clean = name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/gi, "_")
    .toLowerCase();

  return clean === "icon_default" ? DEFAULTS.FALLBACK : clean;
}

// MAIN ICON PATH HELPER

export function getIconPaths(props: IconProps): string[] {
  let fileName: string;
  let category: "stateful" | "general";

  //StatefulIconWidget → icons/stateful/*
  if (
    props.krbClass === "DisplayComponent" &&
    props.widget === "StatefulIconWidget"
  ) {
    fileName = sanitizeFileName(props.iconName, DEFAULTS.STATEFUL);
    category = "stateful";
  }

  //PopupButtonWidget → icons/general/*
  else if (props.krbClass === "PopupButtonWidget") {
    fileName = sanitizeFileName(props.infoType, DEFAULTS.FALLBACK);
    category = "general";
  }

  //GlobalAlarm → icons/general/* based on property value
  else if (
    props.krbClass === "DisplayComponent" &&
    props.widget === "GlobalAlarm"
  ) {
    const condition = (props.alarmCondition || "none").toLowerCase();
    fileName = ALARM_ICONS[condition] || ALARM_ICONS.none;
    category = "general";
  }

  //Fallback
  else {
    fileName = sanitizeFileName(props.iconName, DEFAULTS.FALLBACK);
    category = "general";
  }

  // Return all possible file extensions
  return IMAGE_EXTENSIONS.map(
    (ext) => `${ICON_BASE}/${category}/${fileName}.${ext}`
  );
}

// Get first preferred (usually .svg)
export function getPrimaryIconPath(props: IconProps): string {
  return getIconPaths(props)[0];
}

export default getIconPaths;
