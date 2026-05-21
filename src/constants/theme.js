export const C = {
  bg: "#060c17",
  surface: "#0c1525",
  card: "#101c30",
  border: "#1a2e4a",
  accent: "#f97316",
  accentDim: "#7c2d12",
  blue: "#3b82f6",
  green: "#10b981",
  red: "#ef4444",
  purple: "#8b5cf6",
  pink: "#ec4899",
  text: "#e2e8f0",
  muted: "#475569",
  dim: "#334155",
};

export const STYLE = [
  "@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');",
  "*, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }",
  "body { font-family:'DM Sans',sans-serif; background:#060c17; color:#e2e8f0; }",
  "::-webkit-scrollbar{width:4px;height:4px}",
  "::-webkit-scrollbar-track{background:#0b1322}",
  "::-webkit-scrollbar-thumb{background:#1e3050;border-radius:4px}",
  "input,textarea,select{font-family:'DM Sans',sans-serif}",
  "button{cursor:pointer}",
].join("\n");
