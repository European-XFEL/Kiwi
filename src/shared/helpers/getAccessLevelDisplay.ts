import { AccessLevel } from "@/karabo_data/AccessLevel";

export const getAccessLevelDisplay = (accessLevel?: number) => {
  if (accessLevel === undefined) return null;

  // AccessLevel[accessLevel] returns: "Observer", "Operator", or "Expert"
  const levelName = AccessLevel[accessLevel];

  // Convert to uppercase for lookup
  const levelKey = levelName?.toUpperCase();

  const variants: Record<string, { className: string }> = {
    EXPERT: { className: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
    OPERATOR: { className: "bg-green-100 text-green-700 hover:bg-green-100" },
    OBSERVER: { className: "bg-gray-100 text-gray-700 hover:bg-gray-100" },
  };

  return {
    label: levelName,
    ...(variants[levelKey] || variants.OBSERVER),
  };
};
