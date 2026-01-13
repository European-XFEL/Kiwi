import React from 'react';
import {
  ControllerContainer,
  type ControllerContainerContext,
} from '@/features/scene_view/ControllerContainer';
import type { BaseControllerWidgetProps } from '@/scene/scene_types/controller_base';

/**
 * ControllerContainerWrapper - HOC utility for wrapping controller components
 *
 * Purpose:
 * - Wraps controller components with ControllerContainer
 * - Normalizes props (keys, x, y, width, height defaults)
 * - Injects runtime context from ControllerContainer to component props
 *
 * Context injected into components:
 * - primary: Full UseDevicePropertyResult (device data)
 * - canEdit: Permission check result
 * - isEnabled: Enabled state
 * - tooltipText: Computed tooltip
 * - proxyStatus: Device connection status
 * - propertyMissing: Missing property indicator
 * - hasPendingEdits: Pending changes state
 *
 * Usage:
 * const WrappedComponent = ControllerContainerWrapper.wrap(MyComponent);
 *
 * File naming:
 * - ControllerContainerWrapper.tsx → class ControllerContainerWrapper (HOC utility)
 * - BaseControllerContainerModel.tsx → class BaseControllerContainerModel (base class)
 */
export class ControllerContainerWrapper {
  static wrap<P extends BaseControllerWidgetProps>(
    Component: React.ComponentType<P>
  ): React.FC<P> {
    const Wrapped = (props: P) => {
      const normalized: P & { showMissingPropertyOverlay?: boolean } = {
        ...(props as any),
        keys: (props as any).keys ?? [],
        x: (props as any).x ?? 0,
        y: (props as any).y ?? 0,
        width: (props as any).width ?? 0,
        height: (props as any).height ?? 0,
      };

      const { showMissingPropertyOverlay, ...componentProps } =
        normalized as any;

      return (
        <ControllerContainer
          keys={normalized.keys}
          x={normalized.x}
          y={normalized.y}
          width={normalized.width}
          height={normalized.height}
          showMissingPropertyOverlay={showMissingPropertyOverlay}
        >
          {(ctx: ControllerContainerContext) => (
            <Component
              {...(componentProps as P)}
              canEdit={ctx.canEdit}
              isEnabled={ctx.isEnabled}
              disabledReason={ctx.disabledReason}
              tooltipText={ctx.tooltipText}
              proxyStatus={ctx.proxyStatus}
              propertyMissing={ctx.propertyMissing}
              hasPendingEdits={ctx.hasPendingEdits}
              primary={ctx.primary as any}
            />
          )}
        </ControllerContainer>
      );
    };

    Wrapped.displayName = `WithControllerContainer(${
      Component.displayName || Component.name || 'Component'
    })`;

    return Wrapped;
  }
}
