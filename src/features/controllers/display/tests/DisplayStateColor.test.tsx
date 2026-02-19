import { render, screen } from '@testing-library/react';
import type { DisplayStateColorProps } from '@/scene/scene_types/controllers';
import { guiStateColors } from '@/lib/Indicators';

import type { UseDevicePropertyResult } from '@/lib/binding';
import { ProxyStatus, PropertyStatus } from '@/lib/binding/ProxyStatus';

const mockUseGuiStateColor = jest.fn();
jest.mock('@/features/controllers/display/hooks/useGuiStateColor', () => ({
  useGuiStateColor: (...args: any[]) => mockUseGuiStateColor(...args),
}));

import { DisplayStateColor } from '@/features/controllers';

function makePrimary(
  overrides: Partial<UseDevicePropertyResult> = {}
): UseDevicePropertyResult {
  return {
    value: undefined,
    propertyModel: undefined,
    timestamp: undefined,

    type: undefined,
    valueType: undefined,

    deviceState: 'ERROR',

    deviceId: 'DEVICE_X',
    propertyPath: 'state',

    descriptor: undefined,
    isEditable: false,
    schemaAttrs: undefined,

    proxyStatus: ProxyStatus.ALIVE,
    missing: undefined,

    isOffline: false,

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
    keys: ['DEVICE_X.state'],
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

describe('DisplayStateColor', () => {
  it('renders text when show_string=true and deviceState is non-empty', () => {
    const { container } = renderWithKey(
      makeProps({
        show_string: true,
        primary: makePrimary({ deviceState: 'ERROR' }),
      })
    );

    expect(screen.getByText('ERROR')).toBeInTheDocument();

    const displayElement = container.firstChild?.firstChild as HTMLElement;
    expect(displayElement).toHaveStyle(
      `background-color: ${guiStateColors.errorColor}`
    );
  });

  it('does not render text when show_string=false', () => {
    renderWithKey(
      makeProps({
        show_string: false,
        primary: makePrimary({ deviceState: 'ERROR' }),
      })
    );

    expect(screen.queryByText('ERROR')).not.toBeInTheDocument();
  });

  it('does not render text when show_string=true but deviceState is undefined', () => {
    renderWithKey(
      makeProps({
        show_string: true,
        primary: makePrimary({ deviceState: undefined }),
      })
    );

    expect(screen.queryByText('ERROR')).not.toBeInTheDocument();
  });

  it('still renders text when show_string=true even if primary.isOffline=true', () => {
    renderWithKey(
      makeProps({
        show_string: true,
        primary: makePrimary({
          deviceState: 'ERROR',
          isOffline: true,
          proxyStatus: ProxyStatus.OFFLINE,
        }),
      })
    );

    expect(screen.getByText('ERROR')).toBeInTheDocument();
  });

  it('uses unknownColor for unmapped states (via hook)', () => {
    mockUseGuiStateColor.mockReturnValue({
      colorValue: guiStateColors.unknownColor,
    });

    const { container } = renderWithKey(
      makeProps({
        primary: makePrimary({ deviceState: 'not-a-known-state' }),
      })
    );

    const displayElement = container.firstChild?.firstChild as HTMLElement;
    expect(displayElement).toHaveStyle(
      `background-color: ${guiStateColors.unknownColor}`
    );
  });

  it('falls back to default gray when hook returns no colorValue', () => {
    mockUseGuiStateColor.mockReturnValue({ colorValue: undefined });

    const { container } = renderWithKey(
      makeProps({
        primary: makePrimary({ deviceState: 'ERROR' }),
      })
    );

    const displayElement = container.firstChild?.firstChild as HTMLElement;
    expect(displayElement).toHaveStyle('background-color: #cccccc');
  });

  it('uses tooltipText for title when provided', () => {
    const { container } = renderWithKey(
      makeProps({
        tooltipText: 'hello tooltip',
        primary: makePrimary({
          propertyIndicator: { label: 'indicator label' } as any,
        }),
      })
    );

    expect(container.firstChild as HTMLElement).toHaveAttribute(
      'title',
      'hello tooltip'
    );
  });

  it('falls back to propertyIndicator.label for title when tooltipText is not provided', () => {
    const { container } = renderWithKey(
      makeProps({
        tooltipText: undefined,
        primary: makePrimary({
          propertyIndicator: { label: 'indicator label' } as any,
        }),
      })
    );

    expect(container.firstChild as HTMLElement).toHaveAttribute(
      'title',
      'indicator label'
    );
  });
});
