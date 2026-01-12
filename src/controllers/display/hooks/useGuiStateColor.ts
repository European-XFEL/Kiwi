import * as React from 'react';
import { mapGuiStateColor } from '@/binding/utils/mapStateColor';
import {
  guiStateColors,
  GuiStateColorKey,
} from '../../../karabo_data/Indicators';

export function useGuiStateColor(rawState: string) {
  const colorKey = React.useMemo<GuiStateColorKey>(
    () => mapGuiStateColor(rawState),
    [rawState]
  );

  const colorValue = guiStateColors[colorKey];

  return { colorKey, colorValue };
}
