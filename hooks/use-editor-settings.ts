"use client";

import { useEffect, useState, useLayoutEffect } from "react";

// Use useLayoutEffect on client, useEffect on server
const useIsomorphicLayoutEffect =
	typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Editor fonts - all available fonts for writing
export const fonts = [
	{ value: "system", label: "System Default" },
	{ value: "avenir", label: "Avenir Next" },
	{ value: "serif", label: "Lora (Serif)" },
	{ value: "merriweather", label: "Merriweather" },
	{ value: "inter", label: "Inter" },
	{ value: "mono", label: "JetBrains Mono" },
	{ value: "ubuntu", label: "Ubuntu" },
	{ value: "mono2", label: "Ubuntu Mono" },
	{ value: "agave", label: "Agave Nerd Font" },
] as const;

// UI fonts - readable fonts suitable for interface elements
export const uiFonts = [
	{ value: "system", label: "System Default" },
	{ value: "avenir", label: "Avenir Next" },
	{ value: "inter", label: "Inter" },
	{ value: "ubuntu", label: "Ubuntu" },
] as const;

export const tabSizes = [2, 4, 8] as const;

export type FontValue = (typeof fonts)[number]["value"];
export type UIFontValue = (typeof uiFonts)[number]["value"];

// Centralized font family mappings
// Using actual font names since Next.js font CSS variables may not resolve correctly
export const fontFamilyMap: Record<FontValue, string> = {
	system: "'Geist', system-ui, sans-serif",
	avenir: "'Avenir Next', 'Avenir', system-ui, sans-serif",
	serif: "'Lora', Georgia, serif",
	merriweather: "'Merriweather', Georgia, serif",
	inter: "'Inter', system-ui, sans-serif",
	mono: "'JetBrains Mono', monospace",
	ubuntu: "'Ubuntu', sans-serif",
	mono2: "'Ubuntu Mono', monospace",
	agave: "'AgaveNerdFontMono', monospace",
};
export type TabSize = (typeof tabSizes)[number];

const STORAGE_KEY_FONT = "editor.font";
const STORAGE_KEY_UI_FONT = "ui.font";
const STORAGE_KEY_MATCH_EDITOR_FONT = "ui.matchEditorFont";
const STORAGE_KEY_TAB_SIZE = "editor.tabSize";

const DEFAULT_FONT: FontValue = "avenir";
const DEFAULT_UI_FONT: UIFontValue = "avenir";
const DEFAULT_MATCH_EDITOR_FONT = true;
const DEFAULT_TAB_SIZE: TabSize = 4;

// Helper to apply fonts to the DOM
function applyFontsToDOM(
	editorFont: FontValue,
	uiFont: UIFontValue,
	matchEditorFont: boolean
) {
	if (typeof document === "undefined") return;

	const effectiveUIFont = matchEditorFont ? editorFont : uiFont;

	// Set data attribute for any CSS that needs it
	document.documentElement.dataset.editorFont = editorFont;

	// Apply UI font to body
	document.body.style.fontFamily = fontFamilyMap[effectiveUIFont];

	// Apply editor font to prose/editor elements via CSS variable
	document.documentElement.style.setProperty(
		"--editor-font-family",
		fontFamilyMap[editorFont]
	);
}

export function useEditorSettings() {
	const [font, setFont] = useState<FontValue>(DEFAULT_FONT);
	const [uiFont, setUIFont] = useState<UIFontValue>(DEFAULT_UI_FONT);
	const [matchEditorFont, setMatchEditorFont] = useState(DEFAULT_MATCH_EDITOR_FONT);
	const [tabSize, setTabSize] = useState<TabSize>(DEFAULT_TAB_SIZE);

	// Sync from localStorage on mount (client-side only)
	useIsomorphicLayoutEffect(() => {
		if (typeof window === "undefined") return;

		// Sync editor font
		const storedFont = window.localStorage.getItem(STORAGE_KEY_FONT);
		const editorFontValue =
			storedFont && fonts.some((f) => f.value === storedFont)
				? (storedFont as FontValue)
				: DEFAULT_FONT;
		setFont(editorFontValue);

		// Sync UI font
		const storedUIFont = window.localStorage.getItem(STORAGE_KEY_UI_FONT);
		const uiFontValue =
			storedUIFont && uiFonts.some((f) => f.value === storedUIFont)
				? (storedUIFont as UIFontValue)
				: DEFAULT_UI_FONT;
		setUIFont(uiFontValue);

		// Sync match editor font toggle
		const storedMatch = window.localStorage.getItem(STORAGE_KEY_MATCH_EDITOR_FONT);
		const matchValue = storedMatch !== null ? storedMatch === "true" : DEFAULT_MATCH_EDITOR_FONT;
		setMatchEditorFont(matchValue);

		// Apply fonts
		applyFontsToDOM(editorFontValue, uiFontValue, matchValue);

		// Sync tab size
		const storedTabSize = window.localStorage.getItem(STORAGE_KEY_TAB_SIZE);
		if (storedTabSize) {
			const parsed = parseInt(storedTabSize, 10);
			if (tabSizes.includes(parsed as TabSize)) {
				setTabSize(parsed as TabSize);
			}
		}
	}, []);

	// Apply fonts whenever they change
	useIsomorphicLayoutEffect(() => {
		applyFontsToDOM(font, uiFont, matchEditorFont);
	}, [font, uiFont, matchEditorFont]);

	// Apply tab size to document
	useEffect(() => {
		if (typeof document === "undefined") return;
		document.documentElement.style.setProperty(
			"--editor-tab-size",
			String(tabSize)
		);
	}, [tabSize]);

	const updateFont = (value: FontValue) => {
		if (!fonts.some((f) => f.value === value)) return;
		setFont(value);
		if (typeof window !== "undefined") {
			window.localStorage.setItem(STORAGE_KEY_FONT, value);
		}
	};

	const updateUIFont = (value: UIFontValue) => {
		if (!uiFonts.some((f) => f.value === value)) return;
		setUIFont(value);
		if (typeof window !== "undefined") {
			window.localStorage.setItem(STORAGE_KEY_UI_FONT, value);
		}
	};

	const updateMatchEditorFont = (value: boolean) => {
		setMatchEditorFont(value);
		if (typeof window !== "undefined") {
			window.localStorage.setItem(STORAGE_KEY_MATCH_EDITOR_FONT, String(value));
		}
	};

	const updateTabSize = (value: TabSize) => {
		if (!tabSizes.includes(value)) return;
		setTabSize(value);
		if (typeof window !== "undefined") {
			window.localStorage.setItem(STORAGE_KEY_TAB_SIZE, String(value));
		}
	};

	return {
		font,
		uiFont,
		matchEditorFont,
		tabSize,
		updateFont,
		updateUIFont,
		updateMatchEditorFont,
		updateTabSize,
	};
}
