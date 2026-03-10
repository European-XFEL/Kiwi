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
import { LabelModel, StickerModel } from '@/karabo/common/api';
import { SceneLinkModel, WebLinkModel } from '@/karabo/common/api';
import { ControllerContainer, useController } from '@/features/controllers/api';
import { containerPointerEvents } from '../utils/mode';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';

import { getRenderer } from './registry';
import { isInRenderPhase, resolveBounds, type RenderPhase } from './bounds';
import { PropertyOverlay } from '../components/PropertyOverlay';

export { resolveBounds, isLayout } from './bounds';

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
  const ctx = useController(model.keys);

  return (
    <>
      <Renderer model={model} ctx={ctx} />
      <PropertyOverlay
        primary={ctx.primary}
        x={0}
        y={0}
        width={model.width}
        height={model.height}
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

    return (
      <Placeholder
        width={unregistered.width ?? 60}
        height={unregistered.height ?? 20}
        label={`No renderer: ${unregistered.klass ?? model.constructor.name}`}
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

// ElementRenderer
// ----------------------------------------------------------------------------
// Wraps renderContent in a PositionedShell.
// Only used by SceneView — never inside layout wrapper divs.

export const ElementRenderer: React.FC<{
  model: BaseSceneObjectData;
  phase?: RenderPhase;
}> = ({ model, phase = 'all' }) => (
  <PositionedShell model={model}>{renderContent(model, phase)}</PositionedShell>
);

// PositionedShell
// ----------------------------------------------------------------------------
// The single absolute-positioned div that places an element in scene space.

const PositionedShell: React.FC<{
  model: BaseSceneObjectData;
  children: React.ReactNode;
}> = ({ model, children }) => {
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
      {children}
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
