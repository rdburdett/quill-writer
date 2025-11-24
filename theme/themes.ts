export const lightThemes = [
	"lavender-light",
	"sepia-light",
] as const;

export const darkThemes = [
	"midnight-dark",
	"neon-dark",
] as const;

export type LightTheme = (typeof lightThemes)[number];
export type DarkTheme = (typeof darkThemes)[number];

export const defaultLightTheme: LightTheme = "lavender-light";
export const defaultDarkTheme: DarkTheme = "midnight-dark";


