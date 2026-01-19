"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { useEditorSettingsContext } from "@/components/theme-provider";

export function BorderToggle() {
	const { showBorders, updateShowBorders } = useEditorSettingsContext();

	return (
		<Checkbox
			id="show-borders"
			checked={showBorders}
			onCheckedChange={(checked) => updateShowBorders(checked === true)}
			aria-label="Show borders"
		/>
	);
}
