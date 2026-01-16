"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useEditorSettingsContext } from "@/components/theme-provider";
import { fontFamilyMap, type UIFontValue } from "@/hooks/use-editor-settings";

export function UIFontSelector() {
	const { uiFont, uiFonts, matchEditorFont, updateUIFont, updateMatchEditorFont } =
		useEditorSettingsContext();

	return (
		<div className="flex flex-col gap-3">
			<label className="flex items-center gap-2 text-sm">
				<Switch
					checked={matchEditorFont}
					onCheckedChange={updateMatchEditorFont}
				/>
				<span>Match writing font</span>
			</label>
			{!matchEditorFont && (
				<Select
					value={uiFont}
					onValueChange={(v) => updateUIFont(v as UIFontValue)}
				>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="Select font" />
					</SelectTrigger>
					<SelectContent>
						{uiFonts.map((f) => (
							<SelectItem
								key={f.value}
								value={f.value}
								style={{ fontFamily: fontFamilyMap[f.value] }}
							>
								{f.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}
		</div>
	);
}
