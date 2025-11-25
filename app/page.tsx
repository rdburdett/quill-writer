import Link from "next/link";
import { Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NovelEditor } from "@/components/novel-editor";

export default function Home() {
	return (
		<div className="relative min-h-screen">
			<Link
				href="/settings"
				className="fixed right-6 top-6 z-10"
				aria-label="Open settings"
			>
				<Button
					variant="ghost"
					size="icon"
					className="rounded-full opacity-50 transition-opacity hover:opacity-100"
				>
					<Settings className="h-[1.1rem] w-[1.1rem]" />
				</Button>
			</Link>

			<main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-16 sm:px-8">
				<NovelEditor />
			</main>

			<footer className="fixed bottom-4 left-1/2 -translate-x-1/2">
				<p className="text-xs text-muted-foreground/60">
					Press <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">/</kbd> for commands
				</p>
			</footer>
		</div>
	);
}
