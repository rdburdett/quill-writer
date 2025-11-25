import type { Metadata } from "next";
import {
	Geist,
	Geist_Mono,
	Lora,
	Merriweather,
	Inter,
	JetBrains_Mono,
} from "next/font/google";
import "./globals.css";
import { AppThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const lora = Lora({
	variable: "--font-lora",
	subsets: ["latin"],
});

const merriweather = Merriweather({
	variable: "--font-merriweather",
	subsets: ["latin"],
	weight: ["300", "400", "700"],
});

const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
	variable: "--font-jetbrains",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Quill",
	description:
		"Quill is a modern, minimalist, and beautiful tool empowering writers to organize their thoughts and ideas.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={cn(
					"min-h-screen bg-background font-sans antialiased",
					geistSans.variable,
					geistMono.variable,
					lora.variable,
					merriweather.variable,
					inter.variable,
					jetbrainsMono.variable
				)}
			>
				<AppThemeProvider>{children}</AppThemeProvider>
			</body>
		</html>
	);
}
