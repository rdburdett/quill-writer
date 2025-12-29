"use client";

import { Button } from "@/components/ui/button";
import { useEditorSettingsContext } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export function BorderToggle() {
	const { showBorders, updateShowBorders } = useEditorSettingsContext();

	const handleToggle = () => {
		updateShowBorders(!showBorders);
	};

	return (
		<Button
			variant="outline"
			size="icon"
			onClick={handleToggle}
			className={cn("relative", "transition-colors")}
			aria-label={showBorders ? "Hide borders" : "Show borders"}
			title={showBorders ? "Hide borders" : "Show borders"}
		>
			{showBorders ? (
				<svg
					className="h-[1.2rem] w-[1.2rem]"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
			) : (
				<svg
					className="h-[1.2rem] w-[1.2rem]"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						opacity="0.5"
					/>
				</svg>
			)}
			<span className="sr-only">
				{showBorders ? "Hide borders" : "Show borders"}
			</span>
		</Button>
	);
}
