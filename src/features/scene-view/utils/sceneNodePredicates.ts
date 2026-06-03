import {
  BaseSceneObjectData,
  BaseWidgetObjectData,
  LabelModel,
  SceneLinkModel,
  StickerModel,
  UnknownWidgetDataModel,
  WebLinkModel,
} from '@/karabo/common/api';
import {
  BaseLayoutModel,
  BaseShapeObjectData,
} from '@/karabo/common/scenemodel/bases';

// Widgets in this set render directly and do not go through ControllerContainer.
const DIRECT_RENDER_WIDGET_MODELS = new Set<Function>([
  LabelModel,
  StickerModel,
  SceneLinkModel,
  WebLinkModel,
  UnknownWidgetDataModel,
]);

// True for decorative shape leaf nodes that only belong to the shape layer.
export const isShape = (
  model: BaseSceneObjectData
): model is BaseShapeObjectData => model instanceof BaseShapeObjectData;

// True for recursive container nodes that keep traversing into children.
export const isLayout = (
  model: BaseSceneObjectData
): model is BaseLayoutModel => model instanceof BaseLayoutModel;

// True for widget models that still need the controller rendering path.
export const isControllerWidget = (
  model: BaseSceneObjectData
): model is BaseWidgetObjectData =>
  model instanceof BaseWidgetObjectData &&
  !DIRECT_RENDER_WIDGET_MODELS.has(model.constructor);
