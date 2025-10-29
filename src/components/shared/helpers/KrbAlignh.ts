export function css_textAlign_for_KrbAlignh(
  krbAlignh: number | undefined
): "left" | "center" | "right" {
  let textAlign: "left" | "center" | "right" | undefined;
  switch (krbAlignh) {
    case 2:
      textAlign = "right";
      break;
    case 4:
      textAlign = "center";
      break;
    default:
      textAlign = "left";
  }
  return textAlign;
}
