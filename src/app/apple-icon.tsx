import { renderAppIcon } from "@/lib/app-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iOS home-screen icon. iOS applies its own mask, so render edge-to-edge. */
export default function AppleIcon() {
  return renderAppIcon(180, { maskable: true });
}
