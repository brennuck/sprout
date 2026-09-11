export type ThemePreference = "system" | "light" | "dark";
export const THEME_COOKIE = "sprout-theme";
export const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Match device" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function parseTheme(value: string | undefined | null): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}
