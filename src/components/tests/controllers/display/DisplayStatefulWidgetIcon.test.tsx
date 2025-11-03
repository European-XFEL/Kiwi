import { render, screen, waitFor } from "@testing-library/react";
import type { DisplayStatefulIconProps } from "@/scene/scene_types/controllers";
import { TopologyConnector } from "@/karabo_connectors/TopologyConnector";
import type { PropertyInfo } from "@/karabo_data/DeviceConfigInfo";
import { FONT_BASE_SIZE } from "../../../shared/helpers/QtFontDescriptor";

// --- Mock useKaraboPropertyInfo ---
const mockUseKaraboPropertyInfo = jest.fn();
jest.mock("@/components/shared/hooks/useKaraboProperty", () => ({
  useKaraboPropertyInfo: (...args: any[]) => mockUseKaraboPropertyInfo(...args),
}));

// --- Mock icon path helpers ---
const mockGetIconPaths = jest.fn();
const mockGetPrimaryIconPath = jest.fn();
jest.mock("@/shared/helpers/getIconPath", () => ({
  getIconPaths: (...args: any[]) => mockGetIconPaths(...args),
  getPrimaryIconPath: (...args: any[]) => mockGetPrimaryIconPath(...args),
}));

// --- Mock loadAndRecolorSvg ---
const mockLoadAndRecolorSvg = jest.fn();
jest.mock("@/components/shared/helpers/loadAndRecolor", () => ({
  loadAndRecolorSvg: (...args: any[]) => mockLoadAndRecolorSvg(...args),
}));

// --- Import component AFTER mocks ---
import DisplayStatefulWidgetIcon from "../../../controllers/display/DisplayStatefulWidgetIcon";

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
  return render(<DisplayStatefulWidgetIcon key={key} {...rest} />);
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

  // Device is online by default
  jest.spyOn(TopologyConnector.inst, "isDeviceOnline").mockReturnValue(true);
  jest
    .spyOn(TopologyConnector.inst, "registerDeviceInfoMonitor")
    .mockImplementation(() => {});
  jest
    .spyOn(TopologyConnector.inst, "unregisterDeviceInfoMonitor")
    .mockImplementation(() => {});

  // Default property state
  const mockProperty: PropertyInfo = {
    key: "state",
    value: "ERROR",
    type: 0,
    timeAttrs: {} as any,
  };
  mockUseKaraboPropertyInfo.mockReturnValue({
    property: mockProperty,
  });

  // Default icon paths
  mockGetIconPaths.mockReturnValue([
    "/icons/stateful/icon_bs_det_beampos.svg",
    "/icons/stateful/icon_bs_det_beampos.png",
    "/icons/stateful/icon_bs_det_beampos.jpg",
    "/icons/stateful/icon_bs_det_beampos.jpeg",
    "/icons/stateful/icon_bs_det_beampos.webp",
  ]);
  mockGetPrimaryIconPath.mockReturnValue("/icons/stateful/no_icon.svg");

  // Default: recoloring succeeds (returns { svg, metrics })
  mockLoadAndRecolorSvg.mockResolvedValue({
    svg: `<svg data-testid="recolored-svg"><circle cx="20" cy="20" r="10" fill="#ff0000" /></svg>`,
    metrics: undefined, // metrics are optional
  });
});

