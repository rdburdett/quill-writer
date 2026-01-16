"use client";

import { Switch } from "@/components/ui/switch";
import { useEditorSettingsContext } from "@/components/theme-provider";

export function BorderToggle() {
	const { showBorders, updateShowBorders } = useEditorSettingsContext();

	return (
		<Switch
			checked={showBorders}
			onCheckedChange={updateShowBorders}
			aria-label={showBorders ? "Hide borders" : "Show borders"}
		/>
	);
}
