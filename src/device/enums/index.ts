/**
 * ProxyStatus - Lifecycle states of a DeviceProxy
 *
 * State transitions:
 * OFFLINE → ONLINE → SCHEMA_REQUESTED → SCHEMA_RECEIVED → ALIVE → MONITORING
 *    ↑                                                                   ↓
 *    └───────────────────────────────────────────────────────────────────┘
 */
export enum ProxyStatus {
  UNKNOWN = "UNKNOWN",
  /**
   * Device is not running or not in topology
   */
  OFFLINE = "OFFLINE",

  /**
   * Device is in topology but no schema requested yet
   * (Occurs when device comes online but no widget is watching)
   */
  ONLINE = "ONLINE",

  /**
   * Schema has been requested from GUI server
   * Waiting for deviceSchema message
   */
  SCHEMA_REQUESTED = "SCHEMA_REQUESTED",

  /**
   * Schema received, waiting for initial configuration
   * Binding is created but no values yet
   */
  SCHEMA_RECEIVED = "SCHEMA_RECEIVED",

  /**
   * Device has schema + configuration
   * Fully functional but not actively monitored
   * (_monitorCount = 0)
   */
  ALIVE = "ALIVE",

  /**
   * Device is actively being monitored
   * Receiving real-time configuration updates
   * (_monitorCount > 0)
   */
  MONITORING = "MONITORING",

  // Optional error states (if needed):

  /**
   * Device server is not available
   */
  // NO_SERVER = "NO_SERVER",

  /**
   * Device class/plugin not found on server
   */
  // NO_PLUGIN = "NO_PLUGIN",

  /**
   * Device is running but wrong class (schema mismatch)
   */
  // INCOMPATIBLE = "INCOMPATIBLE",
}

/**
 * PropertyStatus - Status of an individual property
 *
 * Used for property-level overlay indicators (e.g., "??" for missing)
 */
export enum PropertyStatus {
  /**
   * Property exists and has a value
   * No special indicator needed
   */
  NONE = "NONE",

  /**
   * Property does not exist in device schema
   * Display "??" indicator
   */
  MISSING = "MISSING",

  // Optional additional states:

  /**
   * Property exists in schema but no value received yet
   * (Schema arrived but config hasn't)
   */
  // NO_VALUE = "NO_VALUE",

  /**
   * Property value is stale (outdated timestamp)
   */
  // STALE = "STALE",

  /**
   * Property has a pending edit (editValue !== null)
   */
  // EDITED = "EDITED",
}
