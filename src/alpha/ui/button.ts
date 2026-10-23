// Button styles from the Figma Button component (page 02): Primary for the one
// main action per view, Danger for ending or removing, and a disabled gray
// that is exempt from contrast requirements.
const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue disabled:cursor-not-allowed disabled:border-transparent disabled:bg-disabled-bg disabled:text-disabled-ink";

const sizes = {
  md: "h-10 px-4 text-ui",
  sm: "h-8 px-3 text-small",
};

const variants = {
  primary: "border-transparent bg-blue text-on-blue hover:bg-harbor",
  secondary: "border-ceil-2 bg-surface text-blue-text hover:bg-ceil",
  quiet: "border-transparent bg-transparent text-blue-text hover:bg-ceil",
  danger: "border-red-line bg-surface text-red hover:bg-red-tint",
  // Text uses the surface color so it stays readable on dark mode's light red.
  dangerSolid: "border-transparent bg-red text-surface",
};

export function button(
  variant: keyof typeof variants = "primary",
  size: keyof typeof sizes = "md",
) {
  return `${base} ${sizes[size]} ${variants[variant]}`;
}
