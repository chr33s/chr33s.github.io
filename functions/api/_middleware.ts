import { Env } from "../types";

export const corsHandling: PagesFunction<Env> = async (context) => {
	switch (context.request.method) {
		case "OPTIONS":
			return new Response(null, {
				status: 204,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Headers": "*",
					"Access-Control-Allow-Methods": "GET, OPTIONS",
					"Access-Control-Max-Age": "86400",
				},
			});
		default:
			const response = await context.next();
			response.headers.set("Access-Control-Allow-Origin", "*");
			response.headers.set("Access-Control-Max-Age", "86400");
			return response;
	}
};

export const errorHandling: PagesFunction<Env> = async (context) => {
	try {
		return await context.next();
	} catch (err: any) {
		return new Response(`${err.message}\n${err.stack}`, { status: 500 });
	}
};

export const onRequest = [corsHandling, errorHandling];
