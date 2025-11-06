import { render, waitFor } from "@testing-library/react";
import type { DisplayStatefulIconProps } from "@/scene/scene_types/controllers";
import { TopologyConnector } from "@/karabo_connectors/TopologyConnector";
import type { PropertyInfo } from "@/karabo_data/DeviceConfigInfo";
import { FONT_BASE_SIZE } from "../../../shared/helpers/QtFontDescriptor";

jest.mock("@/components/shared/helpers/statefulIcons", () => ({
  __esModule: true,
  statefulIconTextById: {}, // will be filled later
}));

jest.mock("@/components/shared/helpers/loadAndRecolor", () => ({
  __esModule: true,
  recolorPreloadedSvg: jest.fn((svgXML: string) => ({
    svg: svgXML,
    metrics: { fromCache: false },
  })),
  getPreloadedCacheKey: jest.fn(() => "mock-cache-key"),
}));

const mockUseKaraboPropertyInfo = jest.fn();
jest.mock("@/components/shared/hooks/useKaraboProperty", () => ({
  __esModule: true,
  useKaraboPropertyInfo: (...args: any[]) => mockUseKaraboPropertyInfo(...args),
}));

import { statefulIconTextById } from "@/components/shared/helpers/statefulIcons";
import DisplayStatefulIcon from "@/components/controllers/display/DisplayStatefulWidgetIcon";

function makeProps(
  overrides: Partial<DisplayStatefulIconProps> = {}
): DisplayStatefulIconProps {
  return {
    element_type: "widget",
    widget_type: "DisplayStatefulIcon",
    parent_component: "DisplayComponent",
    x: 10,
    y: 20,
    width: 40,
    height: 40,
    keys: ["DEVICE_X.state"],
    icon_name: "icon_bs_det_beampos",
    font_size: FONT_BASE_SIZE,
    font_weight: "normal",
    ...overrides,
  };
}

function renderWithKey(p: DisplayStatefulIconProps & { key?: string }) {
  const { key, ...rest } = p;
  return render(<DisplayStatefulIcon key={key} {...rest} />);
}

beforeAll(() => {
  const topologyConnector = TopologyConnector.inst;
  Object.defineProperty(topologyConnector, "systemTopology", {
    get: jest.fn(() => ({
      devices: [{ deviceId: "DEVICE_X" }],
      servers: [],
    })),
    set: jest.fn(),
  });
});

beforeEach(() => {
  jest.clearAllMocks();

  // ---- fill the icon map -------------------------------------------------
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

  // ---- device is online ---------------------------------------------------
  jest.spyOn(TopologyConnector.inst, "isDeviceOnline").mockReturnValue(true);
  jest
    .spyOn(TopologyConnector.inst, "registerDeviceInfoMonitor")
    .mockImplementation(() => {});
  jest
    .spyOn(TopologyConnector.inst, "unregisterDeviceInfoMonitor")
    .mockImplementation(() => {});

  // ---- default property ---------------------------------------------------
  const mockProperty: PropertyInfo = {
    key: "state",
    value: "ERROR",
    type: 0,
    timeAttrs: {} as any,
  };
  mockUseKaraboPropertyInfo.mockReturnValue({
    deviceId: "DEVICE_X",
    property: mockProperty,
  });
});

describe("DisplayStatefulWidgetIcon - Basic Tests", () => {
  it("renders offline overlay when device is offline", () => {
    jest.spyOn(TopologyConnector.inst, "isDeviceOnline").mockReturnValue(false);

    const { container } = renderWithKey(makeProps());

    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders recolored SVG for icon_bs_det_beampos", async () => {
    const { container } = renderWithKey(
      makeProps({ icon_name: "icon_bs_det_beampos" })
    );

    await waitFor(() => {
      const svg = container.querySelector("div.absolute svg");
      expect(svg).toBeInTheDocument();
      expect(svg?.innerHTML).toContain("circle");
    });
  });

  it("renders nitrogen supply icon (green)", async () => {
    const { container } = renderWithKey(
      makeProps({ icon_name: "icon_nitrogen_supply" })
    );

    await waitFor(() => {
      const svg = container.querySelector("div.absolute svg");
      expect(svg).toBeInTheDocument();
      expect(svg?.innerHTML).toContain("rect");
      expect(svg?.innerHTML).toContain("#008000");
    });
  });

  it("renders massflow icon (wide)", async () => {
    const { container } = renderWithKey(
      makeProps({ icon_name: "icon_massflow" })
    );

    await waitFor(() => {
      const svg = container.querySelector("div.absolute svg");
      expect(svg).toBeInTheDocument();
      expect(svg?.innerHTML).toContain("path");
    });
  });

  it("renders fallback when icon not found", () => {
    const { container } = renderWithKey(
      makeProps({ icon_name: "unknown_icon" })
    );

    const svg = container.querySelector("div.absolute svg");
    expect(svg).toBeInTheDocument();
    expect(svg?.textContent).toBe("unknown_icon");
  });

  it("renders attenuator icon correctly", async () => {
    const { container } = renderWithKey(
      makeProps({ icon_name: "icon_attenuator" })
    );

    await waitFor(() => {
      const svg = container.querySelector("div.absolute svg");
      expect(svg).toBeInTheDocument();
      expect(svg?.innerHTML).toContain("rect");
    });
  });

  it("applies correct positioning and dimensions", () => {
    const { container } = renderWithKey(
      makeProps({ x: 100, y: 200, width: 50, height: 60 })
    );

    const wrapper = container.querySelector("div.absolute");
    expect(wrapper).toHaveStyle({
      left: "100px",
      top: "200px",
      width: "50px",
      height: "60px",
    });
  });
});
