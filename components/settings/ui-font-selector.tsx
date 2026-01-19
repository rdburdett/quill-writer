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
			<div className="h-[40px] overflow-hidden transition-opacity duration-200">
				<div
					className={`transition-all duration-200 ${
						matchEditorFont
							? "invisible opacity-0 pointer-events-none -translate-y-2"
							: "visible opacity-100 translate-y-0"
					}`}
				>
					<Select
						value={uiFont}
						onValueChange={(v) => updateUIFont(v as UIFontValue)}
						disabled={matchEditorFont}
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
				</div>
			</div>
		</div>
	);
}
