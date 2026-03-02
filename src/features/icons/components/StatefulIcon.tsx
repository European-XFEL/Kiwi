/**
 * StatefulIcon - Dynamically colored icon based on device state
 */

import React, { useMemo } from 'react';
import type { UsePropertyProxyUpdate } from '@/lib/binding/useDeviceProperty';
import { useGuiStateColor } from '../hooks/useGuiStateColor';

export interface DisplayStatefulIconProps {
  icon_name: string;
  tooltipText?: string;
  disabledReason?: string;
  primary?: Pick<UsePropertyProxyUpdate, 'value' | 'propertyIndicator'>;
}
import { statefulIconTextById } from '../utils/statefulIcons';
import {
  recolorPreloadedSvg,
  getPreloadedCacheKey,
} from '../utils/loadAndRecolor';

const DisplayStatefulIcon: React.FC<DisplayStatefulIconProps> = ({
  icon_name,
  tooltipText,
  disabledReason,
  primary,
}) => {
  const value = primary?.value;

  // Map the property value (e.g., "ON", "ACTIVE") to a color
  const rawState = value ? String(value) : 'UNKNOWN';
  const { colorValue } = useGuiStateColor(rawState);

  //  if the module wasn't mocked correctly
  const svgXML = statefulIconTextById?.[icon_name] ?? null;

  const recoloredSvg = useMemo(() => {
    if (!svgXML) return '';

    const cacheKey = getPreloadedCacheKey(icon_name, colorValue, {
      stroke: true,
      fit: 'contain',
      nonScalingStroke: false,
    });

    const recolorResult = recolorPreloadedSvg(svgXML, colorValue, cacheKey, {
      stroke: true,
      fit: 'contain',
      nonScalingStroke: false,
      enablePerfTracking: true,
    });

    console.log(
      `[DisplayStatefulIcon] ${icon_name} | ${
        recolorResult.metrics?.fromCache ? 'CACHE HIT ' : 'CACHE MISS '
      }`
    );

    return recolorResult.svg;
  }, [svgXML, colorValue, icon_name]);

  return (
    <div
      className="flex items-center justify-center w-full h-full"
      title={tooltipText || disabledReason || primary?.propertyIndicator?.label}
    >
      {recoloredSvg ? (
        <div
          style={{ width: '100%', height: '100%' }}
          dangerouslySetInnerHTML={{ __html: recoloredSvg }}
        />
      ) : (
        // fallback only runs if svgXML was missing
        <svg width="100%" height="100%" viewBox="0 0 120 30">
          <text x="0" y="20" fontSize="10">
            {icon_name}
          </text>
        </svg>
      )}
    </div>
  );
};

export default DisplayStatefulIcon;
