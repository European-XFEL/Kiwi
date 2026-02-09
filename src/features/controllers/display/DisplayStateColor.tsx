/**
 * DisplayStateColor - controller component
 */

import React from 'react';
import type { DisplayStateColorProps } from '@/scene/scene_types/controllers';
import { useGuiStateColor } from './hooks/useGuiStateColor';

const DisplayStateColor: React.FC<DisplayStateColorProps> = React.memo(
  ({ font_size, font_weight, show_string, tooltipText, primary }) => {
    const deviceState = primary?.deviceState;
    const rawState = deviceState ?? '';

    // Map state string → CSS color
    const { colorValue } = useGuiStateColor(rawState);
    const bgColor = colorValue ?? '#cccccc';

    const showText = show_string && rawState;

    return (
      <div
        className="flex items-center justify-center border border-solid overflow-hidden p-0.5 w-full h-full"
        title={tooltipText || primary?.propertyIndicator?.label}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Arial',
            fontSize: font_size,
            fontWeight: font_weight,
            backgroundColor: bgColor,
          }}
        >
          {showText && (
            <span className="text-xs" aria-live="polite">
              {rawState}
            </span>
          )}
        </div>
      </div>
    );
  }
);

export default DisplayStateColor;
