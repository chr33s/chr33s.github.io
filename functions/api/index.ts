import { Env } from "../types";

export const onRequestPost: PagesFunction<Env> = async (context) => {
	const url = context.env.GOOGLE_CHAT_WEBHOOK;
	if (!url) {
		throw new Error("!URL set");
	}

	const { input }: any = await context.request.json();

	const res = await fetch(url, {
		body: JSON.stringify({
			text: "```" + JSON.stringify(input, null, 2) + "```",
		}),
		headers: { "Content-Type": "application/json; charset=UTF-8" },
		method: "POST",
	});

	return new Response(JSON.stringify(res.ok));
};
