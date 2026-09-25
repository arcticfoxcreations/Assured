import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--color-bg) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        "surface-2": "rgb(var(--color-surface-2) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        foreground: "rgb(var(--color-fg) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",
          foreground: "rgb(var(--color-primary-fg) / <alpha-value>)",
        },
        emergency: {
          DEFAULT: "rgb(var(--color-emergency) / <alpha-value>)",
          foreground: "rgb(var(--color-emergency-fg) / <alpha-value>)",
        },
        safe: "rgb(var(--color-safe) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--color-accent) / <alpha-value>)",
          foreground: "rgb(var(--color-accent-fg) / <alpha-value>)",
        },
        cream: "rgb(var(--color-cream) / <alpha-value>)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgb(39 51 48 / 0.04), 0 10px 26px -10px rgb(39 51 48 / 0.12)",
        soft: "0 18px 40px -18px rgb(39 51 48 / 0.16), 0 2px 8px -2px rgb(39 51 48 / 0.06)",
        "soft-hover": "0 22px 48px -16px rgb(39 51 48 / 0.2), 0 4px 10px -2px rgb(39 51 48 / 0.08)",
        glow: "0 10px 28px -8px rgb(var(--color-emergency) / 0.45)",
      },
      transitionTimingFunction: {
        calm: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // No scale here on purpose — a scale-up entrance reads as a "zoom",
        // which is exactly what felt off about the old Mewvi panel open.
        "panel-in": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "bubble-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "ping-slow": {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "100%": { transform: "scale(2.1)", opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "panel-in": "panel-in 0.22s cubic-bezier(0.22, 1, 0.36, 1) both",
        "bubble-in": "bubble-in 0.18s cubic-bezier(0.22, 1, 0.36, 1) both",
        "ping-slow": "ping-slow 2.2s cubic-bezier(0, 0, 0.2, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
