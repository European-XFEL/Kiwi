import { Signal, sleep } from '../utils';

describe('Signal', () => {
  it('should fire handlers with the correct arguments', () => {
    const signal = new Signal<[string, number]>();
    const owner = {};
    const mockHandler = jest.fn();

    signal.subscribe(owner, mockHandler);
    signal.fire('hello', 42);

    expect(mockHandler).toHaveBeenCalledTimes(1);
    expect(mockHandler).toHaveBeenCalledWith('hello', 42);
  });

  it('should stop firing after unsubscribe is called', () => {
    const signal = new Signal<[]>();
    const owner = {};
    const mockHandler = jest.fn();

    const unsubscribe = signal.subscribe(owner, mockHandler);

    signal.fire();
    expect(mockHandler).toHaveBeenCalledTimes(1);

    unsubscribe();

    signal.fire();
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it('should correctly bind "this" to the owner during execution', () => {
    const signal = new Signal<[number]>();

    class MockComponent {
      public total = 0;

      // Unbound prototype method
      public add(amount: number) {
        this.total += amount;
      }
    }

    const component = new MockComponent();

    signal.subscribe(component, MockComponent.prototype.add);
    signal.fire(10);
    signal.fire(5);

    // The handler successfully updated the specific instance's properties
    expect(component.total).toBe(15);

    signal.subscribe(component, component.add);
    signal.fire(50);
    expect(component.total).toBe(115);
  });

  // XXX: Define outside test scope
  // When this function finishes, its stack frame is instantly destroyed.
  function attachDoomedListener(
    signal: Signal<[string]>,
    callback: () => void
  ) {
    const temporaryOwner = { id: 'doomed' };
    signal.subscribe(temporaryOwner, callback);
  }

  it('should safely ignore handlers if the owner is garbage collected', async () => {
    const signal = new Signal<[string]>();
    let handlerCalled = false;

    // Call the separate function. Once this line finishes, V8 drops the reference.
    attachDoomedListener(signal, () => {
      handlerCalled = true;
    });

    if (!global.gc) {
      console.warn('Skipping GC test. Run Jest with: node --expose-gc');
      return;
    }
    await sleep(0);
    global.gc();
    global.gc();
    await sleep(0);

    signal.fire('test');
    expect(handlerCalled).toBe(false);
    expect((signal as any).subscribers.size).toBe(0);
  });
});
