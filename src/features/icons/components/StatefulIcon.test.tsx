/** StatefulIconWidget — model-based tests. */

import { render, screen, waitFor } from '@testing-library/react';

// ---------------------------------------------------
// MOCK: @/features/icons (statefulIconTextById + recolor helpers)
// ---------------------------------------------------
const mockRecolorPreloadedSvg = jest.fn((svgXML: string) => ({
  svg: svgXML,
  metrics: { fromCache: false },
}));

const mockIconMap: Record<string, string> = {};

jest.mock('@/features/icons', () => ({
  __esModule: true,
  get statefulIconTextById() {
    return mockIconMap;
  },
  recolorPreloadedSvg: (...args: Parameters<typeof mockRecolorPreloadedSvg>) =>
    mockRecolorPreloadedSvg(...args),
  getPreloadedCacheKey: jest.fn(() => 'mock-cache-key'),
}));

// ---------------------------------------------------
// MOCK: useGuiStateColor
// ---------------------------------------------------
const mockUseGuiStateColor = jest.fn();
jest.mock('@/features/icons/hooks/useGuiStateColor', () => ({
  __esModule: true,
  useGuiStateColor: (...args: any[]) => mockUseGuiStateColor(...args),
}));

// Import AFTER mocks
import StatefulIconWidget from '@/features/scene-view/components/widgets/controllers/display/StatefulIconWidget';
import { StatefulIconWidgetModel } from '@/karabo/common/models/widgets/controllers/display';
import type { ControllerContainerContext } from '@/features/scene-view/components/ControllerContainer';

// ---------------------------------------------------
// Helpers
// ---------------------------------------------------
function makeModel(icon_name: string): StatefulIconWidgetModel {
  const m = new StatefulIconWidgetModel();
  m.icon_name = icon_name;
  return m;
}

function makeCtx(
  deviceState = 'UNKNOWN',
  overrides: Partial<ControllerContainerContext> = {}
): ControllerContainerContext {
  return {
    primary: { deviceState } as any,
    ...overrides,
  } as ControllerContainerContext;
}

function renderIcon(icon_name: string, ctx?: ControllerContainerContext) {
  return render(<StatefulIconWidget model={makeModel(icon_name)} ctx={ctx} />);
}

// ---------------------------------------------------
// Setup
// ---------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks();

  Object.assign(mockIconMap, {
    icon_bs_det_beampos:
      '<svg id="icon_bs_det_beampos"><circle cx="20" cy="20" r="10" fill="#ffffff"/></svg>',
    icon_nitrogen_supply:
      '<svg id="icon_nitrogen_supply"><rect width="30" height="30" fill="#008000"/></svg>',
    icon_massflow:
      '<svg id="icon_massflow"><path d="M0,0 L100,0 L100,20 L0,20 Z" fill="#ffffff"/></svg>',
    icon_attenuator:
      '<svg id="icon_attenuator"><rect width="40" height="40" fill="#ffffff" stroke="#ffffff"/></svg>',
  });

  mockUseGuiStateColor.mockReturnValue({ colorValue: '#ff0000' });
});

// ---------------------------------------------------
// Tests
// ---------------------------------------------------
describe('StatefulIconWidget', () => {
  it('renders recolored SVG for icon_bs_det_beampos', async () => {
    const { container } = renderIcon('icon_bs_det_beampos', makeCtx('ACTIVE'));

    await waitFor(() => {
      expect(
        container.querySelector('svg#icon_bs_det_beampos')
      ).toBeInTheDocument();
    });

    expect(mockRecolorPreloadedSvg).toHaveBeenCalled();
  });

  it('renders nitrogen supply icon', async () => {
    const { container } = renderIcon('icon_nitrogen_supply', makeCtx());

    await waitFor(() => {
      expect(
        container.querySelector('svg#icon_nitrogen_supply')
      ).toBeInTheDocument();
    });
  });

  it('renders massflow icon', async () => {
    const { container } = renderIcon('icon_massflow', makeCtx());

    await waitFor(() => {
      expect(container.querySelector('svg#icon_massflow')).toBeInTheDocument();
    });
  });

  it('renders attenuator icon', async () => {
    const { container } = renderIcon('icon_attenuator', makeCtx());

    await waitFor(() => {
      expect(
        container.querySelector('svg#icon_attenuator')
      ).toBeInTheDocument();
    });
  });

  it('renders fallback when icon not found', () => {
    renderIcon('unknown_icon', makeCtx());
    expect(screen.getByText('unknown_icon')).toBeInTheDocument();
  });

  it('passes deviceState from ctx to useGuiStateColor', () => {
    renderIcon('icon_bs_det_beampos', makeCtx('ON'));
    expect(mockUseGuiStateColor).toHaveBeenCalledWith('ON');
  });

  it('uses tooltipText from ctx in title when provided', () => {
    const { container } = renderIcon(
      'icon_bs_det_beampos',
      makeCtx('ACTIVE', { tooltipText: 'hello-tooltip' } as any)
    );
    expect(container.firstChild).toHaveAttribute('title', 'hello-tooltip');
  });

  it('falls back to icon_name in title when no ctx tooltip', () => {
    const { container } = renderIcon('icon_bs_det_beampos');
    expect(container.firstChild).toHaveAttribute(
      'title',
      'icon_bs_det_beampos'
    );
  });
});
