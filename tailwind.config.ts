import type { Config } from "tailwindcss";

const token = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: token("surface-base"),
        foreground: token("text-primary"),
        surface: {
          DEFAULT: token("surface-raised"),
          muted: token("surface-muted"),
          sunken: token("surface-sunken"),
          inverse: token("surface-inverse"),
        },
        overlay: token("overlay"),
        ink: {
          DEFAULT: token("text-primary"),
          secondary: token("text-secondary"),
          muted: token("text-muted"),
          inverse: token("text-inverse"),
        },
        brand: {
          DEFAULT: token("brand"),
          strong: token("brand-strong"),
          soft: token("brand-soft"),
          contrast: token("brand-contrast"),
        },
        positive: { DEFAULT: token("positive"), soft: token("positive-soft") },
        warning: { DEFAULT: token("warning"), soft: token("warning-soft") },
        danger: { DEFAULT: token("danger"), soft: token("danger-soft") },
        info: { DEFAULT: token("info"), soft: token("info-soft") },
        focus: token("focus"),
        line: {
          DEFAULT: token("border-subtle"),
          strong: token("border-strong"),
        },
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
      boxShadow: {
        card: "0 1px 2px hsl(var(--shadow-color) / 0.04), 0 8px 24px -12px hsl(var(--shadow-color) / 0.12)",
        float: "0 12px 32px -8px hsl(var(--shadow-color) / 0.25)",
        sheet: "0 -8px 40px -12px hsl(var(--shadow-color) / 0.35)",
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Georgia", "serif"],
      },
      transitionDuration: {
        instant: "var(--motion-instant)",
        quick: "var(--motion-quick)",
      },
      animation: {
        "fade-in": "fadeIn var(--motion-quick) ease-out forwards",
        "slide-up": "slideUp var(--motion-quick) cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
        "sheet-in": "sheetIn var(--motion-quick) cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
        "dialog-in": "dialogIn var(--motion-instant) ease-out forwards",
        float: "float 6s ease-in-out infinite",
        in: "animateIn var(--motion-instant) ease-out",
        shimmer: "shimmer 1.6s linear infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        sheetIn: {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        dialogIn: {
          "0%": { opacity: "0", transform: "scale(0.96) translateY(8px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        animateIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
