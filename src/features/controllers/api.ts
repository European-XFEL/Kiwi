/**
 * controllers — public API.
 *
 * External consumers (ElementRenderer, App) import from here.
 * Internal controller files may still use direct relative imports.
 */

export { useController } from './hooks/useController';
export type { ControllerContainerContext } from './hooks/useController';
export { useProxies } from './hooks/useProxies';
export { useContainer } from './hooks/useContainer';
export { useDisplayTrendGraph } from './hooks/useDisplayTrendGraph';
export { useDisplayVectorGraph } from './hooks/useDisplayVectorGraph';
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
