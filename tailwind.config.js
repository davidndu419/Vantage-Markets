/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bgMain: "#0A0E1A",
        surface: "#111827",
        borderCustom: "#1F2937",
        goldAccent: "#C9A84C",
        goldHover: "#B8923E",
        textPrimary: "#F0F0F0",
        textSecondary: "#9CA3AF",
        success: "#22C55E",
        danger: "#EF4444",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
        btn: "8px",
      },
      spacing: {
        'btn-h': '48px',
      }
    },
  },
  plugins: [],
}
