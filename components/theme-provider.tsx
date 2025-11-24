"use client";

import * as React from "react";
import {
	ThemeProvider as NextThemesProvider,
	useTheme,
	type ThemeProviderProps,
} from "next-themes";

import { useSubtheme } from "@/hooks/use-subtheme";

type Mode = "light" | "dark";

type SubthemeContextValue = {
	mode: Mode;
	subtheme: string;
	available: readonly string[];
	updateSubtheme: (value: string) => void;
};

const SubthemeContext = React.createContext<SubthemeContextValue | undefined>(
	undefined,
);

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
	return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

export function AppThemeProvider({
	children,
}: {
	children: React.ReactNode;
}) {
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

	return (
		<SubthemeContext.Provider
			value={{ mode, subtheme, available, updateSubtheme }}
		>
			{children}
		</SubthemeContext.Provider>
	);
}

export function useSubthemeContext() {
	const ctx = React.useContext(SubthemeContext);

	if (!ctx) {
		throw new Error("useSubthemeContext must be used within AppThemeProvider");
	}

	return ctx;
}


