import { render, screen } from "@testing-library/react";
import type { DisplayStateColorElementProps } from "../../../karabo_data/SceneElements";
import { guiStateColors } from "../../../karabo_data/Indicators";

jest.mock("../../../store/systemTopologyStore", () => ({
  __esModule: true,
  default: jest.fn((selector) => {
    // Mock the store state
    const mockState = {
      topology: {
        devices: [{ deviceId: "DEVICE_X" }],
        servers: [],
      },
      setTopology: jest.fn(),
      updateTopology: jest.fn(),
    };

    // Call the selector with the mock state
    return selector(mockState);
  }),
}));

// Using the 'mock' prefix is one of the ways to mimic a hook - Jest allows this
const mockUseKaraboProperty = jest.fn();
jest.mock("./hooks/useKaraboProperty", () => ({
  useKaraboProperty: (...args: any[]) => mockUseKaraboProperty(...args),
}));

// Import component AFTER mocks
import DisplayStateColor from "./DisplayStateColor";

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
    isSrcDeviceOffline: () => false,
    ...overrides,
  };
}

// Helper to pass key directly (avoid React warning)
function renderWithKey(p: DisplayStateColorElementProps) {
  const { key, ...rest } = p;
  return render(<DisplayStateColor key={key} {...rest} />);
}

beforeEach(() => {
  // default mock value for most tests
  mockUseKaraboProperty.mockReturnValue({
    deviceId: "DEVICE_X",
    propertyId: "state",
    value: "ERROR",
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("DisplayStateColor - showString behavior", () => {
  it("renders text when showString=true and device is online", () => {
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

  it("renders offline overlay and hides text when offline", () => {
    renderWithKey(
      makeProps({ showString: true, isSrcDeviceOffline: () => true })
    );
    expect(screen.queryByText("ERROR")).not.toBeInTheDocument();
  });

  it("uses unknownColor for unmapped states", () => {
    mockUseKaraboProperty.mockReturnValue({
      deviceId: "DEVICE_X",
      propertyId: "state",
      value: "not-a-known-state",
    });
    const { container } = renderWithKey(makeProps());
    expect(container.firstChild as HTMLElement).toHaveStyle(
      `background-color: ${guiStateColors.unknownColor}`
    );
  });
});
