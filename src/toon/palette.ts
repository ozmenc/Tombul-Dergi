// Atom çağı paleti. Karakterlerin renkleri ve mürekkebi iki temada aynı kalır; zemin ve süsler temaya göre değişir.
export const CAST = {
  ink: "#2b2420",
  white: "#fbf6ea",
  coral: "#e4613f", coralD: "#b8452b",
  mustard: "#e8b43a", mustardD: "#c08a1e",
  teal: "#3fa7a0", tealD: "#257a74", tealL: "#8acfc6",
  blue: "#7f9cc0", blueD: "#5b789e", blueL: "#b5c8de",
  pink: "#f0b4a8",
  avocado: "#a7ae5b",
  chrome: "#c9cfcb", chromeD: "#8e9894",
};

export type Theme = "light" | "dark";

export const GROUND: Record<Theme, { wall: string; floor: string; line: string; orn: string[]; spark: string; rays: string }> = {
  light: { wall: "#f4ead5", floor: "#e6d8bc", line: "#2b2420", orn: ["#e9c9a3", "#bcd8d2", "#f0c9bd", "#cfd8e6"], spark: "#e4613f", rays: "#efe0c2" },
  dark: { wall: "#1d2636", floor: "#151c29", line: "#f2e8d2", orn: ["#2a3a52", "#24403f", "#3a2f3d", "#33405a"], spark: "#f0c252", rays: "#223047" },
};
