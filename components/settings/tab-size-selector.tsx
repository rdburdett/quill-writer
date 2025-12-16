"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useEditorSettingsContext } from "@/components/theme-provider";
import type { TabSize } from "@/hooks/use-editor-settings";

export function TabSizeSelector() {
	const { tabSize, tabSizes, updateTabSize } = useEditorSettingsContext();

	return (
		<Select
			value={String(tabSize)}
			onValueChange={(v) => updateTabSize(Number(v) as TabSize)}
		>
			<SelectTrigger className="w-[180px]">
				<SelectValue placeholder="Select tab size" />
			</SelectTrigger>
			<SelectContent>
				{tabSizes.map((size) => (
					<SelectItem key={size} value={String(size)}>
						{size} spaces
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}



