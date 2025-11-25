"use client";

import { useEffect, useState } from "react";

import {
	darkThemes,
	defaultDarkTheme,
	defaultLightTheme,
	lightThemes,
} from "@/theme/themes";

type Mode = "light" | "dark";

const STORAGE_KEY_LIGHT = "subtheme.light";
const STORAGE_KEY_DARK = "subtheme.dark";

export function useSubtheme(mode: Mode) {
	const [lightSubtheme, setLightSubtheme] = useState(() => {
		if (typeof window === "undefined") {
			return defaultLightTheme;
		}

		const stored = window.localStorage.getItem(STORAGE_KEY_LIGHT);

		return lightThemes.includes(stored as (typeof lightThemes)[number])
			? (stored as (typeof lightThemes)[number])
			: defaultLightTheme;
	});

	const [darkSubtheme, setDarkSubtheme] = useState(() => {
		if (typeof window === "undefined") {
			return defaultDarkTheme;
		}

		const stored = window.localStorage.getItem(STORAGE_KEY_DARK);

		return darkThemes.includes(stored as (typeof darkThemes)[number])
			? (stored as (typeof darkThemes)[number])
			: defaultDarkTheme;
	});

	const subtheme = mode === "dark" ? darkSubtheme : lightSubtheme;
	const available = mode === "dark" ? darkThemes : lightThemes;

	useEffect(() => {
		if (typeof document === "undefined") {
			return;
		}

		document.documentElement.dataset.theme = subtheme;
	}, [subtheme]);

	const updateSubtheme = (value: string) => {
		if (mode === "dark") {
			if (!darkThemes.includes(value as (typeof darkThemes)[number])) {
				return;
			}

			setDarkSubtheme(value as (typeof darkThemes)[number]);

			if (typeof window !== "undefined") {
				window.localStorage.setItem(STORAGE_KEY_DARK, value);
			}
		} else {
			if (!lightThemes.includes(value as (typeof lightThemes)[number])) {
				return;
			}

			setLightSubtheme(value as (typeof lightThemes)[number]);

			if (typeof window !== "undefined") {
				window.localStorage.setItem(STORAGE_KEY_LIGHT, value);
			}
		}
	};

	return { subtheme, available, updateSubtheme };
}
