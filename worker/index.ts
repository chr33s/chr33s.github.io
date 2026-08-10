import { Env } from "./types";

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Max-Age": "86400",
};

// The contact form posts exactly these four fields. Anything else in the body is
// dropped rather than forwarded, so the webhook only ever sees known keys.
export type Input = {
	company: string;
	email: string;
	name: string;
	timeframe: string;
};

export type ApiError = {
	extensions: {
		code: string;
		field?: string;
	};
	message: string;
};

// The client highlights a form control only for this code, so it is reserved for
// per-field constraint failures.
const CONSTRAINT_CODE = "ERR_GRAPHQL_CONSTRAINT_VALIDATION";
const DELIVERY_CODE = "ERR_UPSTREAM_DELIVERY";

type Constraint = {
	maxLength?: number;
	minLength?: number;
	oneOf?: readonly string[];
	pattern?: RegExp;
	patternMessage?: string;
};

// Mirrors the constraints declared on the form controls in
// src/components/Portfolio.tsx. The browser enforces them too, but a request can
// reach the Worker without ever passing through the form.
const CONSTRAINTS: Record<keyof Input, Constraint> = {
	company: { maxLength: 254, minLength: 2 },
	email: {
		maxLength: 254,
		minLength: 5,
		pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
		patternMessage: "Expected a valid email address",
	},
	name: { maxLength: 254, minLength: 2 },
	timeframe: {
		oneOf: ["Unknown", "3 - 6 months", "6 - 12 months", "12+ months"],
	},
};

// Four fields of 254 characters leaves generous headroom. Advisory only —
// Content-Length is absent on chunked requests — but it rejects the obvious
// case before anything is parsed or forwarded.
const MAX_BODY_BYTES = 4096;

function error(message: string, field?: keyof Input): ApiError {
	return {
		extensions: {
			code: CONSTRAINT_CODE,
			// Dot notation on purpose: the client rewrites `input.email` into
			// `input[email]` to match the form control's `name` attribute.
			...(field ? { field: `input.${field}` } : {}),
		},
		message,
	};
}

export function validate(body: unknown): {
	errors: ApiError[];
	input?: Input;
} {
	const candidate = (body as { input?: unknown } | null | undefined)?.input;
	if (
		typeof candidate !== "object" ||
		candidate === null ||
		Array.isArray(candidate)
	) {
		return { errors: [error("Expected an `input` object")] };
	}

	const source = candidate as Record<string, unknown>;
	const errors: ApiError[] = [];
	const input = {} as Input;

	for (const field of Object.keys(CONSTRAINTS) as (keyof Input)[]) {
		const { maxLength, minLength, oneOf, pattern, patternMessage } =
			CONSTRAINTS[field];
		const raw = source[field];

		if (typeof raw !== "string") {
			errors.push(error("Expected a string", field));
			continue;
		}

		// Trim first so whitespace cannot satisfy a minimum length, and forward
		// the trimmed value rather than what was sent.
		const value = raw.trim();

		if (oneOf && !oneOf.includes(value)) {
			errors.push(error(`Expected one of: ${oneOf.join(", ")}`, field));
		} else if (minLength !== undefined && value.length < minLength) {
			errors.push(error(`Expected at least ${minLength} characters`, field));
		} else if (maxLength !== undefined && value.length > maxLength) {
			errors.push(error(`Expected at most ${maxLength} characters`, field));
		} else if (pattern && !pattern.test(value)) {
			errors.push(error(patternMessage ?? "Expected a valid value", field));
		} else {
			input[field] = value;
		}
	}

	return errors.length > 0 ? { errors } : { errors, input };
}

async function contact(request: Request, env: Env) {
	const url = env.GOOGLE_CHAT_WEBHOOK;
	if (!url) {
		throw new Error("!URL set");
	}

	if (!request.headers.get("content-type")?.includes("application/json")) {
		return Response.json(
			{ errors: [error("Expected a JSON request body")] },
			{ status: 415 },
		);
	}

	if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
		return Response.json(
			{ errors: [error("Request body is too large")] },
			{ status: 413 },
		);
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		// Caught here so malformed JSON reads as a client error, not a Worker crash.
		return Response.json(
			{ errors: [error("Expected valid JSON")] },
			{ status: 400 },
		);
	}

	const { errors, input } = validate(body);
	if (!input) {
		return Response.json({ errors }, { status: 400 });
	}

	const res = await fetch(url, {
		body: JSON.stringify({
			text: "```" + JSON.stringify(input, null, 2) + "```",
		}),
		headers: { "Content-Type": "application/json; charset=UTF-8" },
		method: "POST",
	});

	// A failed delivery has to surface as a failed request: the client only looks
	// at `response.ok`, so returning 200 here would report success for a message
	// that was never sent. No field is attached — nothing the user typed is wrong.
	if (!res.ok) {
		return Response.json(
			{
				errors: [
					{
						extensions: { code: DELIVERY_CODE },
						message: "Could not deliver the message",
					},
				],
			},
			{ status: 502 },
		);
	}

	return Response.json(true);
}

export default {
	async fetch(request, env) {
		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: CORS_HEADERS });
		}

		let response: Response;
		try {
			const { pathname } = new URL(request.url);

			response =
				pathname === "/api" && request.method === "POST"
					? await contact(request, env)
					: new Response("Not Found", { status: 404 });
		} catch (err: any) {
			response = new Response(`${err.message}\n${err.stack}`, { status: 500 });
		}

		// Re-wrap so the headers are mutable even when `response` came from `fetch`.
		response = new Response(response.body, response);
		response.headers.set("Access-Control-Allow-Origin", "*");
		response.headers.set("Access-Control-Max-Age", "86400");
		return response;
	},
} satisfies ExportedHandler<Env>;
