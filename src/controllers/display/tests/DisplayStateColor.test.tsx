import { render, screen } from '@testing-library/react';
import type { DisplayStateColorProps } from '@/scene/scene_types/controllers';
import { guiStateColors } from '@/karabo_data/Indicators';

import type { UseDevicePropertyResult } from '@/binding';

import { ProxyStatus, PropertyStatus } from '@/binding/ProxyStatus';

// ---------------------------------------------------
// MOCK: useGuiStateColor
// ---------------------------------------------------
const mockUseGuiStateColor = jest.fn();
jest.mock('@/controllers/display/hooks/useGuiStateColor', () => ({
  useGuiStateColor: (...args: any[]) => mockUseGuiStateColor(...args),
}));

// Import AFTER mocks
import { DisplayStateColor } from '@/controllers';

// ---------------------------------------------------
// Helpers
// ---------------------------------------------------
function makePrimary(
  overrides: Partial<UseDevicePropertyResult> = {}
): UseDevicePropertyResult {
  return {
    // core data
    value: undefined,
    propertyModel: undefined,
    timestamp: undefined,

    // types
    type: undefined,
    valueType: undefined,
    defaultValue: undefined,

    // device state
    deviceState: 'ERROR',
    stateColor: undefined,

    // identity
    deviceId: 'DEVICE_X',
    propertyPath: 'state',

    // schema / editability
    descriptor: undefined,
    isEditable: false,
    schemaAttrs: undefined,

    // device lifecycle
    proxyStatus: ProxyStatus.ALIVE,
    proxyIndicator: undefined,

    // derived flags
    isOffline: false,
    isAlive: true,
    isMonitoring: false,
    isOnlineLike: true,
    isReady: true,

    // property-level status
    propertyStatus: PropertyStatus.NONE,
    propertyIndicator: undefined,

    ...overrides,
  };
}

function makeProps(
  overrides: Partial<DisplayStateColorProps> = {}
): DisplayStateColorProps {
  return {
    element_type: 'widget',
    widget_type: 'DisplayStateColor',
    parent_component: 'DisplayComponent',
    x: 0,
    y: 0,
    width: 30,
    height: 20,
    keys: ['DEVICE_X.state'], // OK to keep even if not used in component now
    font_size: 10,
    font_weight: 'normal',
    show_string: false,
    tooltipText: undefined,
    primary: makePrimary(),
    ...overrides,
  };
}

function renderWithKey(p: DisplayStateColorProps & { key?: string }) {
  const { key, ...rest } = p;
  return render(<DisplayStateColor key={key} {...rest} />);
}

beforeEach(() => {
  mockUseGuiStateColor.mockReturnValue({
    colorValue: guiStateColors.errorColor,
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('DisplayStateColor - show_string behavior (new architecture)', () => {
  it('renders text when show_string=true and primary is online + ready', () => {
    const { container } = renderWithKey(
      makeProps({
        show_string: true,
        primary: makePrimary({
          deviceState: 'ERROR',
          isOnlineLike: true,
          isReady: true,
        }),
      })
    );

    expect(screen.getByText('ERROR')).toBeInTheDocument();

    // New DOM structure:
    // outer wrapper -> inner colored box
    const displayElement = container.firstChild?.firstChild as HTMLElement;

    expect(displayElement).toHaveStyle(
      `background-color: ${guiStateColors.errorColor}`
    );
  });

  it('does not render text when show_string=false (color only)', () => {
    const { container } = renderWithKey(
      makeProps({
        show_string: false,
        primary: makePrimary({ deviceState: 'ERROR' }),
      })
    );

    expect(screen.queryByText('ERROR')).not.toBeInTheDocument();

    const displayElement = container.firstChild?.firstChild as HTMLElement;

    expect(displayElement).toHaveStyle(
      `background-color: ${guiStateColors.errorColor}`
    );
  });

  it('hides text when show_string=true but primary.isOnlineLike=false', () => {
    renderWithKey(
      makeProps({
        show_string: true,
        primary: makePrimary({
          deviceState: 'ERROR',
          isOnlineLike: false,
          isReady: true,
          isOffline: true,
          proxyStatus: ProxyStatus.OFFLINE,
        }),
      })
    );

    expect(screen.queryByText('ERROR')).not.toBeInTheDocument();
  });

  it('hides text when show_string=true but primary.isReady=false', () => {
    renderWithKey(
      makeProps({
        show_string: true,
        primary: makePrimary({
          deviceState: 'ERROR',
          isOnlineLike: true,
          isReady: false,
        }),
      })
    );

    expect(screen.queryByText('ERROR')).not.toBeInTheDocument();
  });

  it('uses unknownColor for unmapped states (via hook)', () => {
    mockUseGuiStateColor.mockReturnValue({
      colorValue: guiStateColors.unknownColor,
    });

    const { container } = renderWithKey(
      makeProps({
        primary: makePrimary({
          deviceState: 'not-a-known-state',
        }),
      })
    );

    const displayElement = container.firstChild?.firstChild as HTMLElement;

    expect(displayElement).toHaveStyle(
      `background-color: ${guiStateColors.unknownColor}`
    );
  });

  it('falls back to default gray when hook returns no colorValue', () => {
    mockUseGuiStateColor.mockReturnValue({
      colorValue: undefined,
    });

    const { container } = renderWithKey(
      makeProps({
        primary: makePrimary({
          deviceState: 'ERROR',
        }),
      })
    );

    const displayElement = container.firstChild?.firstChild as HTMLElement;

    expect(displayElement).toHaveStyle(`background-color: #cccccc`);
  });
});
