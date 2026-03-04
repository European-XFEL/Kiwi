import * as React from 'react';
import { mapGuiStateColor } from '@/lib/binding/utils/mapStateColor';
import { guiStateColors, GuiStateColorKey } from '@/lib/Indicators';

export function useGuiStateColor(rawState: string) {
  const colorKey = React.useMemo<GuiStateColorKey>(
    () => mapGuiStateColor(rawState),
    [rawState]
  );

  const colorValue = guiStateColors[colorKey];

  return { colorKey, colorValue };
}
