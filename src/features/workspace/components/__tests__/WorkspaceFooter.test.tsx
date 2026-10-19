import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@/components/api';
import { Logger } from '@/lib/singletons/Logger';
import { SingletonContext } from '@/testing';
import WorkspaceFooter from '../WorkspaceFooter';

jest.mock('@/app/api', () => ({
  Footer: jest.requireActual<typeof import('@/app/layouts/Footer')>(
    '@/app/layouts/Footer'
  ).default,
}));

describe('WorkspaceFooter latency', () => {
  let context: SingletonContext;

  beforeEach(() => {
    context = new SingletonContext({ logger: new Logger() });
  });

  afterEach(() => {
    cleanup();
    context.restore();
  });

  it.each([
    { latency: null, expected: '--' },
    { latency: 0, expected: '0.000' },
    { latency: 0.1254, expected: '0.125' },
  ])(
    'renders latency $latency as $expected without crashing',
    async ({ latency, expected }) => {
      const user = userEvent.setup();
      render(
        <TooltipProvider delayDuration={0}>
          <WorkspaceFooter
            footer={{ kind: 'app-footer', visible: true }}
            runtime={{
              connected: true,
              connectedFor: '00s',
              latestLatency: latency,
              queuedMessageCount: 3,
            }}
          />
        </TooltipProvider>
      );

      // Both responsive variants are in the DOM; hover the desktop status.
      const statuses = screen.getAllByText(/Connected for:/);
      await user.hover(statuses[statuses.length - 1]);

      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip).toHaveTextContent(`Latest Latency (sec): ${expected}`);
      expect(tooltip).toHaveTextContent('Messages Queued: 3');
      expect(
        screen.getByRole('button', { name: 'Application log' })
      ).toBeVisible();
    }
  );
});
