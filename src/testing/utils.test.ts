import { getTopology } from '@/lib/singletons/api';
import { SingletonContext } from './utils';

test('Test Singleton replacement', async () => {
  const mockTopology = { send: jest.fn() };

  // The logic inside the arrow function is your "scoped block"
  await SingletonContext.run({ topology: mockTopology }, () => {
    const net = getTopology();

    // Inside this block, the override is active
    expect(net).toBe(mockTopology);
  });

  // Back to normal automatically after the block finishes
  expect(getTopology()).not.toBe(mockTopology);
});
