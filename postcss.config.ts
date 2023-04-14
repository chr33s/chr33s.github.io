import autoprefixer from "autoprefixer";
import cssnano from "cssnano";
import postcssImport from "postcss-import";
import tailwindcss from "tailwindcss";
import postcssPresetEnv from "postcss-preset-env";

export default {
	plugins: [
		postcssImport(),
		tailwindcss(),
		autoprefixer(),
		postcssPresetEnv(),
		cssnano(),
	],
	sourceMap: true,
};