describe("DisplayStatefulWidgetIcon - Basic Tests", () => {
  it("renders offline overlay when device is offline", () => {
    jest.spyOn(TopologyConnector.inst, "isDeviceOnline").mockReturnValue(false);

    const { container } = renderWithKey(makeProps());

    // DeviceOfflineOverlay renders an SVG
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("loads and injects recolored SVG for icon_bs_det_beampos", async () => {
    renderWithKey(makeProps({ icon_name: "icon_bs_det_beampos" }));

    // Should call loadAndRecolorSvg
    await waitFor(() =>
      expect(mockLoadAndRecolorSvg).toHaveBeenCalledWith(
        "/icons/stateful/icon_bs_det_beampos.svg",
        expect.any(String),
        expect.objectContaining({
          stroke: false,
          fit: "contain",
        }),
        expect.any(Object)
      )
    );

    // SVG should be injected - waitFor handles the act() wrapper
    await waitFor(() =>
      expect(screen.getByTestId("recolored-svg")).toBeInTheDocument()
    );
  });

  it("loads nitrogen supply icon (with green color support)", async () => {
    mockGetIconPaths.mockReturnValue([
      "/icons/stateful/icon_nitrogen_supply.svg",
      "/icons/stateful/icon_nitrogen_supply.png",
    ]);

    renderWithKey(makeProps({ icon_name: "icon_nitrogen_supply" }));

    await waitFor(() =>
      expect(mockLoadAndRecolorSvg).toHaveBeenCalledWith(
        "/icons/stateful/icon_nitrogen_supply.svg",
        expect.any(String),
        expect.any(Object),
        expect.any(Object)
      )
    );

    // Wait for SVG to be rendered
    await waitFor(() =>
      expect(screen.getByTestId("recolored-svg")).toBeInTheDocument()
    );
  });

  it("loads massflow controller icon (wide aspect ratio)", async () => {
    mockGetIconPaths.mockReturnValue([
      "/icons/stateful/icon_massflow.svg",
      "/icons/stateful/icon_massflow.png",
    ]);

    renderWithKey(makeProps({ icon_name: "icon_massflow" }));

    await waitFor(() =>
      expect(mockLoadAndRecolorSvg).toHaveBeenCalledWith(
        "/icons/stateful/icon_massflow.svg",
        expect.any(String),
        expect.any(Object),
        expect.any(Object)
      )
    );

    // Wait for SVG to be rendered
    await waitFor(() =>
      expect(screen.getByTestId("recolored-svg")).toBeInTheDocument()
    );
  });

  it("falls back to PNG when SVG fails", async () => {
    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

    mockLoadAndRecolorSvg.mockRejectedValueOnce(new Error("SVG load failed"));
    mockGetIconPaths.mockReturnValue([
      "/icons/stateful/icon_bdump.svg",
      "/icons/stateful/icon_bdump.png",
    ]);

    renderWithKey(makeProps({ icon_name: "icon_bdump" }));

    await waitFor(() => {
      const img = screen.getByAltText(
        /icon_bdump - ERROR/i
      ) as HTMLImageElement;
      expect(img).toBeInTheDocument();
      expect(img.src).toContain("/icons/stateful/icon_bdump.png");
    });

    consoleWarnSpy.mockRestore();
  });

  it("uses no_icon fallback when all formats fail", async () => {
    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    // Configure mocks to simulate failure
    mockGetIconPaths.mockReturnValue(["/icons/stateful/unknown.svg"]);
    mockGetPrimaryIconPath.mockReturnValue("/icons/stateful/no_icon.svg");
    mockLoadAndRecolorSvg.mockReset();
    mockLoadAndRecolorSvg.mockRejectedValue(new Error("All failed"));

    renderWithKey(makeProps({ icon_name: "unknown" }));

    await waitFor(() => {
      const img = screen.getByAltText(/unknown - ERROR/i) as HTMLImageElement;
      expect(img).toBeInTheDocument();
      expect(img.src).toContain("/icons/stateful/no_icon.svg");
    });

    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("updates when state changes from ERROR to ACTIVE", async () => {
    const mockPropertyError: PropertyInfo = {
      key: "state",
      value: "ERROR",
      type: 0,
      timeAttrs: {} as any,
    };
    mockUseKaraboPropertyInfo.mockReturnValue({ property: mockPropertyError });

    const { rerender } = renderWithKey(makeProps());

    await waitFor(() =>
      expect(screen.getByRole("img", { name: /ERROR/i })).toBeInTheDocument()
    );

    // Change state to ACTIVE
    const mockPropertyActive: PropertyInfo = {
      key: "state",
      value: "ACTIVE",
      type: 0,
      timeAttrs: {} as any,
    };
    mockUseKaraboPropertyInfo.mockReturnValue({ property: mockPropertyActive });

    const props = makeProps();
    rerender(<DisplayStatefulWidgetIcon key="test-key" {...props} />);

    await waitFor(() =>
      expect(screen.getByRole("img", { name: /ACTIVE/i })).toBeInTheDocument()
    );
  });

  it("handles real icon names from your icon list", async () => {
    const realIcons = [
      "icon_gate_valve_rot",
      "icon_4_sector_detector_movable_qu",
      "icon_align_laser",
      "icon_attenuator",
      "icon_bent_crys_spec",
      "icon_comp_refl_lense",
      "icon_gas_bpm",
      "icon_kbmirror",
      "icon_manual_valve",
      "icon_mono",
      "icon_opt_laser_coupl",
      "icon_pba_gauge",
    ];

    for (const iconName of realIcons) {
      jest.clearAllMocks();

      mockGetIconPaths.mockReturnValue([
        `/icons/stateful/${iconName}.svg`,
        `/icons/stateful/${iconName}.png`,
      ]);

      const props = makeProps({ icon_name: iconName });
      const { unmount } = renderWithKey({ ...props, key: `test-${iconName}` });

      await waitFor(() =>
        expect(mockLoadAndRecolorSvg).toHaveBeenCalledWith(
          `/icons/stateful/${iconName}.svg`,
          expect.any(String),
          expect.any(Object),
          expect.any(Object)
        )
      );

      // Wait for SVG to render
      await waitFor(() =>
        expect(screen.getByTestId("recolored-svg")).toBeInTheDocument()
      );

      unmount();
    }
  });

  it("applies correct positioning and dimensions", () => {
    const { container } = renderWithKey(
      makeProps({ x: 100, y: 200, width: 50, height: 60 })
    );

    const figure = container.querySelector("figure");
    expect(figure).toHaveStyle({
      left: "100px",
      top: "200px",
      width: "50px",
      height: "60px",
    });
  });
});
