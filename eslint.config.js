import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import react from "eslint-plugin-react";
import ts from "typescript-eslint";

export default [
	js.configs.recommended,
	...ts.configs.recommended,
	prettier,
	{
		files: ["**/client/**/*.{ts,tsx}"],
		plugins: {
			react,
		},
		settings: {
			react: {
				version: "detect",
			},
		},
	},
	{
		ignores: ["**/dist/*", "**/generated/*", "legacy/*", ".wrangler/*"],
	},
	{
		rules: {
			"no-unused-vars": "off",
			"@typescript-eslint/no-explicit-any": ["off"],
			"@typescript-eslint/no-unused-vars": [
				"warn", // or "error"
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_",
				},
			],
		},
	},
];
