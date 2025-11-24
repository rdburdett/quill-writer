"use client";

import { useSubthemeContext } from "@/components/theme-provider";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export function SubthemeSelector() {
	const { subtheme, available, updateSubtheme } = useSubthemeContext();

	return (
		<Select value={subtheme} onValueChange={updateSubtheme}>
			<SelectTrigger className="w-48">
				<SelectValue placeholder="Select theme" />
			</SelectTrigger>
			<SelectContent>
				{available.map((t) => (
					<SelectItem key={t} value={t}>
						{t}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

