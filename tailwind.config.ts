import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#015a8b",
        secondary: "#216f99",
      },
    },
  },
} satisfies Config;
