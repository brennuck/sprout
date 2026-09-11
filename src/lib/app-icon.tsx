import { ImageResponse } from "next/og";

/**
 * Renders the Sprout mark as a PNG at any size. iOS ignores SVG touch icons,
 * so every icon surface (favicon, apple-touch-icon, manifest) is generated
 * from this one source at build/request time instead of checking in binaries.
 */
export function renderAppIcon(size: number, options: { maskable?: boolean } = {}) {
  const radius = options.maskable ? 0 : size * 0.22;

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#536345",
          borderRadius: radius,
        }}
      >
        <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
          <path d="M256 393V238" fill="none" stroke="#fff" strokeWidth={34} strokeLinecap="round" />
          <path d="M256 260c-72 0-126-48-126-119 72 0 126 48 126 119Z" fill="#e4e8de" />
          <path d="M256 218c72 0 126-43 126-107-72 0-126 43-126 107Z" fill="#fcf9f3" />
          <path d="M180 393h152" fill="none" stroke="#fff" strokeWidth={34} strokeLinecap="round" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
