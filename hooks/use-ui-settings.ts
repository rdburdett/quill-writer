"use client";

import { useState, useEffect, useLayoutEffect } from "react";

// Use useLayoutEffect on client, useEffect on server
const useIsomorphicLayoutEffect =
	typeof window !== "undefined" ? useLayoutEffect : useEffect;

const STORAGE_KEY_SHOW_BORDERS = "ui.showBorders";

const DEFAULT_SHOW_BORDERS = false;

export function useUISettings() {
	const [showBorders, setShowBorders] = useState<boolean>(DEFAULT_SHOW_BORDERS);

	// Sync from localStorage on mount (client-side only)
	useIsomorphicLayoutEffect(() => {
		if (typeof window === "undefined") return;

		const stored = window.localStorage.getItem(STORAGE_KEY_SHOW_BORDERS);
		if (stored === "true") {
			setShowBorders(true);
		}
	}, []);

	const updateShowBorders = (value: boolean) => {
		setShowBorders(value);
		if (typeof window !== "undefined") {
			window.localStorage.setItem(STORAGE_KEY_SHOW_BORDERS, String(value));
		}
	};

	return { showBorders, updateShowBorders };
}
