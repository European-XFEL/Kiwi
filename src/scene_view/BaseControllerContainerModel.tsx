import React from 'react';
import { BaseControllerWidgetModel } from '../scene/models/BaseModels';
import type { BaseControllerWidgetProps } from '../scene/scene_types/controller_base';
import { ControllerContainerWrapper } from './ControllerContainerWrapper';

/**
 * BaseControllerContainerModel - Abstract base class for all controller widgets
 *
 * Purpose:
 * - Automatically wraps React components with ControllerContainerWrapper
 * - Ensures all controller widgets get data injection and container logic
 * - Eliminates duplicate useDeviceProperty calls by centralizing at container level
 *
 * How it works:
 * 1. Child models (DisplayLabelElementModel, etc.) extend this class
 * 2. When reactComponent is accessed, it automatically wraps the component
 * 3. Wrapper injects `primary` prop with device data at runtime
 * 4. Component receives data without calling hooks directly
 *
 * File naming:
 * - BaseControllerContainerModel.tsx → class BaseControllerContainerModel (base class)
 * - ControllerContainerWrapper.tsx → class ControllerContainerWrapper (HOC (higher-order component) utility pattern)
 */
export abstract class BaseControllerContainerModel<
  PropsType extends BaseControllerWidgetProps,
> extends BaseControllerWidgetModel<PropsType> {
  private _rawComponent?: React.ComponentType<PropsType>;
  private _wrappedComponent?: React.ComponentType<PropsType>;
  private _warnedMissingComponent = false;

  get reactComponent(): React.FC<any> | undefined {
    if (!this._rawComponent) {
      if (!this._warnedMissingComponent) {
        console.warn(`${this.constructor.name} missing reactComponent`);
        this._warnedMissingComponent = true;
      }
      return undefined;
    }

    if (!this._wrappedComponent) {
      this._wrappedComponent = ControllerContainerWrapper.wrap(
        this._rawComponent
      ) as React.ComponentType<PropsType>;
    }

    return this._wrappedComponent as React.FC<any>;
  }

  set reactComponent(c: React.FC<any> | undefined) {
    this._rawComponent = c as React.ComponentType<PropsType>;
    this._wrappedComponent = undefined;
    this._warnedMissingComponent = false;
  }
}
