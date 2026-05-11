/**
 * ElementRenderer — resolves a scene model to a renderer component.
 *
 * Two exports:
 *  - renderContent: resolves model → component, zero positioning.
 *    Used by layouts for their children (the layout's wrapper div is the shell).
 *  - ElementRenderer: PositionedShell + renderContent.
 *    Used by SceneView for top-level children.
 */

import React from 'react';

import {
  BaseSceneObjectData,
  BaseWidgetObjectData,
  UnknownWidgetDataModel,
  UnknownXMLDataModel,
} from '@/karabo/common/api';
import { AccessLevel, AccessMode } from '@/karabo/data/enums';
import { LabelModel, StickerModel } from '@/karabo/common/api';
import { SceneLinkModel, WebLinkModel } from '@/karabo/common/api';
import { ControllerContainer, useController } from '@/features/controllers/api';
import { containerPointerEvents } from '../utils/mode';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';

import { getRenderer } from './registry';
import { isInRenderPhase, resolveBounds, type RenderPhase } from './bounds';
import { PropertyOverlay } from '../components/PropertyOverlay';

export { resolveBounds, isLayout } from './bounds';

const _warnedKlasses = new Set<string>();
function warnOnce(key: string, msg: string) {
  if (_warnedKlasses.has(key)) return;
  _warnedKlasses.add(key);
  console.warn(msg);
}

// NON_CONTROLLER_WIDGETS
// ----------------------------------------------------------------------------
// Widgets that render directly — no device subscription needed.
// Mirrors Python's _SCENE_OBJ_FACTORIES.

const NON_CONTROLLER_WIDGETS = new Set<Function>([
  LabelModel,
  StickerModel,
  SceneLinkModel,
  WebLinkModel,
  UnknownWidgetDataModel,
  UnknownXMLDataModel,
]);

const EDITABLE_PARENT_COMPONENT = 'EditableApplyLaterComponent';

const isControllerWidget = (
  model: BaseSceneObjectData
): model is BaseWidgetObjectData =>
  model instanceof BaseWidgetObjectData &&
  !NON_CONTROLLER_WIDGETS.has(model.constructor);

// ControllerView
// ----------------------------------------------------------------------------
// Calls useController for device binding, renders the widget and its overlay
// as siblings — controller and overlay belong together.

const ControllerView: React.FC<{
  model: BaseWidgetObjectData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Renderer: React.ComponentType<any>;
}> = ({ model, Renderer }) => {
  const [isTooltipOpen, setIsTooltipOpen] = React.useState(false);
  const tooltipAutoCloseRef = React.useRef<number | null>(null);
  const ctx = useController(model.keys);
  const propertyTooltipText =
    model.keys.filter(Boolean).join(', ') ||
    (ctx.tooltipText ?? ctx.disabledReason);
  const tooltipStatusText =
    ctx.disabledReason && ctx.disabledReason !== propertyTooltipText
      ? ctx.disabledReason
      : undefined;
  const isEditableWidget = model.parent_component === EDITABLE_PARENT_COMPONENT;
  const hasEditAccess =
    ctx.primary.binding?.accessMode === AccessMode.RECONFIGURABLE &&
    ctx.userAccessLevel >=
      (ctx.primary.binding?.requiredAccessLevel ?? AccessLevel.OBSERVER);
  const tooltipBody =
    propertyTooltipText || tooltipStatusText ? (
      <>
        {propertyTooltipText && <p>{propertyTooltipText}</p>}
        {tooltipStatusText && <p>{tooltipStatusText}</p>}
      </>
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
    <>
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
      <PropertyOverlay
        primary={ctx.primary}
        x={0}
        y={0}
        width={model.width}
        height={model.height}
        tooltipText={ctx.tooltipText}
      />
    </>
  );
};

// renderContent
// ----------------------------------------------------------------------------
// Resolves a model to its component and renders it — zero positioning.
// Layouts call this for their children after the wrapper div sets position.

export function renderContent(
  model: BaseSceneObjectData,
  phase: RenderPhase = 'all'
): React.ReactNode {
  if (!isInRenderPhase(model, phase)) return null;

  const Renderer = getRenderer(model);

  if (!Renderer) {
    if (model instanceof UnknownXMLDataModel) return null;

    if (model instanceof UnknownWidgetDataModel) {
      warnOnce(
        model.klass,
        `[Scene] Unknown widget: "${model.klass}" — no builder registered for this klass`
      );
      return (
        <Placeholder
          width={model.width}
          height={model.height}
          label={`Unknown widget: ${model.klass}`}
        />
      );
    }

    const unregistered = model as Partial<BaseWidgetObjectData> & {
      klass?: string;
    };
    const klass = unregistered.klass ?? model.constructor.name;
    warnOnce(
      klass,
      `[Scene] No renderer registered for "${klass}" — add a registerRenderer() call`
    );

    return (
      <Placeholder
        width={unregistered.width ?? 60}
        height={unregistered.height ?? 20}
        label={`No renderer: ${klass}`}
      />
    );
  }

  if (isControllerWidget(model)) {
    return (
      <ControllerContainer width={model.width} height={model.height}>
        <ControllerView model={model} Renderer={Renderer} />
      </ControllerContainer>
    );
  }

  return <Renderer model={model} />;
}

// KaraboSceneWidget
// ----------------------------------------------------------------------------
// Wraps renderContent in a layout that takes the size of the model and applies a layout.
// The single absolute-positioned div that places an element in scene space.
// Only used by SceneView — never inside layout wrapper divs.

export const KaraboSceneWidget: React.FC<{
  model: BaseSceneObjectData;
  phase?: RenderPhase;
}> = ({ model, phase = 'all' }) => {
  const { x, y, width, height } = resolveBounds(model);

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        pointerEvents: containerPointerEvents(),
      }}
    >
      {renderContent(model, phase)}
    </div>
  );
};

// Placeholder
// ----------------------------------------------------------------------------
// Fills the parent shell — no self-positioning.

export const Placeholder: React.FC<{
  width: number;
  height: number;
  label: string;
}> = ({ width, height, label }) => (
  <Tooltip delayDuration={120}>
    <TooltipTrigger asChild>
      <div
        style={{ width, height }}
        className="border border-dashed border-red-300 bg-red-50/60 flex items-center justify-center overflow-hidden cursor-help"
        aria-label={label}
      >
        <span className="text-red-600 text-sm font-semibold leading-none">
          ?
        </span>
      </div>
    </TooltipTrigger>
    <TooltipContent className="max-w-[320px] text-xs">{label}</TooltipContent>
  </Tooltip>
);
