"use client";

import { Switch } from "@/components/ui/switch";
import { useEditorSettingsContext } from "@/components/theme-provider";

export function EdgeFadeToggle() {
	const { showEdgeFade, updateShowEdgeFade } = useEditorSettingsContext();

	return (
		<Switch
			checked={showEdgeFade}
			onCheckedChange={updateShowEdgeFade}
			aria-label={showEdgeFade ? "Disable edge fade" : "Enable edge fade"}
		/>
	);
}
