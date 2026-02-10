/**
 * registerBuilder.ts
 *
 * Higher-order function that registers a builder in the BuilderRegistry.
 * Acts as a decorator: wrap any builder function to auto-register it on import.
 */

import type { BuildMeta, BuilderFn } from './BuilderRegistry';
import { builderRegistry } from './BuilderRegistry';

export function registerBuilder(meta: BuildMeta) {
  return function <TBuilder extends BuilderFn>(builderFn: TBuilder): TBuilder {
    builderRegistry.register(meta, builderFn);
    return builderFn;
  };
}
