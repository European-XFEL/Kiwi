// In a real project, ensure these paths are correct relative to this file.
import { Network } from './Network';
import { ProjectDBConnector } from './ProjectDBConnector';
import { TopologyConnector } from './TopologyConnector';
import { Manager } from './Manager';
import { Mediator } from './Mediator';

// We use a Map for better performance and clarity than a plain object
export const singletons = new Map<string, any>();

interface Constructable<T> {
  new (): T;
}

/**
 * A factory function for building singleton getter functions.
 */
function buildGetter<T>(key: string, ClassRef: Constructable<T>): () => T {
  // The creator logic
  const creator = (): T => {
    const instance = new ClassRef();
    singletons.set(key, instance);
    return instance;
  };

  return (): T => {
    if (singletons.has(key)) {
      return singletons.get(key) as T;
    }
    return creator();
  };
}

export const getDbConn = buildGetter('db_conn', ProjectDBConnector);
export const getNetwork = buildGetter('network', Network);
export const getTopology = buildGetter('topology', TopologyConnector);
export const getManager = buildGetter('manager', Manager);
export const getMediator = buildGetter('mediator', Mediator);
