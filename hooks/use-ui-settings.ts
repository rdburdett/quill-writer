"use client";

import { useState, useEffect, useLayoutEffect } from "react";

// Use useLayoutEffect on client, useEffect on server
const useIsomorphicLayoutEffect =
	typeof window !== "undefined" ? useLayoutEffect : useEffect;

const STORAGE_KEY_SHOW_BORDERS = "ui.showBorders";
const STORAGE_KEY_SHOW_EDGE_FADE = "ui.showEdgeFade";

const DEFAULT_SHOW_BORDERS = false;
const DEFAULT_SHOW_EDGE_FADE = true;

export function useUISettings() {
	const [showBorders, setShowBorders] = useState<boolean>(DEFAULT_SHOW_BORDERS);
	const [showEdgeFade, setShowEdgeFade] = useState<boolean>(DEFAULT_SHOW_EDGE_FADE);

	// Sync from localStorage on mount (client-side only)
	useIsomorphicLayoutEffect(() => {
		if (typeof window === "undefined") return;

		const storedBorders = window.localStorage.getItem(STORAGE_KEY_SHOW_BORDERS);
		if (storedBorders === "true") {
			setShowBorders(true);
		}

		const storedEdgeFade = window.localStorage.getItem(STORAGE_KEY_SHOW_EDGE_FADE);
		// Default is true, so only set to false if explicitly stored as "false"
		if (storedEdgeFade === "false") {
			setShowEdgeFade(false);
		}
	}, []);

	const updateShowBorders = (value: boolean) => {
		setShowBorders(value);
		if (typeof window !== "undefined") {
			window.localStorage.setItem(STORAGE_KEY_SHOW_BORDERS, String(value));
		}
	};

	const updateShowEdgeFade = (value: boolean) => {
		setShowEdgeFade(value);
		if (typeof window !== "undefined") {
			window.localStorage.setItem(STORAGE_KEY_SHOW_EDGE_FADE, String(value));
		}
	};

	return { showBorders, updateShowBorders, showEdgeFade, updateShowEdgeFade };
}
