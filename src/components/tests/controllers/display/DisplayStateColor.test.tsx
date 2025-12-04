import { render, screen } from "@testing-library/react";
import type { DisplayStateColorProps } from "@/scene/scene_types/controllers";
import { guiStateColors } from "../../../../karabo_data/Indicators";
import { TopologyConnector } from "@/karabo_connectors/TopologyConnector";

// ---------------------------------------------------
// MOCK: ControllerContainer → renders children + overlay SVG
// ---------------------------------------------------
jest.mock("@/components/sceneView/ControllerContainer", () => ({
  ControllerContainer: ({ children }: { children: React.ReactNode }) => (
    <div>
      {children}
      <svg data-testid="overlay-svg" />
    </div>
  ),
  useControllerPermissions: () => ({
    canEdit: true,
    disabledReason: undefined,
  }),
}));

// ---------------------------------------------------
// MOCK: useDeviceProperty
// ---------------------------------------------------
const mockUseDeviceProperty = jest.fn();
jest.mock("@/components/shared/hooks/useDeviceProperty", () => ({
  useDeviceProperty: (...args: any[]) => mockUseDeviceProperty(...args),
}));

// ---------------------------------------------------
// MOCK: useGuiStateColor
// ---------------------------------------------------
const mockUseGuiStateColor = jest.fn();
jest.mock("@/components/shared/hooks/useGuiStateColor", () => ({
  useGuiStateColor: (...args: any[]) => mockUseGuiStateColor(...args),
}));

// Import AFTER mocks
import DisplayStateColor from "../../../controllers/display/DisplayStateColor";

function makeProps(
  overrides: Partial<DisplayStateColorProps> = {}
): DisplayStateColorProps {
  return {
    element_type: "widget",
    widget_type: "DisplayStateColor",
    parent_component: "DisplayComponent",
    x: 0,
    y: 0,
    width: 30,
    height: 20,
    keys: ["DEVICE_X.state"],
    font_size: 10,
    font_weight: "normal",
    show_string: false,
    ...overrides,
  };
}

function renderWithKey(p: DisplayStateColorProps & { key?: string }) {
  const { key, ...rest } = p;
  return render(<DisplayStateColor key={key} {...rest} />);
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
  // Mock useDeviceProperty to return ERROR state
  mockUseDeviceProperty.mockReturnValue({
    deviceState: "ERROR",
    isOnlineLike: true,
    isReady: true,
    value: "ERROR",
    model: undefined,
    timeAttrs: undefined,
    deviceId: "DEVICE_X",
    propertyPath: "state",
    stateColor: undefined,
    descriptor: undefined,
    isEditable: false,
    schemaAttrs: undefined,
    proxyStatus: 0,
    proxyIndicator: undefined,
    propertyStatus: 0,
    propertyIndicator: undefined,
    isOffline: false,
    isAlive: false,
    isMonitoring: false,
  });

  // Mock useGuiStateColor to return error color
  mockUseGuiStateColor.mockReturnValue({
    colorValue: guiStateColors.errorColor,
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("DisplayStateColor - show_string behavior", () => {
  it("renders text when show_string=true and device is online", () => {
    jest.spyOn(TopologyConnector.inst, "isDeviceOnline").mockReturnValue(true);
    const { container } = renderWithKey(makeProps({ show_string: true }));
    expect(screen.getByText("ERROR")).toBeInTheDocument();
    // ControllerContainer wrapper is firstChild, DisplayStateColor is firstChild.firstChild
    const displayElement = container.firstChild?.firstChild as HTMLElement;
    expect(displayElement).toHaveStyle(
      `background-color: ${guiStateColors.errorColor}`
    );
  });

  it("does not render text when show_string=false (color only)", () => {
    const { container } = renderWithKey(makeProps({ show_string: false }));
    expect(screen.queryByText("ERROR")).not.toBeInTheDocument();
    // ControllerContainer wrapper is firstChild, DisplayStateColor is firstChild.firstChild
    const displayElement = container.firstChild?.firstChild as HTMLElement;
    expect(displayElement).toHaveStyle(
      `background-color: ${guiStateColors.errorColor}`
    );
  });

  it("renders offline overlay and hides text when device is offline", () => {
    jest.spyOn(TopologyConnector.inst, "isDeviceOnline").mockReturnValue(false);

    // Mock useDeviceProperty to return offline state
    mockUseDeviceProperty.mockReturnValue({
      deviceState: "ERROR",
      isOnlineLike: false, // Device is offline
      isReady: true,
      value: "ERROR",
      model: undefined,
      timeAttrs: undefined,
      deviceId: "DEVICE_X",
      propertyPath: "state",
      stateColor: undefined,
      descriptor: undefined,
      isEditable: false,
      schemaAttrs: undefined,
      proxyStatus: 0,
      proxyIndicator: undefined,
      propertyStatus: 0,
      propertyIndicator: undefined,
      isOffline: true,
      isAlive: false,
      isMonitoring: false,
    });

    renderWithKey(makeProps({ show_string: true }));

    expect(screen.queryByText("ERROR")).not.toBeInTheDocument();

    //Now asserts against the mocked overlay SVG
    expect(screen.getByTestId("overlay-svg")).toBeInTheDocument();
  });

  it("uses unknownColor for unmapped states", () => {
    jest.spyOn(TopologyConnector.inst, "isDeviceOnline").mockReturnValue(true);

    // Mock useDeviceProperty to return unknown state
    mockUseDeviceProperty.mockReturnValue({
      deviceState: "not-a-known-state",
      isOnlineLike: true,
      isReady: true,
      value: "not-a-known-state",
      model: undefined,
      timeAttrs: undefined,
      deviceId: "DEVICE_X",
      propertyPath: "state",
      stateColor: undefined,
      descriptor: undefined,
      isEditable: false,
      schemaAttrs: undefined,
      proxyStatus: 0,
      proxyIndicator: undefined,
      propertyStatus: 0,
      propertyIndicator: undefined,
      isOffline: false,
      isAlive: false,
      isMonitoring: false,
    });

    // Mock useGuiStateColor to return unknown color
    mockUseGuiStateColor.mockReturnValue({
      colorValue: guiStateColors.unknownColor,
    });

    const { container } = renderWithKey(makeProps());
    // ControllerContainer wrapper is firstChild, DisplayStateColor is firstChild.firstChild
    const displayElement = container.firstChild?.firstChild as HTMLElement;
    expect(displayElement).toHaveStyle(
      `background-color: ${guiStateColors.unknownColor}`
    );
  });
});
