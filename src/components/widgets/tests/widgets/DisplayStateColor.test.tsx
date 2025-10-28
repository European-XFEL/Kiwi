import { render, screen } from "@testing-library/react";
import type { DisplayStateColorElementProps } from "../../../../karabo_data/SceneElements";
import { guiStateColors } from "../../../../karabo_data/Indicators";
import { TopologyConnector } from "@/karabo_connectors/TopologyConnector";

// --- Mock useKaraboPropertyInfo ---
const mockUseKaraboPropertyInfo = jest.fn();
jest.mock("../../shared/hooks/useKaraboProperty", () => ({
  useKaraboPropertyInfo: (...args: any[]) => mockUseKaraboPropertyInfo(...args),
}));

// --- Import component AFTER mocks ---
import DisplayStateColor from "../../display/DisplayStateColor";
import type { PropertyInfo } from "@/karabo_data/DeviceConfigInfo";

function makeProps(
  overrides: Partial<DisplayStateColorElementProps> = {}
): DisplayStateColorElementProps {
  return {
    key: "test-key",
    x: 0,
    y: 0,
    width: 30,
    height: 20,
    karaboKeys: "DEVICE_X.state",
    fontSize: 10,
    fontWeight: "NORMAL",
    showString: false,
    ...overrides,
  };
}

function renderWithKey(p: DisplayStateColorElementProps) {
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
  const mockProperty: PropertyInfo = {
    key: "state",
    value: "ERROR",
    type: 0, // not used
    timeAttrs: {} as any,
  };
  mockUseKaraboPropertyInfo.mockReturnValue({
    property: mockProperty,
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("DisplayStateColor - showString behavior", () => {
  it("renders text when showString=true and device is online", () => {
    jest.spyOn(TopologyConnector.inst, "isDeviceOnline").mockReturnValue(true);
    const { container } = renderWithKey(makeProps({ showString: true }));
    expect(screen.getByText("ERROR")).toBeInTheDocument();
    expect(container.firstChild as HTMLElement).toHaveStyle(
      `background-color: ${guiStateColors.errorColor}`
    );
  });

  it("does not render text when showString=false (color only)", () => {
    const { container } = renderWithKey(makeProps({ showString: false }));
    expect(screen.queryByText("ERROR")).not.toBeInTheDocument();
    expect(container.firstChild as HTMLElement).toHaveStyle(
      `background-color: ${guiStateColors.errorColor}`
    );
  });

  it("renders offline overlay and hides text when device is offline", () => {
    jest.spyOn(TopologyConnector.inst, "isDeviceOnline").mockReturnValue(false);
    const { container } = renderWithKey(makeProps({ showString: true }));
    expect(screen.queryByText("ERROR")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("uses unknownColor for unmapped states", () => {
    const mockProperty: PropertyInfo = {
      key: "state",
      value: "not-a-known-state",
      type: 0,
      timeAttrs: {} as any,
    };
    mockUseKaraboPropertyInfo.mockReturnValue({ property: mockProperty });

    const { container } = renderWithKey(makeProps());
    expect(container.firstChild as HTMLElement).toHaveStyle(
      `background-color: ${guiStateColors.unknownColor}`
    );
  });
});
