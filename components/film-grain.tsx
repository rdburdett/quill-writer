"use client";

/**
 * FilmGrain - Renders a subtle film grain overlay effect
 *
 * Uses an actual SVG element with feTurbulence filter to create noise.
 * This must be a real DOM element because SVG filters don't work
 * when the SVG is used as a CSS background-image.
 */
export function FilmGrain() {
	return (
		<svg
			className="pointer-events-none fixed inset-0 z-9999 h-full w-full opacity-[0.3] mix-blend-overlay dark:opacity-[0.3]"
			aria-hidden="true"
		>
			<filter id="film-grain-noise">
				<feTurbulence
					type="fractalNoise"
					baseFrequency="0.8"
					numOctaves="4"
					stitchTiles="stitch"
				/>
			</filter>
			<rect width="100%" height="100%" filter="url(#film-grain-noise)" />
		</svg>
	);
}
