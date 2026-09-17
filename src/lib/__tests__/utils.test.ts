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

  it('unregisters only the disposed subscription when an owner has several', () => {
    const register = jest.spyOn(FinalizationRegistry.prototype, 'register');
    const unregister = jest.spyOn(FinalizationRegistry.prototype, 'unregister');
    try {
      const signal = new Signal();
      const owner = {};
      const first = jest.fn();
      const second = jest.fn();
      const stopFirst = signal.subscribe(owner, first);
      const stopSecond = signal.subscribe(owner, second);
      const firstToken = register.mock.calls[0][2];
      const secondToken = register.mock.calls[1][2];

      expect(firstToken).toBeDefined();
      expect(firstToken).not.toBe(secondToken);
      stopFirst();
      expect(unregister).toHaveBeenCalledWith(firstToken);
      signal.fire();
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);

      stopSecond();
      expect(unregister).toHaveBeenCalledWith(secondToken);
      signal.fire();
      expect(second).toHaveBeenCalledTimes(1);
    } finally {
      register.mockRestore();
      unregister.mockRestore();
    }
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

  it('unregisters only the removed subscription for a shared owner', () => {
    const register = jest.spyOn(FinalizationRegistry.prototype, 'register');
    const unregister = jest.spyOn(FinalizationRegistry.prototype, 'unregister');
    try {
      const signal = new Signal();
      const owner = {};
      const first = jest.fn();
      const second = jest.fn();
      const removeFirst = signal.subscribe(owner, first);
      const removeSecond = signal.subscribe(owner, second);
      const firstToken = register.mock.calls[0][2];
      const secondToken = register.mock.calls[1][2];
      expect(firstToken).toBeDefined();
      expect(secondToken).not.toBe(firstToken);

      removeFirst();
      removeFirst();
      signal.fire();
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
      expect(unregister).toHaveBeenCalledTimes(1);
      expect(unregister).toHaveBeenCalledWith(firstToken);
      removeSecond();
      expect(unregister).toHaveBeenLastCalledWith(secondToken);
    } finally {
      register.mockRestore();
      unregister.mockRestore();
    }
  });

  // Run with node --expose-gc to test actual collection, not mocked weak references.
  const gcTest = global.gc ? it : it.skip;
  gcTest(
    'collects an owner captured by its handler even when unsubscribe is retained',
    async () => {
      const signal = new Signal();
      let calls = 0;
      function attach() {
        const owner = { update: () => calls++ };
        const unsubscribe = signal.subscribe(owner, () => owner.update());
        return { reference: new WeakRef(owner), unsubscribe };
      }
      const { reference, unsubscribe } = attach();
      signal.fire();
      expect(calls).toBe(1);
      for (let i = 0; i < 5; i++) {
        await sleep(0);
        global.gc!();
      }
      expect(reference.deref()).toBeUndefined();
      signal.fire();
      expect(calls).toBe(1);
      unsubscribe();
    }
  );

  gcTest(
    'keeps inline handlers available while their owner is alive',
    async () => {
      const signal = new Signal<[number]>();
      const owner = { total: 0 };
      signal.subscribe(owner, (amount) => {
        owner.total += amount;
      });
      await sleep(0);
      global.gc!();
      signal.fire(3);
      expect(owner.total).toBe(3);
    }
  );
});
