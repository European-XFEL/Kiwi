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
import { ControllerContainer } from '@/features/controllers/api';
import { containerPointerEvents } from './utils/mode';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/api';

import { getRenderer } from './renderRegistry';
import { isInRenderPhase, resolveBounds, type RenderPhase } from './bounds';

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

const isControllerWidget = (
  model: BaseSceneObjectData
): model is BaseWidgetObjectData =>
  model instanceof BaseWidgetObjectData &&
  !NON_CONTROLLER_WIDGETS.has(model.constructor);

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
      <ControllerContainer
        width={model.width}
        height={model.height}
        model={model}
        Renderer={Renderer}
      />
    );
  }

  // Layout renderers must see the active phase so nested children stay in the
  // same pass and do not reach controller widgets during the shape traversal.
  return <Renderer model={model} phase={phase} />;
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
