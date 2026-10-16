// Synced from classmate-ai/src/index.css — deep purple-black theme
// background: hsl(270 30% 5%), foreground: hsl(260 20% 92%), primary: hsl(256 90% 67%)

const dark = {
  text: "#e4e0f0",
  tint: "#8860f7",

  background: "#0a0812",   // hsl(270 30% 5%) deep purple-black
  foreground: "#e4e0f0",   // hsl(260 20% 92%)

  card: "#13101c",         // hsl(268 22% 9%)
  cardForeground: "#e4e0f0",

  primary: "#8860f7",      // hsl(256 90% 67%) violet
  primaryForeground: "#ffffff",

  secondary: "#1c1727",    // hsl(268 18% 13%)
  secondaryForeground: "#d5d0e8",

  muted: "#13101c",        // hsl(268 20% 9%)
  mutedForeground: "#a09ab8", // hsl(260 11% 66%)

  accent: "#160f1e",       // hsl(268 20% 10%)
  accentForeground: "#e4e0f0",

  destructive: "#ef4444",
  destructiveForeground: "#ffffff",

  border: "#1e1830",       // hsl(268 18% 12%)
  input: "#1e1830",
};

const colors = {
  // Both schemes use the same dark purple palette
  light: dark,
  dark,
  radius: 16,
};

export default colors;
