"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useEditorSettingsContext } from "@/components/theme-provider";
import type { FontValue } from "@/hooks/use-editor-settings";

export function FontSelector() {
	const { font, fonts, updateFont } = useEditorSettingsContext();

	return (
		<Select value={font} onValueChange={(v) => updateFont(v as FontValue)}>
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
	);
}

