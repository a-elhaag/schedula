import { Config } from "tailwindcss";

/** @type {import('tailwindcss').Config} */
const config = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#F5F5F7",
        surface: "#FFFFFF",
        accent: "#0071E3",
        border: "#E8E8ED",
        text: {
          primary: "#1D1D1F",
          muted: "#6E6E73",
        },
      },
      fontFamily: {
        serif: ['"DM Serif Display"', "serif"],
        sans: ['"DM Sans"', "sans-serif"],
        mono: ["ui-monospace", "monospace"],
      },
      fontSize: {
        display: [
          "48px",
          { lineHeight: "1.1", letterSpacing: "-0.04em", fontWeight: "800" },
        ],
        heading: [
          "28px",
          { lineHeight: "1.2", letterSpacing: "-0.03em", fontWeight: "800" },
        ],
        subheading: [
          "17px",
          { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "700" },
        ],
        body: ["14px", { lineHeight: "1.6" }],
        label: [
          "11px",
          {
            lineHeight: "1",
            letterSpacing: "0.08em",
            fontWeight: "700",
            textTransform: "uppercase",
          },
        ],
      },
      borderRadius: {
        none: "0",
        sm: "8px",
        base: "12px",
        md: "16px",
        lg: "20px",
        xl: "28px",
        "2xl": "32px",
        "3xl": "36px",
        "4xl": "44px",
        "5xl": "48px",
        "6xl": "52px",
        full: "9999px",
      },
      boxShadow: {
        sm: "0 2px 8px rgba(0, 0, 0, 0.06)",
        base: "0 2px 12px rgba(0, 0, 0, 0.06)",
        md: "0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)",
        lg: "0 32px 90px rgba(29, 29, 31, 0.16)",
        "accent-sm": "0 4px 20px rgba(0, 113, 227, 0.267)",
        "accent-md": "0 8px 28px rgba(0, 113, 227, 0.4)",
        "red-sm": "0 4px 20px rgba(255, 59, 48, 0.267)",
        "red-md": "0 8px 28px rgba(255, 59, 48, 0.4)",
      },
    },
  },
  plugins: [],
};

export default config;
