import React from 'react';
import { AccessLevel } from '@/karabo/data/enums';
import { useGlobalStore } from '@/store/api';
import type { PropertyProxies } from './utils/controller_proxies';
import {
  applyControllerEdits,
  declineControllerEdits,
} from './utils/controller_edit_actions';

// ControllerContainerContext
// ---

export type { PropertyProxies };

export interface ControllerEditHandlers {
  apply?: () => void;
  decline?: () => void;
}

export interface ControllerEditActions {
  apply: () => void;
  decline: () => void;
  /**
   * Register from a controller effect and return the cleanup on unmount.
   * Handlers run after the default action for keyboard and toolbar commands.
   */
  register: (handlers: ControllerEditHandlers) => () => void;
}

export interface ControllerContainerContext {
  proxy: PropertyProxies[number] | undefined;
  proxies: PropertyProxies;
  userAccessLevel: AccessLevel;
  editActions?: ControllerEditActions;
}

const getProxy = (
  propertyProxies: PropertyProxies
): PropertyProxies[number] | undefined => propertyProxies[0];

// useController
// ---
// Receives ordered live proxies already created by useProxies.
// Owns: root-slot semantics for the controller root proxy.

export function useController(
  propertyProxies: PropertyProxies
): ControllerContainerContext {
  const userAccessLevel = useGlobalStore(
    (s) => s.sessionInfo?.accessLevel ?? AccessLevel.OBSERVER
  );
  const handlersRef = React.useRef<ControllerEditHandlers | undefined>(
    undefined
  );
  const register = React.useCallback((handlers: ControllerEditHandlers) => {
    handlersRef.current = handlers;
    return () => {
      if (handlersRef.current === handlers) handlersRef.current = undefined;
    };
  }, []);

  const editActions = React.useMemo<ControllerEditActions>(
    () => ({
      apply: () => {
        applyControllerEdits(propertyProxies);
        handlersRef.current?.apply?.();
      },
      decline: () => {
        declineControllerEdits(propertyProxies);
        handlersRef.current?.decline?.();
      },
      register,
    }),
    [propertyProxies, register]
  );

  return React.useMemo(
    () => ({
      proxy: getProxy(propertyProxies),
      proxies: propertyProxies,
      userAccessLevel,
      editActions,
    }),
    [propertyProxies, userAccessLevel, editActions]
  );
}
