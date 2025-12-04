import type { Events, EventSubscriber, EventName } from "../types";

export class EventEmitter<TEventName extends string = string> {
  private events: Events<TEventName> = new Map();

  constructor() {}

  /** Subscribe to an event */
  subscribe(
    eventName: EventName<TEventName>,
    subscriber: EventSubscriber
  ): void {
    let subscribers = this.events.get(eventName);
    if (!subscribers) {
      subscribers = [];
      this.events.set(eventName, subscribers);
    }
    subscribers.push(subscriber);
  }

  /** Unsubscribe from an event */
  unsubscribe(
    eventName: EventName<TEventName>,
    subscriber: EventSubscriber
  ): void {
    const subscribers = this.events.get(eventName);
    if (!subscribers) return;

    const filtered = subscribers.filter((sub) => sub !== subscriber);
    if (filtered.length === 0) {
      this.events.delete(eventName);
    } else {
      this.events.set(eventName, filtered);
    }
  }

  /** Emit / trigger an event */
  emit(eventName: EventName<TEventName>, ...args: any[]): void {
    const subscribers = this.events.get(eventName);
    if (!subscribers) return;

    // Important: copy array before calling!
    // Prevents issues if a listener calls .unsubscribe() during emit
    subscribers.slice().forEach((subscriber) => {
      try {
        subscriber(...args);
      } catch (err) {
        console.error("EventEmitter: listener threw error", err);
      }
    });
  }

  /**
   * Get the number of listeners for a specific event
   */
  listenerCount(eventName: EventName<TEventName>): number {
    return this.events.get(eventName)?.length ?? 0;
  }

  /** Subscribe to an event, but only once */
  once(eventName: EventName<TEventName>, subscriber: EventSubscriber): void {
    const wrapper: EventSubscriber = (...args) => {
      subscriber(...args);
      this.unsubscribe(eventName, wrapper);
    };
    this.subscribe(eventName, wrapper);
  }

  clear(eventName?: EventName<TEventName>): void {
    if (eventName) {
      this.events.delete(eventName);
    } else {
      this.events.clear();
    }
  }

  removeAllListeners(): void {
    this.events.clear();
  }
}
