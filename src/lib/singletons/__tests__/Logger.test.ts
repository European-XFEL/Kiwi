import { Logger, type LogLevel } from '../Logger';
import { getLogger } from '../api';
import { SingletonContext } from '@/testing';

describe('Logger', () => {
  let context: SingletonContext;

  beforeEach(() => {
    context = new SingletonContext({ logger: new Logger() });
    for (const level of ['debug', 'info', 'warn', 'error'] as const) {
      jest.spyOn(console, level).mockImplementation(() => {});
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
    context.restore();
  });

  it('uses the singleton factory', () => {
    expect(getLogger()).toBe(getLogger());
    expect(getLogger()).toBeInstanceOf(Logger);
  });

  it.each<LogLevel>(['debug', 'info', 'warn', 'error'])(
    'routes %s to the console and records a timestamped entry only with a subscriber',
    (level) => {
      const logger = new Logger();
      const initial = logger.getSnapshot();
      logger[level]('before mount');
      expect(console[level]).toHaveBeenCalledWith('before mount');
      expect(logger.getSnapshot()).toBe(initial);
      const listener = jest.fn();
      const unsubscribe = logger.subscribe(listener);
      jest.spyOn(Date, 'now').mockReturnValue(123456789);
      expect(logger[level]('mounted')).toBeUndefined();
      expect(logger.getSnapshot()).toEqual([
        { id: 0, timestamp: 123456789, level, message: 'mounted' },
      ]);
      expect(logger.getSnapshot()).toBe(logger.getSnapshot());
      expect(listener).toHaveBeenCalledTimes(1);
      unsubscribe();
      unsubscribe();
      const retained = logger.getSnapshot();
      logger[level]('after unmount');
      expect(console[level]).toHaveBeenCalledWith('after unmount');
      expect(logger.getSnapshot()).toBe(retained);
      expect(listener).toHaveBeenCalledTimes(1);
    }
  );

  it('retains the latest 100 entries with unique IDs and clears history', () => {
    const logger = new Logger();
    const listener = jest.fn();
    const unsubscribe = logger.subscribe(listener);
    for (let index = 0; index < 105; index++) logger.info(String(index));
    expect(logger.getSnapshot()).toHaveLength(100);
    expect(logger.getSnapshot()[0].message).toBe('5');
    expect(logger.getSnapshot()[99].message).toBe('104');
    expect(new Set(logger.getSnapshot().map((entry) => entry.id)).size).toBe(
      100
    );
    unsubscribe();
    logger.clear();
    expect(logger.getSnapshot()).toEqual([]);
    const nextListener = jest.fn();
    logger.subscribe(nextListener);
    logger.info('new');
    expect(logger.getSnapshot()[0].id).toBe(105);
    logger.clear();
    expect(nextListener).toHaveBeenCalledTimes(2);
    const empty = logger.getSnapshot();
    logger.clear();
    expect(logger.getSnapshot()).toBe(empty);
  });

  it('keeps collecting until the last subscriber leaves', () => {
    const logger = new Logger();
    const first = logger.subscribe(jest.fn());
    const second = logger.subscribe(jest.fn());
    first();
    logger.info('still mounted');
    second();
    logger.info('unmounted');
    expect(logger.getSnapshot().map((entry) => entry.message)).toEqual([
      'still mounted',
    ]);
  });
});
