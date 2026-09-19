import { hashHue, initials } from "../lib/utils";

interface Props {
  name: string;
  size?: number;
}

// A colorful circle generated from the username, so every user looks unique
// without any profile picture.
export default function Avatar({ name, size = 32 }: Props) {
  const hue = hashHue(name);
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.round(size * 0.38)),
        background: `linear-gradient(135deg, hsl(${hue} 75% 58%), hsl(${(hue + 55) % 360} 75% 42%))`,
      }}
    >
      {initials(name)}
    </span>
  );
}
