"use client";

import { useEffect, useState, useLayoutEffect } from "react";

// Use useLayoutEffect on client, useEffect on server
const useIsomorphicLayoutEffect =
	typeof window !== "undefined" ? useLayoutEffect : useEffect;

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

export const tabSizes = [2, 4, 8] as const;

export type FontValue = (typeof fonts)[number]["value"];

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
const STORAGE_KEY_TAB_SIZE = "editor.tabSize";

const DEFAULT_FONT: FontValue = "system";
const DEFAULT_TAB_SIZE: TabSize = 4;

export function useEditorSettings() {
	const [font, setFont] = useState<FontValue>(DEFAULT_FONT);
	const [tabSize, setTabSize] = useState<TabSize>(DEFAULT_TAB_SIZE);

	// Sync from localStorage on mount (client-side only)
	useIsomorphicLayoutEffect(() => {
		if (typeof window === "undefined") return;

		// Sync font
		const storedFont = window.localStorage.getItem(STORAGE_KEY_FONT);
		if (storedFont && fonts.some((f) => f.value === storedFont)) {
			setFont(storedFont as FontValue);
			document.documentElement.dataset.editorFont = storedFont;
			document.body.style.fontFamily = fontFamilyMap[storedFont as FontValue];
		} else {
			document.documentElement.dataset.editorFont = DEFAULT_FONT;
			document.body.style.fontFamily = fontFamilyMap[DEFAULT_FONT];
		}

		// Sync tab size
		const storedTabSize = window.localStorage.getItem(STORAGE_KEY_TAB_SIZE);
		if (storedTabSize) {
			const parsed = parseInt(storedTabSize, 10);
			if (tabSizes.includes(parsed as TabSize)) {
				setTabSize(parsed as TabSize);
			}
		}
	}, []);

	// Apply font to document whenever it changes
	useIsomorphicLayoutEffect(() => {
		if (typeof document === "undefined") return;
		document.documentElement.dataset.editorFont = font;
		// Also set the font-family directly on body for immediate effect
		document.body.style.fontFamily = fontFamilyMap[font];
	}, [font]);

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
			// Immediately update the DOM for instant feedback
			document.documentElement.dataset.editorFont = value;
			document.body.style.fontFamily = fontFamilyMap[value];
		}
	};

	const updateTabSize = (value: TabSize) => {
		if (!tabSizes.includes(value)) return;
		setTabSize(value);
		if (typeof window !== "undefined") {
			window.localStorage.setItem(STORAGE_KEY_TAB_SIZE, String(value));
		}
	};

	return { font, tabSize, updateFont, updateTabSize };
}
