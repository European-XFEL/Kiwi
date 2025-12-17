import { Deque } from '@datastructures-js/deque';

interface TimedHashDequeEntry {
  binHash: ArrayBuffer;
  queued_at: number; // When the hash was queued, in milliseconds
}

/** Data stored in the sliding windows gathered for statistics */
interface StatsWindowEntry {
  binSize: number;
  queued_at: number;
}

export class HashDeque {
  /** Time range, in milliseconds, of the statistics window for rates metrics  */
  private static _STATS_WINDOW_SIZE_MS = 5_000;
  private static _STATS_WINDOW_SIZE_SEC = this._STATS_WINDOW_SIZE_MS / 1_000;

  /** A deque of binary serialized hashes with timestamps of when they were queued*/
  private _deque = new Deque<TimedHashDequeEntry>();

  private _queueing_stats_deque = new Deque<StatsWindowEntry>();
  private _dequeueing_stats_deque = new Deque<StatsWindowEntry>();

  private _latestLatency?: number = undefined;

  pushHash = (binHash: ArrayBuffer): void => {
    const queueing_time = performance.now();
    this._deque.pushBack({
      binHash: binHash,
      queued_at: queueing_time,
    });
    // Advances the queueing statistics window
    while (
      this._queueing_stats_deque.size() > 0 &&
      queueing_time - this._queueing_stats_deque.front()!.queued_at >
        HashDeque._STATS_WINDOW_SIZE_MS
    ) {
      this._queueing_stats_deque.popFront();
    }

    // Add the attributes of the item just pushed to the stats window deque
    this._queueing_stats_deque.pushBack({
      binSize: binHash.byteLength,
      queued_at: queueing_time,
    });
  };

  popHash = (): ArrayBuffer | undefined => {
    const dequeueing_time = performance.now();
    const poppedItem = this._deque.popFront();
    if (poppedItem) {
      const binHash = poppedItem.binHash;
      this._latestLatency = performance.now() - poppedItem.queued_at;
      // Advances the dequeueing statistics window
      while (
        this._dequeueing_stats_deque.size() > 0 &&
        dequeueing_time - this._dequeueing_stats_deque.front()!.queued_at >
          HashDeque._STATS_WINDOW_SIZE_MS
      ) {
        this._dequeueing_stats_deque.popFront();
      }

      // Add the attributes of the item just popped to the stats window deque
      this._dequeueing_stats_deque.pushBack({
        binSize: binHash.byteLength,
        queued_at: dequeueing_time,
      });
      return binHash;
    } else return undefined;
  };

  /** Number of items currently in the deque */
  get itemsCount(): number {
    return this._deque.size();
  }

  /** The amount of time the latest item dequeued stayed on the queue (in
   * milliseconds). */
  get latestLatency(): number | undefined {
    return this._latestLatency;
  }

  /** Enqueueing rate in messages/second */
  get messageQueueingRate(): number {
    return this._queueing_stats_deque.size() / HashDeque._STATS_WINDOW_SIZE_SEC;
  }

  /** Enqueueing rate in bytes/second based on the size in bytes of the
   * binary serialized form of the enqueued hashes.
   */
  get messageSizeQueueingRate(): number {
    const stats_array = this._queueing_stats_deque.toArray();
    let binSizes = 0;
    for (const item of stats_array) {
      binSizes += item.binSize;
    }
    return binSizes / HashDeque._STATS_WINDOW_SIZE_SEC;
  }

  /** Dequeueing rate in messages/second */
  get messageDequeueingRate(): number {
    return (
      this._dequeueing_stats_deque.size() / HashDeque._STATS_WINDOW_SIZE_SEC
    );
  }

  /** Dequeueing rate in bytes/second based on the size in bytes of the
   * binary serialized form of the dequeued hashes.
   */
  get messageSizeDequeueingRate(): number {
    const stats_array = this._dequeueing_stats_deque.toArray();
    let binSizes = 0;
    for (const item of stats_array) {
      binSizes += item.binSize;
    }
    return binSizes / HashDeque._STATS_WINDOW_SIZE_SEC;
  }
}
