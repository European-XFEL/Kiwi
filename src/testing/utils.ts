import { singletons } from '@/lib/singletons/api';

export class SingletonContext {
  private replaced = new Map<string, any>();
  private keys: string[] = [];

  // Keep constructor private or public, but standard usage will be via run()
  constructor(overrides: Record<string, any>) {
    this.keys = Object.keys(overrides);
    for (const [key, obj] of Object.entries(overrides)) {
      if (singletons.has(key)) {
        this.replaced.set(key, singletons.get(key));
      }
      singletons.set(key, obj);
    }
  }

  restore() {
    for (const key of this.keys) {
      if (this.replaced.has(key)) {
        singletons.set(key, this.replaced.get(key));
      } else {
        singletons.delete(key);
      }
    }
  }

  static async run(
    overrides: Record<string, any>,
    fn: () => Promise<void> | void
  ) {
    const ctx = new SingletonContext(overrides);
    try {
      await fn(); // Run the test logic
    } finally {
      ctx.restore(); // Always cleanup, even if test fails
    }
  }
}
