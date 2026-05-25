/**
 * controllers — public API.
 *
 * External consumers (ElementRenderer, App) import from here.
 * Internal controller files may still use direct relative imports.
 */

export { ControllerContainer } from './components/ControllerContainer';
export type { ControllerContainerContext } from './components/ControllerContainer';
export type { ControllerPrimaryContext } from './hooks/useController';

export { useController } from './hooks/useController';
export { useProxies } from './hooks/useProxies';

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
