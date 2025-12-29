import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { SubthemeSelector } from "@/components/theme/subtheme-selector";
import { FontSelector } from "@/components/settings/font-selector";
import { TabSizeSelector } from "@/components/settings/tab-size-selector";
import { BorderToggle } from "@/components/settings/border-toggle";

export default function SettingsPage() {
	return (
		<div className="flex min-h-screen items-start justify-center px-6 py-10">
			<main className="w-full max-w-3xl space-y-10">
				<header className="space-y-3">
					<Link
						href="/"
						className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
					>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Home
					</Link>
					<div className="space-y-1">
						<h1 className="text-xl font-semibold tracking-tight">
							Settings
						</h1>
						<p className="text-sm text-muted-foreground">
							Customize Quill to fit your writing style.
						</p>
					</div>
				</header>

				<section className="space-y-8 rounded-2xl border bg-card/40 p-6 shadow-sm backdrop-blur-sm">
					<h2 className="text-base font-semibold">Appearance</h2>

					<div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
						<div>
							<h3 className="text-sm font-medium">Theme</h3>
							<p className="mt-1 text-sm text-muted-foreground">
								Switch between light, dark, or system.
							</p>
						</div>
						<ThemeToggle />
					</div>

					<div className="flex flex-col items-start justify-between gap-4 border-t pt-6 sm:flex-row sm:items-center">
						<div>
							<h3 className="text-sm font-medium">Subtheme</h3>
							<p className="mt-1 text-sm text-muted-foreground">
								Choose a color palette for the current mode.
							</p>
						</div>
						<SubthemeSelector />
					</div>

					<div className="flex flex-col items-start justify-between gap-4 border-t pt-6 sm:flex-row sm:items-center">
						<div>
							<h3 className="text-sm font-medium">Show Borders</h3>
							<p className="mt-1 text-sm text-muted-foreground">
								Display borders for higher contrast.
							</p>
						</div>
						<BorderToggle />
					</div>
				</section>

				<section className="space-y-8 rounded-2xl border bg-card/40 p-6 shadow-sm backdrop-blur-sm">
					<h2 className="text-base font-semibold">Editor</h2>

					<div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
						<div>
							<h3 className="text-sm font-medium">Font</h3>
							<p className="mt-1 text-sm text-muted-foreground">
								Choose a typeface for your writing.
							</p>
						</div>
						<FontSelector />
					</div>

					<div className="flex flex-col items-start justify-between gap-4 border-t pt-6 sm:flex-row sm:items-center">
						<div>
							<h3 className="text-sm font-medium">Tab Width</h3>
							<p className="mt-1 text-sm text-muted-foreground">
								Number of spaces for each tab indent.
							</p>
						</div>
						<TabSizeSelector />
					</div>
				</section>
			</main>
		</div>
	);
}
