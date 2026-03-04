// Public registry API for cross-feature renderer registration.
// Keep this entrypoint lightweight to avoid SceneView bootstrap cycles.

export { registerRenderer, getRenderer } from './render/registry';
export type { Renderer } from './render/registry';
