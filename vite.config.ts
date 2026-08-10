import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import process from "node:process";
// `vite-plus/test/config` is typed against the same `vite` package the React and
// Cloudflare plugins compile against; the `vite-plus` root entry ships Vite+'s own
// bundled Vite typings, which do not unify with them.
import { defineConfig, type ViteUserConfig } from "vite-plus/test/config";

// Vite+ does not re-export Vite's `loadEnv`, so read the .env files with Node's
// own loader. The shell wins, then `.env.<mode>`, then `.env` — which is what
// `npm run deploy` relies on when it exports .env.production up front.
function loadHost(mode: string) {
	for (const file of [`.env.${mode}`, ".env"]) {
		if (process.env.HOST) {
			break;
		}

		try {
			process.loadEnvFile(file);
		} catch {
			// Each file is optional.
		}
	}

	return process.env.HOST ?? "";
}

// @cloudflare/vite-plugin rejects the `resolve.external` that Vitest sets on the
// Worker environment, so the Worker build is left out of test runs. Reach for
// @cloudflare/vitest-pool-workers if the Worker ever needs in-workerd tests.
const isTest = !!process.env.VITEST;

// Vite+ declares `fmt` and `lint` on its own `UserConfig`, which does not unify
// with the Vitest/Vite one used above. Spreading them in sidesteps the excess
// property check without casting the rest of the config away.
const tooling = {
	fmt: {
		insertFinalNewline: true,
		printWidth: 80,
		useTabs: true,
	},
	lint: {
		categories: {
			correctness: "error",
		},
		ignorePatterns: ["dist", "public", ".wrangler"],
		plugins: ["react", "typescript", "unicorn", "oxc"],
		// NOTE: vite-plus 0.2.8 does not apply per-rule severities (verified both
		// here and in a standalone .oxlintrc.json). These are declared for when it
		// does; to override a rule today use a CLI flag, e.g. `vp lint -A <rule>`.
		rules: {
			"no-unused-vars": "off",
			"typescript/no-explicit-any": "off",
			"typescript/no-unused-vars": [
				"warn",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_",
				},
			],
		},
		// oxlint has no "detect" equivalent — it wants a literal semver. The bare
		// major stays correct across react patch/minor bumps.
		settings: {
			react: {
				version: "19",
			},
		},
	},
};

export default defineConfig(
	({ mode }): ViteUserConfig => ({
		...tooling,
		clearScreen: false,
		define: {
			"process.env.HOST": JSON.stringify(loadHost(mode)),
		},
		plugins: [tailwindcss(), react(), ...(isTest ? [] : [cloudflare()])],
		resolve: {
			alias: {
				"@": path.resolve(import.meta.dirname, "./src"),
			},
		},
		test: {
			watch: false,
		},
	}),
);
