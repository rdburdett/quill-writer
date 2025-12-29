"use client";

import { useState } from "react";

const STORAGE_KEY_SHOW_BORDERS = "ui.showBorders";

const DEFAULT_SHOW_BORDERS = false;

export function useUISettings() {
	const [showBorders, setShowBorders] = useState<boolean>(() => {
		if (typeof window === "undefined") {
			return DEFAULT_SHOW_BORDERS;
		}
		const stored = window.localStorage.getItem(STORAGE_KEY_SHOW_BORDERS);
		return stored === "true" ? true : DEFAULT_SHOW_BORDERS;
	});

	const updateShowBorders = (value: boolean) => {
		setShowBorders(value);
		if (typeof window !== "undefined") {
			window.localStorage.setItem(STORAGE_KEY_SHOW_BORDERS, String(value));
		}
	};

	return { showBorders, updateShowBorders };
}
