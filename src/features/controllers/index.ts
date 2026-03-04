/**
 * controllers — public API.
 *
 * External consumers (ElementRenderer, App) import from here.
 * Internal controller files may still use direct relative imports.
 */

export { ControllerContainer } from './components/ControllerContainer';
export type { ControllerContainerContext } from './components/ControllerContainer';

export { useController } from './hooks/useController';

export { bootstrapStatefulIcons } from './utils/bootstrapStatefulIcons';
