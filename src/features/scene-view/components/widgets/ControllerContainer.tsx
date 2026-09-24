/**
 * ControllerContainer — orchestrates controller widget rendering.
 * Owns proxy lifetime, controller context, overlay, tooltip, and shell layout.
 */

import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/api';
import { BaseWidgetObjectData } from '@/karabo/common/api';
import { AccessLevel, AccessMode } from '@/karabo/data/enums';
import {
  getModelKeys,
  useContainer,
  useController,
  useProxies,
  type ControllerContainerContext,
} from '@/features/controllers/api';
import { useRegisterSceneControllerWidget } from '../../hooks/useRegisterSceneControllerWidget';
import type { Renderer } from '../../renderRegistry';
import { ControllerOverlay } from './ControllerOverlay';

export type { ControllerContainerContext };

const EDITABLE_PARENT_COMPONENT = 'EditableApplyLaterComponent';

const EDITABLE_CONTENTS_PADDING: React.CSSProperties = {
  paddingTop: 1,
  paddingRight: 2,
  paddingBottom: 1,
  paddingLeft: 2,
};

const DISPLAY_CONTENTS_PADDING: React.CSSProperties = {
  paddingTop: 0,
  paddingRight: 1,
  paddingBottom: 1,
  paddingLeft: 0,
};

export interface ControllerContainerProps {
  width: number;
  height: number;
  objectId: string;
  model: BaseWidgetObjectData;
  Renderer: Renderer;
}

interface ControllerLayoutProps {
  model: BaseWidgetObjectData;
  objectId: string;
  Renderer: Renderer;
  ctx: ControllerContainerContext;
  isEditableWidget: boolean;
}

const ContainerLayout = React.memo<ControllerLayoutProps>(
  ({ model, objectId, Renderer, ctx, isEditableWidget }) => (
    <div
      data-testid={`controller-${objectId}`}
      className="w-full h-full"
      style={{
        boxSizing: 'border-box',
        ...(isEditableWidget
          ? EDITABLE_CONTENTS_PADDING
          : DISPLAY_CONTENTS_PADDING),
      }}
    >
      <Renderer model={model} ctx={ctx} objectId={objectId} />
    </div>
  )
);

ContainerLayout.displayName = 'ContainerLayout';

interface ControllerTooltipProps {
  children: React.ReactNode;
  tooltipContent: React.ReactNode;
}

const ControllerTooltip = React.memo<ControllerTooltipProps>(
  ({ children, tooltipContent }) => {
    const [isTooltipOpen, setIsTooltipOpen] = React.useState(false);
    const tooltipAutoCloseRef = React.useRef<number | null>(null);

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
      <Tooltip
        delayDuration={1500}
        open={isTooltipOpen}
        onOpenChange={handleTooltipOpenChange}
      >
        <TooltipTrigger asChild>
          <div className="w-full h-full pointer-events-auto">{children}</div>
        </TooltipTrigger>
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
    );
  }
);

ControllerTooltip.displayName = 'ControllerTooltip';

export const ControllerContainer: React.FC<ControllerContainerProps> =
  React.memo(({ width, height, objectId, model, Renderer }) => {
    const { containerStyle, contentsStyle } = useContainer();
    const proxies = useProxies(model.keys);
    const ctx = useController(proxies);
    const propertyTooltipText = getModelKeys(model.keys);
    const isEditableWidget =
      model.parent_component === EDITABLE_PARENT_COMPONENT;
    const hasEditAccess =
      ctx.proxy?.binding?.accessMode === AccessMode.RECONFIGURABLE &&
      ctx.userAccessLevel >=
        (ctx.proxy?.binding?.requiredAccessLevel ?? AccessLevel.OBSERVER);
    const tooltipBody = propertyTooltipText ? (
      <p>{propertyTooltipText}</p>
    ) : null;
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
    const containerContent = React.useMemo(
      () => (
        <ContainerLayout
          model={model}
          objectId={objectId}
          Renderer={Renderer}
          ctx={ctx}
          isEditableWidget={isEditableWidget}
        />
      ),
      [Renderer, ctx, isEditableWidget, model, objectId]
    );

    useRegisterSceneControllerWidget(objectId, model, ctx);

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
              <ControllerTooltip tooltipContent={tooltipContent}>
                {containerContent}
              </ControllerTooltip>
            ) : (
              containerContent
            )}
          </ControllerOverlay>
        </div>
      </div>
    );
  });

ControllerContainer.displayName = 'ControllerContainer';
