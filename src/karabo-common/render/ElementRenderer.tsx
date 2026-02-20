/**
 * ElementRenderer — resolves a scene model to a renderer component.
 * Controllers are wrapped in ControllerContainer to inject device context.
 */

import React from 'react';

import {
  BaseSceneObjectData,
  BaseWidgetObjectData,
  UnknownWidgetDataModel,
  UnknownXMLDataModel,
} from '@/karabo-common/models/bases';
import {
  LabelModel,
  StickerModel,
} from '@/karabo-common/models/widgets/static';
import {
  DeviceSceneLinkModel,
  SceneLinkModel,
  WebLinkModel,
} from '@/karabo-common/models/widgets/links';
import { ControllerContainer } from '@/features/scene_view/ControllerContainer';
import { getRenderer } from './registry';

// ---------------------------------------------------------------------------
// Non-controller widgets: static, links, and other scene objects that do not
// subscribe to live device properties. Mirrors Python's _SCENE_OBJ_FACTORIES.
// ---------------------------------------------------------------------------

const NON_CONTROLLER_WIDGETS = new Set<Function>([
  // Static
  LabelModel,
  StickerModel,
  // Links
  DeviceSceneLinkModel,
  SceneLinkModel,
  WebLinkModel,
  // Fallbacks
  UnknownWidgetDataModel,
  UnknownXMLDataModel,
  // TODO: add once implemented
  // PopupButtonModel,
  // InstanceStatusModel,
  // ImageRendererModel,
]);

const isControllerWidget = (
  model: BaseSceneObjectData
): model is BaseWidgetObjectData =>
  model instanceof BaseWidgetObjectData &&
  !NON_CONTROLLER_WIDGETS.has(model.constructor);

// ---------------------------------------------------------------------------
// ElementRenderer
// ---------------------------------------------------------------------------

export const ElementRenderer: React.FC<{ model: BaseSceneObjectData }> = ({
  model,
}) => {
  const Renderer = getRenderer(model);

  if (!Renderer) {
    // Unknown Widget: has geometry, so render dashed placeholder
    if (model instanceof UnknownWidgetDataModel) {
      return (
        <Placeholder
          x={model.x}
          y={model.y}
          width={model.width}
          height={model.height}
          label={`Unknown widget: ${model.klass}`}
        />
      );
    }

    // Unknown XML: no geometry info, nothing to render
    if (model instanceof UnknownXMLDataModel) return null;

    // Known model without a registered renderer yet
    const unregistered = model as Partial<BaseWidgetObjectData> & {
      klass?: string;
    };
    return (
      <Placeholder
        x={unregistered.x ?? 0}
        y={unregistered.y ?? 0}
        width={unregistered.width ?? 60}
        height={unregistered.height ?? 20}
        label={`No renderer: ${unregistered.klass ?? model.constructor.name}`}
      />
    );
  }

  // Controllers get device context via ControllerContainer
  if (isControllerWidget(model)) {
    return (
      <ControllerContainer
        keys={model.keys}
        x={model.x}
        y={model.y}
        width={model.width}
        height={model.height}
      >
        {(deviceCtx) => <Renderer model={model} ctx={deviceCtx} />}
      </ControllerContainer>
    );
  }

  // Static/link widgets render directly
  return <Renderer model={model} />;
};

// Reusable dashed placeholder block
const Placeholder: React.FC<{
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}> = ({ x, y, width, height, label }) => (
  <div
    style={{
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
      width: `${width}px`,
      height: `${height}px`,
    }}
    className="border border-dashed border-gray-400 opacity-50 flex items-center justify-center text-xs text-gray-500 overflow-hidden"
    title={label}
  >
    {label}
  </div>
);
