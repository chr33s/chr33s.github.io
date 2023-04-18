import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";
import plugin from "tailwindcss/plugin";
import forms from "@tailwindcss/forms";

export default {
	content: ["./index.html", "./**/*.{ts,tsx}"],
	plugins: [
		forms(),
		plugin(({ matchUtilities, theme }) => {
			matchUtilities(
				{
					"animation-delay": (value) => ({
						"animation-delay": value,
					}),
				},
				{ values: theme("transitionDelay") }
			);
		}),
		plugin(({ matchUtilities }) => {
			matchUtilities(
				{
					"text-rendering": (value) => ({
						"text-rendering": value,
					}),
				},
				{
					values: {
						auto: "auto",
						legibility: "optimizeLegibility",
						precision: "geometricPrecision",
						speed: "optimizeSpeed",
					},
				}
			);
		}),
	],
	theme: {
		extend: {
			animation: {
				spinner: "spinner 1.4s infinite ease-in-out both",
			},
			colors: {},
			fontFamily: {
				sans: ["Helvetica Neue", "Helvetica", ...defaultTheme.fontFamily.sans],
			},
			keyframes: {
				spinner: {
					"0%, 80%, 100%": { transform: "scale(0)" },
					"40%": { transform: "scale(1)" },
				},
			},
		},
	},
} satisfies Config;
