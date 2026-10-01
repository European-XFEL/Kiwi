export const KARABO_BASE_SAVABLE = [
  'x',
  'y',
  'width',
  'height',
  'keys',
  'parent_component',
  'id',
  'klass',
];

export type PlotSettings = {
  // Plot settings intentionally accept arbitrary model fields and values.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [name: string]: any;
};

export function buildModelConfig(model: object): PlotSettings {
  const settings: PlotSettings = {};
  for (const [name, value] of Object.entries(model)) {
    if (KARABO_BASE_SAVABLE.includes(name)) continue;
    settings[name] = value;
  }
  return settings;
}
