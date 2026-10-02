import { act, cleanup, render, screen } from '@testing-library/react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip';

describe('TooltipContent fullscreen portal', () => {
  let fullscreenElement: HTMLElement | null;
  let fullscreenTarget: HTMLDivElement;
  let originalDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    fullscreenElement = null;
    fullscreenTarget = document.createElement('div');
    document.body.appendChild(fullscreenTarget);
    originalDescriptor = Object.getOwnPropertyDescriptor(
      document,
      'fullscreenElement'
    );
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => fullscreenElement,
    });
  });

  afterEach(() => {
    cleanup();
    fullscreenTarget.remove();
    if (originalDescriptor) {
      Object.defineProperty(document, 'fullscreenElement', originalDescriptor);
    } else {
      Reflect.deleteProperty(document, 'fullscreenElement');
    }
  });

  function renderTooltip() {
    return render(
      <Tooltip open>
        <TooltipTrigger>Controller</TooltipTrigger>
        <TooltipContent>device.property</TooltipContent>
      </Tooltip>,
      { container: fullscreenTarget }
    );
  }

  it('uses the body outside fullscreen', () => {
    renderTooltip();
    expect(document.body).toContainElement(screen.getByRole('tooltip'));
    expect(fullscreenTarget).not.toContainElement(screen.getByRole('tooltip'));
  });

  it('uses the fullscreen element when mounted during fullscreen', () => {
    fullscreenElement = fullscreenTarget;
    renderTooltip();
    expect(fullscreenTarget).toContainElement(screen.getByRole('tooltip'));
  });

  it('moves an open tooltip when entering and leaving fullscreen', () => {
    renderTooltip();
    act(() => {
      fullscreenElement = fullscreenTarget;
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(fullscreenTarget).toContainElement(screen.getByRole('tooltip'));

    act(() => {
      fullscreenElement = null;
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(document.body).toContainElement(screen.getByRole('tooltip'));
    expect(fullscreenTarget).not.toContainElement(screen.getByRole('tooltip'));
  });
});
