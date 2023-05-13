import * as React from "react";

import { Button } from "./Button";
import { Input } from "./Input";
import { Notification } from "./Notification";
import * as Error from "./Error";

const HOST = process.env.HOST ?? "";

type FormProps = {
	children: React.ReactNode;
	errorMessage: string;
	successMessage: string;
	uri: string;
};

export function Form({
	children,
	errorMessage,
	successMessage,
	uri,
	...props
}: FormProps) {
	const withRecursiveProps = React.useCallback(
		(children: React.ReactNode, fn: (child: any) => object): any =>
			React.Children.map(children, (child) => {
				if (!React.isValidElement(child)) {
					return child;
				}

				if (child.props.children) {
					child = React.cloneElement(child, {
						...child.props,
						children: withRecursiveProps(child.props.children, fn),
					});
				}

				let props;
				if (
					typeof child.type === "function" &&
					["Button", "Input"].includes((child.type as any).displayName)
				) {
					props = fn(child);
				}
				return React.cloneElement(child, props);
			}),
		[]
	);

	const merge = React.useCallback((target = {}, source = {}): any => {
		const _target: any = structuredClone(target);
		const _source: any = structuredClone(source);
		Object.keys(_source).forEach((key) => {
			if (typeof _source[key] === "object" && !Array.isArray(_source[key])) {
				_target[key] = merge(_target[key], _source[key]);
			} else {
				_target[key] = _source[key];
			}
		});
		return _target;
	}, []);

	const objectFromArrayNotation = React.useCallback(
		(key: string, val: FormDataEntryValue): any => {
			let object: any = val;

			if (!/\[+.*\]+/g.test(key)) {
				return { [key]: object };
			}

			if (key.match(/\[/g)?.length !== key.match(/\]/g)?.length) {
				throw new Error.App(`Invalid string "${key}"`);
			}

			const matches = key.match(/^(?!\[)[^\[]+|(?!\[)[^\[\]]+(?=\])/g) ?? [];
			for (const v of matches.reverse()) {
				object = { [v]: object };
			}
			return object;
		},
		[]
	);

	const arrayNotationFromDotNotation = React.useCallback(
		(key: string): string => {
			let arrayNotation = "";

			if (!/\./.test(key)) {
				return key;
			}

			if (/^\.|\.{2,}|\.$/.test(key)) {
				throw new Error.App(`Invalid string "${key}"`);
			}

			const matches = key.split(".") ?? [];
			for (const i in matches) {
				const v = matches[i];
				arrayNotation += i === "0" ? v : `[${v}]`;
			}

			return arrayNotation;
		},
		[]
	);

	const format = React.useCallback((errors: any[]): any[] => {
		const _errors: any = structuredClone(errors);

		for (const i in errors) {
			_errors[i] = errors[i];
			if (_errors[i].extensions?.field) {
				_errors[i].extensions.field = arrayNotationFromDotNotation(
					_errors[i].extensions.field
				);
			}
		}

		return _errors;
	}, []);

	const hasValidationError = React.useCallback(
		(data?: any, field?: string): boolean => {
			for (const error of data ?? []) {
				if (error?.extensions?.code === "ERR_GRAPHQL_CONSTRAINT_VALIDATION") {
					if (field && error.extensions?.field !== field) {
						continue;
					}

					return true;
				}
			}

			return false;
		},
		[]
	);

	const [errors, setErrors] = React.useState<any>([]);
	const [isSubmitting, setSubmitting] = React.useState(false);
	const [notification, setNotification] = React.useState<any>(null);

	const onSubmit = React.useCallback(
		async (el: React.FormEvent<HTMLFormElement>) => {
			el.preventDefault();

			setSubmitting(true);

			try {
				const form = el.target as HTMLFormElement;

				const data = new FormData(form);
				let body = {};
				for (const [key, val] of data.entries()) {
					body = merge(body, objectFromArrayNotation(key, val));
				}

				const url = `${HOST}${uri}`;
				const req: any = await fetch(url, {
					body: JSON.stringify(body),
					headers: new Headers({ "Content-type": "application/json" }),
					method: "POST",
				});
				if (!req.ok) {
					throw new Error.App({
						message: "Error fetching data",
					});
				}

				await req.json();

				setNotification({
					message: successMessage,
					type: "success",
				});

				form.reset();
			} catch (e: any) {
				let message = "An error occurred";
				if (e instanceof Error.App) {
					message = e.message;
				}

				setErrors(format(e.errors));

				setNotification({
					message,
					type: "error",
				});
			} finally {
				setTimeout(() => setSubmitting(false), 750);
			}
		},
		[errorMessage, successMessage, uri]
	);

	const withRecursivePropsCallback = React.useCallback(
		(child: any) => ({
			error: hasValidationError(errors, child.props.name) && "invalid",
			isSubmitting,
		}),
		[errors, isSubmitting]
	);

	const childrenWithProps = React.useMemo(
		() => withRecursiveProps(children, withRecursivePropsCallback),
		[children]
	);

	return (
		<form
			className="flex flex-col items-end w-full sm:w-2/3"
			{...props}
			onSubmit={onSubmit}
		>
			<Notification {...notification} onClose={() => setNotification(null)} />

			{childrenWithProps}
		</form>
	);
}

Form.Button = Button;
Form.Input = Input;
