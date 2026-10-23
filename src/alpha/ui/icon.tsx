import alert from "./icons/alert.svg";
import clock from "./icons/clock.svg";
import groups from "./icons/groups.svg";
import home from "./icons/home.svg";
import info from "./icons/info.svg";
import lock from "./icons/lock.svg";
import pulse from "./icons/pulse.svg";
import retry from "./icons/retry.svg";
import review from "./icons/review.svg";
import scenarios from "./icons/scenarios.svg";
import send from "./icons/send.svg";
import users from "./icons/users.svg";

// The Figma component library's icons (page 02, Icon/*), exported unchanged.
const icons = {
  alert,
  clock,
  groups,
  home,
  info,
  lock,
  pulse,
  retry,
  review,
  scenarios,
  send,
  users,
};

export type IconName = keyof typeof icons;

/**
 * A decorative icon in the current text color: the SVG file is the mask, so
 * one asset serves every color and both modes.
 */
export function Icon({
  className = "",
  name,
  size = 18,
}: {
  className?: string;
  name: IconName;
  size?: number;
}) {
  const mask = `url("${icons[name]}") center / contain no-repeat`;
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 bg-current ${className}`}
      style={{ width: size, height: size, mask, WebkitMask: mask }}
    />
  );
}
