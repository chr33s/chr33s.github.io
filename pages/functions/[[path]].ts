// Catch-all for the retired Cloudflare Pages project. `[[path]]` is a Pages
// double-bracket route, which matches every path including `/`, so there is no
// URL on the project that reaches anything else.
//
// `onRequest` (rather than `onRequestGet` and friends) covers every method.
export const onRequest: PagesFunction = () =>
	new Response("Unauthorized", {
		status: 401,
		headers: {
			// A 401 is cacheable by default; without this an edge or browser cache
			// could keep serving it after the project is repurposed.
			"Cache-Control": "no-store",
			"Content-Type": "text/plain; charset=UTF-8",
		},
	});
