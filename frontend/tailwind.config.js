/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B1220",
        card: "#111827",
        accent: "#2563EB",
        warning: "#D97706",
        critical: "#DC2626",
        textPrimary: "#E5E7EB",
        textSecondary: "#9CA3AF",
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "Segoe UI", "sans-serif"],
        mono: ["IBM Plex Mono", "Consolas", "monospace"],
      },
      boxShadow: {
        panel: "0 14px 36px rgba(2, 8, 24, 0.42)",
        elevate: "0 20px 42px rgba(2, 8, 24, 0.58)",
      },
    },
  },
  plugins: [],
};
