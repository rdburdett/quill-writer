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
	uiFonts,
	tabSizes,
	type FontValue,
	type UIFontValue,
	type TabSize,
} from "@/hooks/use-editor-settings";
import { useUISettings } from "@/hooks/use-ui-settings";
import { ProjectProvider } from "@/components/project-provider";

type Mode = "light" | "dark";

type SubthemeContextValue = {
	mode: Mode;
	subtheme: string;
	available: readonly string[];
	updateSubtheme: (value: string) => void;
};

type EditorSettingsContextValue = {
	font: FontValue;
	uiFont: UIFontValue;
	matchEditorFont: boolean;
	tabSize: TabSize;
	fonts: typeof fonts;
	uiFonts: typeof uiFonts;
	tabSizes: typeof tabSizes;
	showBorders: boolean;
	showEdgeFade: boolean;
	updateFont: (value: FontValue) => void;
	updateUIFont: (value: UIFontValue) => void;
	updateMatchEditorFont: (value: boolean) => void;
	updateTabSize: (value: TabSize) => void;
	updateShowBorders: (value: boolean) => void;
	updateShowEdgeFade: (value: boolean) => void;
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
		uiFont,
		matchEditorFont,
		tabSize,
		updateFont,
		updateUIFont,
		updateMatchEditorFont,
		updateTabSize,
	} = useEditorSettings();
	const { showBorders, updateShowBorders, showEdgeFade, updateShowEdgeFade } = useUISettings();

	return (
		<SubthemeContext.Provider
			value={{ mode, subtheme, available, updateSubtheme }}
		>
			<EditorSettingsContext.Provider
				value={{
					font,
					uiFont,
					matchEditorFont,
					tabSize,
					fonts,
					uiFonts,
					tabSizes,
					showBorders,
					showEdgeFade,
					updateFont,
					updateUIFont,
					updateMatchEditorFont,
					updateTabSize,
					updateShowBorders,
					updateShowEdgeFade,
				}}
			>
				<ProjectProvider>{children}</ProjectProvider>
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
