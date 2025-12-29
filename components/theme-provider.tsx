"use client";

import * as React from "react";
import {
	ThemeProvider as NextThemesProvider,
	useTheme,
	type ThemeProviderProps,
} from "next-themes";

import { useSubtheme } from "@/hooks/use-subtheme";
import {
	useEditorSettings,
	fonts,
	tabSizes,
	type FontValue,
	type TabSize,
} from "@/hooks/use-editor-settings";
import { useUISettings } from "@/hooks/use-ui-settings";

type Mode = "light" | "dark";

type SubthemeContextValue = {
	mode: Mode;
	subtheme: string;
	available: readonly string[];
	updateSubtheme: (value: string) => void;
};

type EditorSettingsContextValue = {
	font: FontValue;
	tabSize: TabSize;
	fonts: typeof fonts;
	tabSizes: typeof tabSizes;
	showBorders: boolean;
	updateFont: (value: FontValue) => void;
	updateTabSize: (value: TabSize) => void;
	updateShowBorders: (value: boolean) => void;
};

const SubthemeContext = React.createContext<SubthemeContextValue | undefined>(
	undefined
);

const EditorSettingsContext = React.createContext<
	EditorSettingsContextValue | undefined
>(undefined);

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
	return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
	return (
		<NextThemesProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			disableTransitionOnChange
		>
			<SubthemeSync>{children}</SubthemeSync>
		</NextThemesProvider>
	);
}

function SubthemeSync({ children }: { children: React.ReactNode }) {
	const { resolvedTheme } = useTheme();
	const mode: Mode = resolvedTheme === "dark" ? "dark" : "light";
	const { subtheme, available, updateSubtheme } = useSubtheme(mode);
	const {
		font,
		tabSize,
		updateFont,
		updateTabSize,
	} = useEditorSettings();
	const { showBorders, updateShowBorders } = useUISettings();

	return (
		<SubthemeContext.Provider
			value={{ mode, subtheme, available, updateSubtheme }}
		>
			<EditorSettingsContext.Provider
				value={{
					font,
					tabSize,
					fonts,
					tabSizes,
					showBorders,
					updateFont,
					updateTabSize,
					updateShowBorders,
				}}
			>
				{children}
			</EditorSettingsContext.Provider>
		</SubthemeContext.Provider>
	);
}

export function useSubthemeContext() {
	const ctx = React.useContext(SubthemeContext);

	if (!ctx) {
		throw new Error(
			"useSubthemeContext must be used within AppThemeProvider"
		);
	}

	return ctx;
}

export function useEditorSettingsContext() {
	const ctx = React.useContext(EditorSettingsContext);

	if (!ctx) {
		throw new Error(
			"useEditorSettingsContext must be used within AppThemeProvider"
		);
	}

	return ctx;
}
