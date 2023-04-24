import * as React from "react";

export function toJSX(str: string): React.ReactNode {
	return str.split("\n").map((item, idx) => {
		return (
			<React.Fragment key={idx}>
				{item}
				<br />
			</React.Fragment>
		);
	});
}

export function toTitleCase(str: string | undefined) {
	return (
		str?.replace(
			/\w\S*/g,
			(txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
		) ?? ""
	);
}

export function truncate(str: string, limit: number) {
	const chars = str.split("");

	for (const index of chars.keys()) {
		if (index === limit) {
			for (let i = index; i > 0; i--) {
				const char = chars[i];
				if (char === " ") {
					chars.splice(i);
					break;
				}
			}

			const first = chars.findIndex((v) => v === " ");
			if (index < first) {
				chars.splice(first);
			}
			break;
		}
	}

	if (chars.length < limit) {
		chars.push("...");
	}

	return chars.join("");
}
