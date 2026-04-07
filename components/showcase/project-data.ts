export type ProjectTone =
  | "yellow"
  | "cyan"
  | "lilac"
  | "rust"
  | "rose"
  | "mint";

export type ShowcaseProject = {
  id: string;
  index: string;
  name: string;
  tone: ProjectTone;
};

export const showcaseProjects: ShowcaseProject[] = [
  {
    id: "plattera",
    index: "01",
    name: "PLATTERA",
    tone: "yellow",
  },
  {
    id: "sinap",
    index: "02",
    name: "SINAP",
    tone: "cyan",
  },
  {
    id: "algent",
    index: "03",
    name: "ALGENT",
    tone: "lilac",
  },
  {
    id: "ralph-engine",
    index: "04",
    name: "RALPH ENGINE",
    tone: "rust",
  },
  {
    id: "prosada",
    index: "05",
    name: "PROSADA",
    tone: "rose",
  },
  {
    id: "chesstera",
    index: "06",
    name: "CHESSTERA",
    tone: "mint",
  },
];
