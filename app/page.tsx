import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SubthemeSelector } from "@/components/theme/subtheme-selector";

export default function Home() {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<main className="flex min-h-screen w-full max-w-3xl flex-col justify-between px-16 py-32">
				<header className="mb-8 flex items-center justify-between gap-4">
					<Image
						className="dark:invert"
						src="/next.svg"
						alt="Next.js logo"
						width={100}
						height={20}
						priority
					/>
					<div className="flex items-center gap-3">
						<SubthemeSelector />
						<ThemeToggle />
					</div>
				</header>

				<section className="flex flex-1 flex-col items-center gap-6 text-center sm:items-start sm:text-left">
					<h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight">
						To get started, click the button.
					</h1>
					<p className="max-w-md text-lg leading-8 text-muted-foreground">
						This is a shadcn/ui button using your current theme tokens, so it
						should adapt to light, dark, and system modes automatically, while
						the subtheme picks your preferred light/dark palette.
					</p>
				</section>

				<section className="mt-10 flex flex-col gap-4 text-base font-medium sm:flex-row">
					<Button size="lg">Test shadcn Button</Button>
					<Button variant="outline" size="lg">
						Secondary action
					</Button>
				</section>
			</main>
		</div>
	);
}
