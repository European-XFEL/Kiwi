import { render, screen, waitFor } from '@testing-library/react';
import type { DisplayStatefulIconProps } from '@/scene/scene_types/controllers';
import { FONT_BASE_SIZE } from '@/features/controllers/utils/fontDefaults';

import type { UsePropertyProxyUpdate } from '@/lib/binding/useDeviceProperty';
import { ProxyStatus, PropertyStatus } from '@/lib/binding/ProxyStatus';

// ---------------------------------------------------
// MOCK: statefulIcons map
// ---------------------------------------------------
jest.mock('../utils/statefulIcons', () => ({
  __esModule: true,
  statefulIconTextById: {}, // filled in beforeEach
}));

// ---------------------------------------------------
// MOCK: recolor helpers
// ---------------------------------------------------
const mockRecolorPreloadedSvg = jest.fn((svgXML: string) => ({
  svg: svgXML,
  metrics: { fromCache: false },
}));

jest.mock('../utils/loadAndRecolor', () => ({
  __esModule: true,
  recolorPreloadedSvg: (...args: Parameters<typeof mockRecolorPreloadedSvg>) =>
    mockRecolorPreloadedSvg(...args),
  getPreloadedCacheKey: jest.fn(() => 'mock-cache-key'),
}));

// ---------------------------------------------------
// MOCK: useGuiStateColor
// ---------------------------------------------------
const mockUseGuiStateColor = jest.fn();
jest.mock('@/features/controllers/display/hooks/useGuiStateColor', () => ({
  __esModule: true,
  useGuiStateColor: (...args: any[]) => mockUseGuiStateColor(...args),
}));

// Import AFTER mocks
import { statefulIconTextById } from '../utils/statefulIcons';
import { DisplayStatefulWidgetIcon as DisplayStatefulIcon } from '@/features/controllers';
// ^ if your new file path is different, update this import accordingly

// ---------------------------------------------------
// Helpers
// ---------------------------------------------------
function makePrimary(
  overrides: Partial<UsePropertyProxyUpdate> = {}
): UsePropertyProxyUpdate {
  return {
    value: 'ERROR',
    propertyModel: undefined,
    timestamp: undefined,

    type: undefined,
    valueType: undefined,
    defaultValue: undefined,

    deviceState: 'ERROR',
    stateColor: undefined,

    deviceId: 'DEVICE_X',
    propertyPath: 'state',

    descriptor: undefined,
    isEditable: false,
    schemaAttrs: undefined,

    proxyStatus: ProxyStatus.ALIVE,
    proxyIndicator: undefined,

    isOffline: false,
    isAlive: true,
    isMonitoring: false,
    isOnlineLike: true,
    isReady: true,

    propertyStatus: PropertyStatus.NONE,
    propertyIndicator: undefined,

    ...overrides,
  };
}

function makeProps(
  overrides: Partial<DisplayStatefulIconProps> = {}
): DisplayStatefulIconProps {
  return {
    element_type: 'widget',
    widget_type: 'DisplayStatefulIcon',
    parent_component: 'DisplayComponent',
    x: 10,
    y: 20,
    width: 40,
    height: 40,
    keys: ['DEVICE_X.state'],

    icon_name: 'icon_bs_det_beampos',
    font_size: FONT_BASE_SIZE,
    font_weight: 'normal',

    tooltipText: undefined,
    disabledReason: undefined,
    primary: makePrimary(),

    ...overrides,
  };
}

function renderWithKey(p: DisplayStatefulIconProps & { key?: string }) {
  const { key, ...rest } = p;
  return render(<DisplayStatefulIcon key={key} {...rest} />);
}

beforeEach(() => {
  jest.clearAllMocks();

  // Fill icon map
  Object.assign(statefulIconTextById, {
    icon_bs_det_beampos:
      '<svg id="icon_bs_det_beampos"><circle cx="20" cy="20" r="10" fill="#ffffff"/></svg>',
    icon_nitrogen_supply:
      '<svg id="icon_nitrogen_supply"><rect width="30" height="30" fill="#008000"/></svg>',
    icon_massflow:
      '<svg id="icon_massflow"><path d="M0,0 L100,0 L100,20 L0,20 Z" fill="#ffffff"/></svg>',
    icon_bdump:
      '<svg id="icon_bdump"><circle cx="15" cy="15" r="15" fill="#ffffff"/></svg>',
    icon_attenuator:
      '<svg id="icon_attenuator"><rect width="40" height="40" fill="#ffffff" stroke="#ffffff"/></svg>',
  });

  // Default GUI color response
  mockUseGuiStateColor.mockReturnValue({ colorValue: '#ff0000' });
});

describe('DisplayStatefulIcon', () => {
  it('renders recolored SVG for icon_bs_det_beampos', async () => {
    const { container } = renderWithKey(
      makeProps({ icon_name: 'icon_bs_det_beampos' })
    );

    await waitFor(() => {
      const svg = container.querySelector('svg#icon_bs_det_beampos');
      expect(svg).toBeInTheDocument();
    });

    expect(mockRecolorPreloadedSvg).toHaveBeenCalled();
  });

  it('renders nitrogen supply icon', async () => {
    const { container } = renderWithKey(
      makeProps({ icon_name: 'icon_nitrogen_supply' })
    );

    await waitFor(() => {
      const svg = container.querySelector('svg#icon_nitrogen_supply');
      expect(svg).toBeInTheDocument();
    });
  });

  it('renders massflow icon', async () => {
    const { container } = renderWithKey(
      makeProps({ icon_name: 'icon_massflow' })
    );

    await waitFor(() => {
      const svg = container.querySelector('svg#icon_massflow');
      expect(svg).toBeInTheDocument();
    });
  });

  it('renders attenuator icon', async () => {
    const { container } = renderWithKey(
      makeProps({ icon_name: 'icon_attenuator' })
    );

    await waitFor(() => {
      const svg = container.querySelector('svg#icon_attenuator');
      expect(svg).toBeInTheDocument();
    });
  });

  it('renders fallback when icon not found', () => {
    renderWithKey(makeProps({ icon_name: 'unknown_icon' }));

    // fallback svg prints icon_name as text
    expect(screen.getByText('unknown_icon')).toBeInTheDocument();
  });

  it('derives rawState from primary.value and calls useGuiStateColor', () => {
    renderWithKey(
      makeProps({
        primary: makePrimary({ value: 'ON' }),
      })
    );

    expect(mockUseGuiStateColor).toHaveBeenCalledWith('ON');
  });

  it('uses tooltipText in title when provided', () => {
    const { container } = renderWithKey(
      makeProps({ tooltipText: 'hello-tooltip' })
    );

    expect(container.firstChild).toHaveAttribute('title', 'hello-tooltip');
  });
});
