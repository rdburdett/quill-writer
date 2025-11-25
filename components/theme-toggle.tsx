"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const THEME_SEQUENCE = ["light", "dark", "system"] as const;

type ThemeName = (typeof THEME_SEQUENCE)[number];

export function ThemeToggle() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = React.useState(false);

	React.useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return null;
	}

	const currentTheme = (theme as ThemeName) || "system";
	const currentIndex = THEME_SEQUENCE.indexOf(currentTheme);
	const nextTheme =
		THEME_SEQUENCE[(currentIndex + 1) % THEME_SEQUENCE.length];

	const handleClick = () => {
		setTheme(nextTheme);
	};

	const label =
		currentTheme === "system"
			? "System theme"
			: currentTheme === "dark"
			? "Dark theme"
			: "Light theme";

	const Icon =
		currentTheme === "system"
			? Monitor
			: currentTheme === "dark"
			? Moon
			: Sun;

	return (
		<Button
			variant="outline"
			size="icon"
			onClick={handleClick}
			className={cn("relative", "transition-colors")}
			aria-label="Toggle theme"
			title={label}
		>
			<Icon className="h-[1.2rem] w-[1.2rem]" />
			<span className="sr-only">Toggle theme</span>
		</Button>
	);
}
