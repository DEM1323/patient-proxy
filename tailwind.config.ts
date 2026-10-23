import type { Config } from "tailwindcss";

const token = (name: string) => `var(--${name})`;

// Only the redesign's tokens exist as colors, so every color follows the
// light and dark modes defined in src/alpha/styles.css.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      inherit: "inherit",
      white: "#ffffff",
      ink: { DEFAULT: token("ink"), 2: token("ink-2"), 3: token("ink-3") },
      line: { DEFAULT: token("line"), 2: token("line-2") },
      canvas: token("canvas"),
      surface: token("surface"),
      sunken: token("sunken"),
      neutral: token("neutral"),
      blue: { DEFAULT: token("blue"), text: token("blue-text") },
      "on-blue": token("on-blue"),
      harbor: token("harbor"),
      rail: {
        DEFAULT: token("rail"),
        text: token("rail-text"),
        label: token("rail-label"),
      },
      ceil: { DEFAULT: token("ceil"), 2: token("ceil-2") },
      lav: {
        DEFAULT: token("lav"),
        tint: token("lav-tint"),
        ink: token("lav-ink"),
      },
      teal: {
        DEFAULT: token("teal"),
        tint: token("teal-tint"),
        line: token("teal-line"),
      },
      amber: {
        ink: token("amber-ink"),
        tint: token("amber-tint"),
        line: token("amber-line"),
      },
      red: {
        DEFAULT: token("red"),
        tint: token("red-tint"),
        line: token("red-line"),
      },
      disabled: { bg: token("dis-bg"), ink: token("dis-ink") },
      scrim: token("scrim"),
    },
    fontFamily: {
      sans: [token("font")],
    },
    extend: {
      // Figma "Patient Proxy/*" text styles: [size, line height, tracking].
      fontSize: {
        title: ["32px", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        heading: ["20px", { lineHeight: "1.4", letterSpacing: "-0.01em" }],
        subheading: ["16px", "1.55"],
        lede: ["15.5px", "1.55"],
        body: ["15px", "1.55"],
        ui: ["14.5px", "1.55"],
        compact: ["14px", "1.55"],
        label: ["13.5px", "1.55"],
        small: ["13px", "1.55"],
        caption: ["12.5px", "1.55"],
        meta: ["12px", "1.55"],
        chip: ["11.5px", "1.55"],
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "14px",
        bubble: "16px",
      },
    },
  },
} satisfies Config;
