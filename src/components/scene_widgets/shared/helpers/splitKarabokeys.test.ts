
import { splitKaraboKeys } from "./splitKaraboKeys";

describe("splitKaraboKeys (uses last dot)", () => {
  it.each([
    ["DEVICE_X.state", { deviceId: "DEVICE_X", propertyId: "state" }],
    [
      "DETLAB_LAB_AGIPD1M1/CTRL/MC1.aux",
      { deviceId: "DETLAB_LAB_AGIPD1M1/CTRL/MC1", propertyId: "aux" },
    ],

    ["A.B.C.prop.name", { deviceId: "A.B.C.prop", propertyId: "name" }],

    [".state", { deviceId: "", propertyId: "state" }],

    ["DEV.ID.", { deviceId: "DEV.ID", propertyId: "" }],
  ])('splits "%s"', (input, expected) => {
    expect(splitKaraboKeys(input)).toEqual(expected);
  });

  describe("edge cases", () => {
    it('empty string → device: "", property: ""', () => {
      expect(splitKaraboKeys("")).toEqual({ deviceId: "", propertyId: "" });
    });

  });
});
