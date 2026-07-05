import { Hash } from '@/karabo/data/api';
import { getManager, RequestHandler } from './singletons/api';

export function callDeviceSlot(
  handler: RequestHandler,
  instanceId: string,
  slotName: string,
  kwargs: Record<string, any> = {}
): string {
  /**
   * Call a device slot via the GUI server. This works with slots which
   * take a single `Hash` as an argument and reply with a `Hash`.
   *
   * handler signatures:
   *   - handler(success, reply)
   *   - handler(success, reply, request)
   *
   * Returns:
   *   token: A unique identifier for the call
   */
  // Prepare the parameters Hash
  const params = new Hash();
  for (const [key, value] of Object.entries(kwargs)) {
    params.set(key, value);
  }

  // Call the slot and return the token
  return getManager().callDeviceSlot(handler, instanceId, slotName, params);
}
