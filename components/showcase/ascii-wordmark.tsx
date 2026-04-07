import styles from "./showcase-shell.module.css";
import type { ProjectTone } from "./project-data";

const GLYPH_PALETTES: Record<ProjectTone, string[]> = {
  yellow: ["#", "%", "@", "=", "+"],
  cyan: ["#", "@", "%", ":", "="],
  lilac: ["#", "%", "*", "+", ":"],
  rust: ["#", "%", "x", "=", "+"],
  rose: ["#", "@", "*", "+", ":"],
  mint: ["#", "%", "@", "+", ":"],
};

const FONT_MAP: Record<string, string[]> = {
  A: ["01110", "10001", "11111", "10001", "10001"],
  C: ["01111", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "11110", "10000", "11111"],
  G: ["01111", "10000", "10111", "10001", "01110"],
  H: ["10001", "10001", "11111", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "11111"],
  L: ["10000", "10000", "10000", "10000", "11111"],
  N: ["10001", "11001", "10101", "10011", "10001"],
  O: ["01110", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "11110", "10000", "10000"],
  R: ["11110", "10001", "11110", "10010", "10001"],
  S: ["01111", "10000", "01110", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100"],
  " ": ["000", "000", "000", "000", "000"],
};

type AsciiWordmarkProps = {
  text: string;
  tone: ProjectTone;
  className?: string;
};

export function AsciiWordmark({
  text,
  tone,
  className = "",
}: AsciiWordmarkProps) {
  const lines = buildWordmarkLines(text, tone);
  const isWide = text.length > 9;

  return (
    <pre
      className={[
        styles.wordmark,
        styles[`tone${capitalizeTone(tone)}`],
        isWide ? styles.wordmarkWide : "",
        className,
      ].join(" ")}
      aria-label={text}
    >
      {lines.join("\n")}
    </pre>
  );
}

function buildWordmarkLines(text: string, tone: ProjectTone) {
  const palette = GLYPH_PALETTES[tone];
  const characters = Array.from(text.toUpperCase());

  return Array.from({ length: 5 }, (_, row) =>
    characters
      .map((character, characterIndex) => {
        const pattern = FONT_MAP[character] ?? FONT_MAP[" "];

        return pattern[row]
          .split("")
          .map((pixel, columnIndex) => {
            if (pixel === "0") {
              return " ";
            }

            return palette[(row + columnIndex + characterIndex) % palette.length];
          })
          .join("");
      })
      .join("  "),
  );
}

function capitalizeTone(tone: ProjectTone) {
  return tone.charAt(0).toUpperCase() + tone.slice(1);
}
