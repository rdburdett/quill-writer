"use client";

import { useEffect, useState } from "react";

export const fonts = [
	{ value: "system", label: "System Default" },
	{ value: "serif", label: "Lora (Serif)" },
	{ value: "merriweather", label: "Merriweather" },
	{ value: "inter", label: "Inter" },
	{ value: "mono", label: "JetBrains Mono" },
	{ value: "ubuntu", label: "Ubuntu" },
	{ value: "mono2", label: "Ubuntu Mono" },
] as const;

export const tabSizes = [2, 4, 8] as const;

export type FontValue = (typeof fonts)[number]["value"];

// Centralized font family mappings
export const fontFamilyMap: Record<FontValue, string> = {
	system: "var(--font-geist-sans), system-ui, sans-serif",
	serif: "var(--font-lora), Georgia, serif",
	merriweather: "var(--font-merriweather), Georgia, serif",
	inter: "var(--font-inter), system-ui, sans-serif",
	mono: "var(--font-jetbrains), monospace",
	ubuntu: "var(--font-ubuntu), monospace",
	mono2: "var(--font-ubuntu-mono), monospace",
};
export type TabSize = (typeof tabSizes)[number];

const STORAGE_KEY_FONT = "editor.font";
const STORAGE_KEY_TAB_SIZE = "editor.tabSize";

const DEFAULT_FONT: FontValue = "system";
const DEFAULT_TAB_SIZE: TabSize = 4;

export function useEditorSettings() {
	const [font, setFont] = useState<FontValue>(() => {
		if (typeof window === "undefined") {
			return DEFAULT_FONT;
		}
		const stored = window.localStorage.getItem(STORAGE_KEY_FONT);
		return fonts.some((f) => f.value === stored)
			? (stored as FontValue)
			: DEFAULT_FONT;
	});

	const [tabSize, setTabSize] = useState<TabSize>(() => {
		if (typeof window === "undefined") {
			return DEFAULT_TAB_SIZE;
		}
		const stored = window.localStorage.getItem(STORAGE_KEY_TAB_SIZE);
		const parsed = stored ? parseInt(stored, 10) : DEFAULT_TAB_SIZE;
		return tabSizes.includes(parsed as TabSize)
			? (parsed as TabSize)
			: DEFAULT_TAB_SIZE;
	});

	// Apply font to document
	useEffect(() => {
		if (typeof document === "undefined") return;
		document.documentElement.dataset.editorFont = font;
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
