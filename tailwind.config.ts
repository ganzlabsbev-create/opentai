import type { Config } from "tailwindcss";

/**
 * Colors map directly onto the CSS variables defined in src/app/globals.css.
 * Do not hardcode hex values in components — always go through these
 * Tailwind tokens (bg-bg, text-text, border-border, etc.) so light/dark
 * theming stays centralized in one place, per ThaiAI_Architecture.md §3.
 */
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-sunk": "var(--surface-sunk)",
        "surface-elevated": "var(--surface-elevated)",
        text: "var(--text)",
        "text-muted": "var(--text-muted)",
        border: "var(--border)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        "accent-text": "var(--accent-text)",
        danger: "var(--danger)",
        "danger-soft": "var(--danger-soft)",
        success: "var(--success)",
        warning: "var(--warning)",
        "warning-soft": "var(--warning-soft)",
        overlay: "var(--overlay)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      spacing: {
        4.5: "18px",
      },
    },
  },
  plugins: [],
};

export default config;
