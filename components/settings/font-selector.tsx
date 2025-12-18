"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useEditorSettingsContext } from "@/components/theme-provider";
import { fontFamilyMap, type FontValue } from "@/hooks/use-editor-settings";

export function FontSelector() {
	const { font, fonts, updateFont } = useEditorSettingsContext();

	return (
		<div className="flex flex-col gap-3">
			<Select
				value={font}
				onValueChange={(v) => updateFont(v as FontValue)}
			>
				<SelectTrigger className="w-[180px]">
					<SelectValue placeholder="Select font" />
				</SelectTrigger>
				<SelectContent>
					{fonts.map((f) => (
						<SelectItem key={f.value} value={f.value}>
							{f.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<p
				className="w-[180px] rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
				style={{ fontFamily: fontFamilyMap[font] }}
			>
				The quick brown fox jumps over the lazy dog.
			</p>
		</div>
	);
}
