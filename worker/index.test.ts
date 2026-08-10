import { afterEach, describe, expect, test, vi } from "vite-plus/test";

import worker, { validate } from "./index";

const valid = {
	company: "Acme",
	email: "someone@example.com",
	name: "Ada Lovelace",
	timeframe: "3 - 6 months",
};

const fieldsWithErrors = (body: unknown) =>
	validate(body).errors.map((e) => e.extensions.field);

describe("validate", () => {
	test("accepts a well-formed payload", () => {
		const { errors, input } = validate({ input: valid });

		expect(errors).toEqual([]);
		expect(input).toEqual(valid);
	});

	test("trims values and forwards the trimmed form", () => {
		const { input } = validate({
			input: { ...valid, company: "  Acme  ", name: "\tAda Lovelace\n" },
		});

		expect(input).toMatchObject({ company: "Acme", name: "Ada Lovelace" });
	});

	test("drops unknown keys instead of forwarding them", () => {
		const { input } = validate({
			input: { ...valid, isAdmin: true, " evil": "x" },
		});

		expect(input && Object.keys(input).sort()).toEqual([
			"company",
			"email",
			"name",
			"timeframe",
		]);
	});

	test.each([
		["null body", null],
		["missing input", {}],
		["input is an array", { input: [] }],
		["input is a string", { input: "nope" }],
	])("rejects %s", (_label, body) => {
		const { errors, input } = validate(body);

		expect(input).toBeUndefined();
		expect(errors).toHaveLength(1);
	});

	test("reports every invalid field at once", () => {
		expect(
			fieldsWithErrors({
				input: { company: "", email: "nope", name: "", timeframe: "someday" },
			}),
		).toEqual([
			"input.company",
			"input.email",
			"input.name",
			"input.timeframe",
		]);
	});

	test("whitespace alone does not satisfy minLength", () => {
		expect(fieldsWithErrors({ input: { ...valid, company: "   " } })).toEqual([
			"input.company",
		]);
	});

	test.each([
		["missing @", "someoneexample.com"],
		["missing domain dot", "someone@example"],
		["embedded space", "some one@example.com"],
		["too short", "a@b"],
	])("rejects email: %s", (_label, email) => {
		expect(fieldsWithErrors({ input: { ...valid, email } })).toEqual([
			"input.email",
		]);
	});

	test("enforces maxLength", () => {
		expect(
			fieldsWithErrors({ input: { ...valid, company: "a".repeat(255) } }),
		).toEqual(["input.company"]);
		expect(
			validate({ input: { ...valid, company: "a".repeat(254) } }).errors,
		).toEqual([]);
	});

	test("restricts timeframe to the form's options", () => {
		for (const timeframe of [
			"Unknown",
			"3 - 6 months",
			"6 - 12 months",
			"12+ months",
		]) {
			expect(validate({ input: { ...valid, timeframe } }).errors).toEqual([]);
		}

		expect(
			fieldsWithErrors({ input: { ...valid, timeframe: "tomorrow" } }),
		).toEqual(["input.timeframe"]);
	});

	test.each([
		["number", 42],
		["null", null],
		["object", {}],
		["missing", undefined],
	])("rejects non-string company: %s", (_label, company) => {
		expect(fieldsWithErrors({ input: { ...valid, company } })).toEqual([
			"input.company",
		]);
	});

	test("uses the error code the client's hasValidationError matches on", () => {
		// Long enough to clear minLength, so the pattern check is what fails.
		const { errors } = validate({ input: { ...valid, email: "not-an-email" } });

		expect(errors[0].extensions.code).toBe("ERR_GRAPHQL_CONSTRAINT_VALIDATION");
		expect(errors[0].message).toBe("Expected a valid email address");
	});
});

const env = { GOOGLE_CHAT_WEBHOOK: "https://chat.example.com/hook" } as Env;

// The handler takes an *incoming* request, which carries Cloudflare properties
// the plain Request constructor cannot produce.
type IncomingRequest = Parameters<typeof worker.fetch>[0];

function request(url: string, init?: RequestInit): IncomingRequest {
	return new Request(url, init) as IncomingRequest;
}

function post(body: unknown, contentType = "application/json") {
	return request("https://example.com/api", {
		body: JSON.stringify(body),
		headers: { "Content-Type": contentType },
		method: "POST",
	});
}

// Every test stubs fetch, so a failure to stub surfaces as a thrown error rather
// than a real request to the webhook.
function stubWebhook(status: number) {
	const send = vi.fn(async () => new Response("", { status }));
	vi.stubGlobal("fetch", send);
	return send;
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("fetch", () => {
	test("forwards a valid submission and reports success", async () => {
		const send = stubWebhook(200);

		const res = await worker.fetch(post({ input: valid }), env);

		expect(res.status).toBe(200);
		expect(await res.json()).toBe(true);
		expect(send).toHaveBeenCalledTimes(1);
	});

	test("forwards only the validated fields", async () => {
		const send = stubWebhook(200);

		await worker.fetch(post({ input: { ...valid, isAdmin: true } }), env);

		const [, init] = send.mock.calls[0] as unknown as [string, RequestInit];
		expect(String(init.body)).not.toContain("isAdmin");
		expect(String(init.body)).toContain("someone@example.com");
	});

	test("reports a failed delivery as 502 rather than success", async () => {
		const send = stubWebhook(500);

		const res = await worker.fetch(post({ input: valid }), env);
		const body = (await res.json()) as { errors: { extensions: object }[] };

		expect(res.status).toBe(502);
		expect(send).toHaveBeenCalledTimes(1);
		expect(body.errors[0].extensions).toEqual({
			code: "ERR_UPSTREAM_DELIVERY",
		});
	});

	test("never calls the webhook when validation fails", async () => {
		const send = stubWebhook(200);

		const res = await worker.fetch(
			post({ input: { ...valid, email: "x" } }),
			env,
		);

		expect(res.status).toBe(400);
		expect(send).not.toHaveBeenCalled();
	});

	test("rejects a non-JSON content type", async () => {
		stubWebhook(200);

		const res = await worker.fetch(post({ input: valid }, "text/plain"), env);

		expect(res.status).toBe(415);
	});

	test("answers the CORS preflight", async () => {
		const res = await worker.fetch(
			request("https://example.com/api", { method: "OPTIONS" }),
			env,
		);

		expect(res.status).toBe(204);
		expect(res.headers.get("access-control-allow-origin")).toBe("*");
	});

	test("404s an unknown path and still sets CORS", async () => {
		const res = await worker.fetch(request("https://example.com/nope"), env);

		expect(res.status).toBe(404);
		expect(res.headers.get("access-control-allow-origin")).toBe("*");
	});

	test("500s when the webhook is not configured", async () => {
		stubWebhook(200);

		const res = await worker.fetch(post({ input: valid }), {} as Env);

		expect(res.status).toBe(500);
	});
});
