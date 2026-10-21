import { act, screen } from '@testing-library/react';
import {
  BindingRoot,
  DeviceProxy,
  DoubleBinding,
  PropertyProxy,
} from '@/lib/binding/api';
import { showBindingTooltip } from '../showBindingTooltip';

function makeProxy(path = 'speed') {
  const device = new DeviceProxy('DEV');
  device.binding = new BindingRoot();
  device.binding.value!.set(path, new DoubleBinding());
  return new PropertyProxy(device, path);
}

describe('showBindingTooltip', () => {
  let dismiss: (() => void) | undefined;

  beforeEach(() => jest.useFakeTimers());
  afterEach(async () => {
    await act(async () => dismiss?.());
    jest.useRealTimers();
  });

  async function show(proxy = makeProxy()) {
    await act(async () => {
      dismiss = showBindingTooltip({ proxy, clientX: 70, clientY: 105 });
    });
    return dismiss!;
  }

  it('expires after five seconds and removes the root container and portal', async () => {
    const before = Array.from(document.body.children);
    await show();
    expect(screen.getByRole('tooltip')).toHaveTextContent('DEV.speed');
    await act(async () => jest.advanceTimersByTime(4999));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await act(async () => jest.advanceTimersByTime(1));
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(Array.from(document.body.children)).toEqual(before);
  });

  it.each([false, true])(
    'restarts expiry on replacement (same property: %s)',
    async (same) => {
      const proxy = makeProxy();
      const oldDismiss = await show(proxy);
      await act(async () => jest.advanceTimersByTime(4000));
      await show(same ? proxy : makeProxy('other'));
      await act(async () => {
        oldDismiss();
        oldDismiss();
      });
      expect(screen.getAllByRole('tooltip')).toHaveLength(1);
      expect(screen.getByRole('tooltip')).toHaveTextContent(
        same ? 'DEV.speed' : 'DEV.other'
      );
      await act(async () => jest.advanceTimersByTime(4999));
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      await act(async () => jest.advanceTimersByTime(1));
      expect(screen.queryByRole('tooltip')).toBeNull();
    }
  );

  it('allows repeated dismissal and cancels the timer', async () => {
    const before = Array.from(document.body.children);
    const close = await show();
    await act(async () => {
      close();
      close();
    });
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(Array.from(document.body.children)).toEqual(before);
    await act(async () => jest.advanceTimersByTime(5000));
    expect(Array.from(document.body.children)).toEqual(before);
  });

  it('mounts a fixed client-coordinate anchor and portal in fullscreen', async () => {
    const fullscreen = document.createElement('div');
    document.body.append(fullscreen);
    const descriptor = Object.getOwnPropertyDescriptor(
      document,
      'fullscreenElement'
    );
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: fullscreen,
    });
    try {
      await show();
      expect(
        fullscreen.querySelector('[data-slot="tooltip-trigger"]')
      ).toHaveStyle({ position: 'fixed', left: '70px', top: '105px' });
      expect(fullscreen).toContainElement(screen.getByRole('tooltip'));
      await act(async () => dismiss?.());
      expect(fullscreen).toBeEmptyDOMElement();
    } finally {
      if (descriptor) {
        Object.defineProperty(document, 'fullscreenElement', descriptor);
      } else {
        Reflect.deleteProperty(document, 'fullscreenElement');
      }
      fullscreen.remove();
    }
  });
});
