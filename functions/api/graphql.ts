import { createSchema, createYoga } from "graphql-yoga";
import {
	constraintDirectiveTypeDefs,
	createEnvelopQueryValidationPlugin,
} from "graphql-constraint-directive";

export class AppError extends Error {
	public code?: number;
	public name: string;

	constructor(message: string, code: number) {
		super(message);
		this.code = code;
		this.name = this.constructor.name;
	}
}

const resolvers = {
	Mutation: {
		contact: async (
			_parent: unknown,
			args: {
				input: {
					company: string;
					name: string;
					email: string;
					timeframe?: string;
				};
			},
			context: any
		) => {
			const url = context.env.GOOGLE_CHAT_WEBHOOK;
			if (!url) {
				throw new Error("!URL set");
			}

			return fetch(url, {
				body: JSON.stringify({
					text: "```" + JSON.stringify(args.input, null, 2) + "```",
				}),
				headers: { "Content-Type": "application/json; charset=UTF-8" },
				method: "POST",
			}).then((res) => res.ok);
		},
	},
	Query: {
		ping: () => "pong",
	},
};

const typeDefs = /* GraphQL */ `
	type Mutation {
		contact(input: ContactInput!): Boolean
	}

	type Query {
		ping: String
	}

	input ContactInput {
		company: String! @constraint(minLength: 2, maxLength: 254)
		email: String! @constraint(format: "email", minLength: 5, maxLength: 254)
		name: String! @constraint(minLength: 2, maxLength: 254)
		timeframe: String @constraint(minLength: 2, maxLength: 254)
	}
`;

const schema = createSchema({
	resolvers,
	typeDefs: [constraintDirectiveTypeDefs, typeDefs],
});

const yoga = createYoga({
	graphqlEndpoint: "/api/graphql",
	plugins: [createEnvelopQueryValidationPlugin()],
	schema,
});

export const onRequest = yoga;
