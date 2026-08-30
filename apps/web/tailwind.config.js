/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Overrides Tailwind's built-in `indigo` scale rather than adding a
      // new color name — every existing indigo-500/600/700 class across the
      // app picks this up automatically. Deeper and more blue than stock
      // Tailwind indigo (which leans purple) for a "clean & trustworthy"
      // feel appropriate to a donor/nonprofit platform.
      colors: {
        indigo: {
          50: "#f0f4ff",
          100: "#e0e9ff",
          200: "#c6d5fe",
          300: "#9fb6fc",
          400: "#7189f8",
          500: "#4d63f0",
          600: "#3646dd",
          700: "#2c37bd",
          800: "#272f97",
          900: "#252c78",
          950: "#181c49",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      borderRadius: {
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
      },
      boxShadow: {
        sm: "0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.06)",
      },
    },
  },
  plugins: [],
};
