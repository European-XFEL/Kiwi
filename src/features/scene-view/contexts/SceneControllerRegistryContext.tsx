import React from 'react';
import type { BaseWidgetObjectData } from '@/karabo/common/api';
import type { ControllerContainerContext } from '@/features/controllers/api';

export interface SceneControllerRecord {
  id: string;
  model: BaseWidgetObjectData;
  ctx: ControllerContainerContext;
}

export interface SceneControllerRegistry {
  registerController(
    objectId: string,
    model: BaseWidgetObjectData,
    ctx: ControllerContainerContext
  ): void;
  unregisterController(objectId: string): void;
  getController(objectId: string): SceneControllerRecord | undefined;
  getDirtyProxies(): ControllerContainerContext['proxies'];
  hasDirtyProxies(): boolean;
  dispose(): void;
}

export const SceneControllerRegistryContext =
  React.createContext<SceneControllerRegistry | null>(null);

export interface SceneControllerRegistryProviderProps {
  registry: SceneControllerRegistry;
  children: React.ReactNode;
}

export function SceneControllerRegistryProvider({
  registry,
  children,
}: SceneControllerRegistryProviderProps) {
  return (
    <SceneControllerRegistryContext.Provider value={registry}>
      {children}
    </SceneControllerRegistryContext.Provider>
  );
}
