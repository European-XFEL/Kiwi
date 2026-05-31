/**
 * ControllerContainer — orchestrates controller widget rendering.
 * Owns proxy lifetime, controller context, overlay, tooltip, and shell layout.
 */

import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { BaseWidgetObjectData } from '@/karabo/common/api';
import { AccessLevel, AccessMode } from '@/karabo/data/enums';
import { useContainer } from '../hooks/useContainer';
import type { ControllerContainerContext } from '../hooks/useController';
import { useController } from '../hooks/useController';
import { useProxies } from '../hooks/useProxies';
import { getControllerBindingLabel } from '../utils/controller_semantics';
import { ControllerOverlay } from './ControllerOverlay';

export type { ControllerContainerContext };

const EDITABLE_PARENT_COMPONENT = 'EditableApplyLaterComponent';

export interface ControllerContainerProps {
  width: number;
  height: number;
  model: BaseWidgetObjectData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Renderer: React.ComponentType<any>;
}

export const ControllerContainer: React.FC<ControllerContainerProps> = ({
  width,
  height,
  model,
  Renderer,
}) => {
  const { containerStyle, contentsStyle } = useContainer();
  const [isTooltipOpen, setIsTooltipOpen] = React.useState(false);
  const tooltipAutoCloseRef = React.useRef<number | null>(null);
  const proxies = useProxies(model.keys);
  const ctx = useController(proxies);
  const propertyTooltipText = getControllerBindingLabel(model.keys);
  const isEditableWidget = model.parent_component === EDITABLE_PARENT_COMPONENT;
  const hasEditAccess =
    ctx.proxy?.binding?.accessMode === AccessMode.RECONFIGURABLE &&
    ctx.userAccessLevel >=
      (ctx.proxy?.binding?.requiredAccessLevel ?? AccessLevel.OBSERVER);
  const tooltipBody = propertyTooltipText ? <p>{propertyTooltipText}</p> : null;
  const tooltipContent = isEditableWidget ? (
    <div className="space-y-0.5">
      <p>
        AccessLevel: {AccessLevel[ctx.userAccessLevel]} - Access:{' '}
        {hasEditAccess ? 'True' : 'False'}
      </p>
      {tooltipBody}
    </div>
  ) : (
    tooltipBody
  );
  const controllerContent = (
    <div className="w-full h-full">
      <Renderer model={model} ctx={ctx} />
    </div>
  );

  const clearTooltipAutoClose = React.useCallback(() => {
    if (tooltipAutoCloseRef.current == null) return;

    window.clearTimeout(tooltipAutoCloseRef.current);
    tooltipAutoCloseRef.current = null;
  }, []);

  const handleTooltipOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      clearTooltipAutoClose();
      setIsTooltipOpen(nextOpen);

      if (nextOpen) {
        tooltipAutoCloseRef.current = window.setTimeout(() => {
          setIsTooltipOpen(false);
          tooltipAutoCloseRef.current = null;
        }, 5000);
      }
    },
    [clearTooltipAutoClose]
  );

  React.useEffect(() => clearTooltipAutoClose, [clearTooltipAutoClose]);

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        ...containerStyle,
      }}
    >
      <div style={contentsStyle}>
        <ControllerOverlay proxies={ctx.proxies}>
          {tooltipContent ? (
            <Tooltip
              delayDuration={1500}
              open={isTooltipOpen}
              onOpenChange={handleTooltipOpenChange}
            >
              <TooltipTrigger asChild>{controllerContent}</TooltipTrigger>
              <TooltipContent
                hideArrow
                side="bottom"
                align="start"
                sideOffset={4}
                className="max-w-[420px] rounded-none border border-[#b88700] bg-[#fff7bf] px-1.5 py-0.5 text-[11px] leading-tight text-black shadow-sm"
              >
                {tooltipContent}
              </TooltipContent>
            </Tooltip>
          ) : (
            controllerContent
          )}
        </ControllerOverlay>
      </div>
    </div>
  );
};
