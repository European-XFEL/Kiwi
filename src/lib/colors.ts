/**
 * Shared UI colours.
 *
 * Values every widget agrees on, kept in one place so a future light/dark
 * theme has a single point to swap rather than a hex literal per component.
 */

/**
 * Background of a value field showing no state of its own.
 *
 * Display widgets that render a plain reading (DisplayFloat, DisplayList,
 * Evaluator, and DisplayLabel or DisplayAlarmFloat when nothing colours them)
 * fall back to this grey, matching the Karabo GUI.
 */
export const DEFAULT_VALUE_FIELD_BG = '#eeeeee';
