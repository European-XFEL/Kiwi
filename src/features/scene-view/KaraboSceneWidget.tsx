/**
 * ElementRenderer — resolves scene models to renderer components.
 *
 * Main exports:
 *  - renderContent: direct render path for one model, without scene-layer filtering.
 *  - renderLayerContent: layered render path for one model in the shape/widget scene passes.
 *  - KaraboSceneWidget: positioned shell for one top-level rendered scene entry.
 */

import React from 'react';

import {
  BaseSceneObjectData,
  BaseWidgetObjectData,
  UnknownWidgetDataModel,
  UnknownXMLDataModel,
} from '@/karabo/common/api';
import { containerPointerEvents } from './utils/mode';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/api';
import { ControllerContainer } from './components/widgets/ControllerContainer';

import { getRenderer, type Renderer } from './renderRegistry';
import { resolveBounds, type SceneLayer } from './bounds';
import { isControllerWidget } from './utils/sceneNodePredicates';
import { isVisibleInLayer } from './utils/visitor';

export { resolveBounds } from './bounds';
export { isLayout } from './utils/sceneNodePredicates';

const warnedKlasses = new Set<string>();

function warnOnce(key: string, msg: string) {
  if (warnedKlasses.has(key)) return;
  warnedKlasses.add(key);
  console.warn(msg);
}

const isUnknownWidget = (
  model: BaseSceneObjectData
): model is UnknownWidgetDataModel => model instanceof UnknownWidgetDataModel;

const isUnknownXml = (
  model: BaseSceneObjectData
): model is UnknownXMLDataModel => model instanceof UnknownXMLDataModel;

// Handles missing renderer registrations without leaking unknown-model checks
// into the shared node predicates or traversal helpers.
const renderMissingContent = (model: BaseSceneObjectData): React.ReactNode => {
  if (isUnknownXml(model)) return null;

  if (isUnknownWidget(model)) {
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

  const widgetLike = model as Partial<BaseWidgetObjectData> & {
    klass?: string;
  };
  const klass = widgetLike.klass ?? model.constructor.name;
  warnOnce(
    klass,
    `[Scene] No renderer registered for "${klass}" — add a registerRenderer() call`
  );

  return (
    <Placeholder
      width={widgetLike.width ?? 60}
      height={widgetLike.height ?? 20}
      label={`No renderer: ${klass}`}
    />
  );
};

// Resolves the registered renderer first so the controller/direct paths can
// share the same fallback behavior for unknown or unregistered models.
const renderWithRenderer = (
  model: BaseSceneObjectData,
  render: (Renderer: Renderer) => React.ReactNode
): React.ReactNode => {
  const Renderer = getRenderer(model);
  if (!Renderer) return renderMissingContent(model);
  return render(Renderer);
};

// Controller widgets stay on the subscribed rendering path through
// ControllerContainer so proxy lifetime and context stay centralized.
const renderControllerContent = (
  model: BaseSceneObjectData & BaseWidgetObjectData
): React.ReactNode =>
  renderWithRenderer(model, (Renderer) => (
    <ControllerContainer
      width={model.width}
      height={model.height}
      model={model}
      Renderer={Renderer}
    />
  ));

// Direct-render content covers shapes, layouts, static widgets, and any other
// non-controller renderer that can render without controller context.
const renderDirectContent = (model: BaseSceneObjectData): React.ReactNode =>
  renderWithRenderer(model, (Renderer) => <Renderer model={model} />);

// Render a model in one real scene layer only.
// SceneView uses this path when building the shape and widget layers, so
// visibility is checked first and the active layer is forwarded into layouts.
export const renderLayerContent = (
  model: BaseSceneObjectData,
  layer: SceneLayer
): React.ReactNode => {
  if (!isVisibleInLayer(model, layer)) return null;

  if (isControllerWidget(model)) {
    return renderControllerContent(model);
  }

  return renderWithRenderer(model, (Renderer) => (
    <Renderer model={model} layer={layer} />
  ));
};

// Render one model directly, without shape/widget layer filtering.
// This is the unsplit path used for single-object rendering outside SceneView.
export function renderContent(model: BaseSceneObjectData): React.ReactNode {
  if (isControllerWidget(model)) {
    return renderControllerContent(model);
  }

  return renderDirectContent(model);
}

// KaraboSceneWidget
// ----------------------------------------------------------------------------
// Wraps the render helper in a layout that takes the size of the model and applies a layout.
// The single absolute-positioned div that places an element in scene space.
// Only used by SceneView — never inside layout wrapper divs.

export const KaraboSceneWidget: React.FC<{
  model: BaseSceneObjectData;
  layer?: SceneLayer;
}> = ({ model, layer }) => {
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
      {layer ? renderLayerContent(model, layer) : renderContent(model)}
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
        <span className="text-[10px] leading-tight text-red-700 px-1 text-center select-none">
          {label}
        </span>
      </div>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);
