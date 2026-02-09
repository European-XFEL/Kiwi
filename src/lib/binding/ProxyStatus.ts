/**
 * ProxyStatus - Lifecycle states of a DeviceProxy
 *
 * State transitions:
 * OFFLINE → ONLINE → SCHEMA_REQUESTED → SCHEMA_RECEIVED → ALIVE → MONITORING
 *    ↑                                                                   ↓
 *    └───────────────────────────────────────────────────────────────────┘
 */
export enum ProxyStatus {
  // device could, but is not started
  OFFLINE = 'offline',
  // the device is online but doesn't have a schema yet
  ONLINE = 'online',
  // online device waiting for its schema
  ONLINEREQUESTED = 'onlinerequested',
  // everything is up-and-running
  ALIVE = 'alive',
  // we are registered to monitor this device
  MONITORING = 'monitoring',
  // a schema is requested, but didnt arrive yet
  REQUESTED = 'requested',
  // the device has a schema, but no value yet
  SCHEMA = 'schema',
}

/**
 * PropertyStatus - Status of an individual property
 */
export enum PropertyStatus {
  NONE = 'NONE',
  MISSING = 'MISSING',
}
