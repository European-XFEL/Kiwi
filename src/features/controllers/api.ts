/**
 * controllers — public API.
 *
 * External consumers (ElementRenderer, App) import from here.
 * Internal controller files may still use direct relative imports.
 */

export { useController } from './useController';
export type {
  ControllerContainerContext,
  ControllerEditActions,
  ControllerEditHandlers,
} from './useController';
export { useProxies } from './useProxies';
export { useContainer } from './useContainer';
export { useTrendModel } from './graph/trend/api';
export { bootstrapControllerRenderers } from './controllerRenderers';

export {
  bootstrapStatefulIcons,
  statefulIconModelsById,
} from './utils/bootstrapStatefulIcons';
export {
  QFont,
  parseQFont,
  getQFontTextStyle,
  getControllerFontStyle,
} from './utils/fonts';

export * from './utils/controller_proxies';
export * from './utils/controller_semantics';

export {
  decodeArrayData,
  getBindingArrayValue,
  getArrayData,
  getDimensionsAndEncoding,
  getImageData,
} from './utils/arrays';
