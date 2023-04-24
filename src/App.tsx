import { LockClosedIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";
import React from "react";

import data from "./data.json";

export default function App() {
	return (
		<ErrorBoundary
			fallback={<ErrorPage code={500}>Something went wrong</ErrorPage>}
		>
			<React.Suspense fallback={<LoadingPage />}>
				<PortfolioPage />
			</React.Suspense>
		</ErrorBoundary>
	);
}

type ErrorArguments =
	| string
	| {
			errors?: unknown[];
			message?: string;
	  };

class AppError extends Error {
	public errors = [];

	public constructor(args: ErrorArguments) {
		super();

		Object.setPrototypeOf(this, new.target.prototype);
		this.name = this.constructor.name;
		Object.assign(this, args);
	}
}

type Props = {
	children: React.ReactNode;
};

type ButtonProps = Props & {
	className?: string;
	isSubmitting?: boolean;
};

function Button({
	className = "relative text-black hover:text-gray-200 hover:bg-black border border-black min-h-[50px] w-full rounded-[5px] px-12 font-medium transition duration-500 ease-in-out",
	children,
	isSubmitting = false,
}: ButtonProps) {
	return (
		<button className={className} disabled={isSubmitting}>
			{isSubmitting ? <Loading /> : children}
		</button>
	);
}
Button.displayName = "Button";

type ErrorBoundaryProps = Props & {
	fallback: React.ReactNode;
};

type ErrorBoundaryState = {
	hasError: boolean;
};

class ErrorBoundary extends React.Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	props: {
		children: React.ReactNode;
		fallback: React.ReactNode;
	};

	state: {
		hasError: boolean;
	};

	constructor(props: any) {
		super(props);
		this.props = props;
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(_error: Error) {
		return { hasError: true };
	}

	componentDidCatch(error: Error, info: any) {
		console.log(error, info.componentStack);
	}

	render() {
		if (this.state.hasError) {
			return this.props.fallback;
		}

		return this.props.children;
	}
}

type ErrorPageProps = Props & {
	code?: number;
};

function ErrorPage({ children }: ErrorPageProps) {
	return (
		<Page>
			<h1>{children}</h1>
		</Page>
	);
}

type FormProps = {
	children: React.ReactNode;
	errorMessage: string;
	successMessage: string;
	query: string;
};

function Form({
	children,
	errorMessage,
	query,
	successMessage,
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
				throw new Error(`Invalid string "${key}"`);
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
				throw new Error(`Invalid string "${key}"`);
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
				let variables = {};
				for (const [key, val] of data.entries()) {
					variables = merge(variables, objectFromArrayNotation(key, val));
				}

				const res = await mutate({ query, variables });
				if (res.errors?.length > 0) {
					throw new AppError({
						errors: res.errors,
						message: errorMessage,
					});
				}

				setNotification({
					message: successMessage,
					type: "success",
				});

				form.reset();
			} catch (e: any) {
				let message = "An error occurred";
				if (e instanceof AppError) {
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
		[errorMessage, query, successMessage]
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

type ImageProps = {
	alt?: string;
	className?: string;
	loading?: "eager" | "lazy";
	src: string;
};

function Image(props: ImageProps) {
	const [src, setSrc] = React.useState<string | null>(null);

	React.useEffect(() => {
		const img = new window.Image();
		img.onload = () => {
			setTimeout(() => {
				setSrc(props.src);
			}, 750);
		};
		img.src = props.src;

		return () => {
			img.src = "";
		};
	}, [props.src]);

	return (
		<div className="relative">
			<img
				loading="lazy"
				{...props}
				className={clsx("w-full h-auto", props.className, !src && "invisible")}
			/>

			{!src && (
				<span className="absolute left-1/2 top-1/2 -ml-[22px] -mt-[12px]">
					<Loading />
				</span>
			)}
		</div>
	);
}

type InputProps = {
	className?: string;
	disabled?: boolean;
	error?: string;
	inputClassName?: string;
	isSubmitting?: boolean;
	label?: string;
	min?: number;
	minLength?: number;
	maxLength?: number;
	max?: number;
	options?: string[];
	placeholder?: string;
	required?: boolean;
	step?: number;
	name: string;
	type: string;
	value?: string;
};

function Input({
	className = "mb-3 grid w-full sm:grid-cols-3",
	error,
	inputClassName,
	isSubmitting = false,
	label,
	options,
	type,
	...props
}: InputProps) {
	const Field = () => {
		switch (type) {
			case "textarea":
				return (
					<textarea
						className={
							inputClassName ?? "col-span-2 resize-none rounded border-gray-300"
						}
						disabled={isSubmitting}
						rows={5}
						{...props}
					/>
				);
			case "select":
				return (
					<select
						className={inputClassName ?? "col-span-2 rounded border-gray-300"}
						disabled={isSubmitting}
						{...props}
					>
						{options?.map((option: string) => (
							<option key={option} value={option}>
								{option}
							</option>
						))}
					</select>
				);
			default:
				return (
					<input
						className={inputClassName ?? "col-span-2 rounded border-gray-300"}
						disabled={isSubmitting}
						type={type}
						{...props}
					/>
				);
		}
	};

	return (
		<label className={className}>
			{label && (
				<span className="block text-gray-500">
					{label}
					{props.required ? <span className="text-red-600">*</span> : ""}
				</span>
			)}

			<Field />

			{error && (
				<span className="bg-theme-red after:border-t-theme-red absolute -top-2 right-2 inline-flex rounded-sm px-2 py-1 text-xs font-bold text-white after:absolute after:bottom-[-5px] after:right-[7px] after:border-x-[5px] after:border-t-[5px] after:border-transparent">
					{error}
				</span>
			)}
		</label>
	);
}
Input.displayName = "Input";

function Loading() {
	return (
		<div className="m-auto inline-flex">
			<span className="animate-spinner animation-delay-[-320ms] bg-gray-200 h-3 w-3 rounded-full" />
			<span className="animate-spinner animation-delay-[-160ms] bg-gray-400 ml-1 h-3 w-3 rounded-full" />
			<span className="animate-spinner bg-gray-600 ml-1 h-3 w-3 rounded-full" />
		</div>
	);
}

function LoadingPage() {
	return (
		<Page>
			<Loading />
		</Page>
	);
}

type MutateProps = {
	query: string;
	variables?: any;
};

async function mutate({ query, variables }: MutateProps) {
	const url = "/api/graphql";
	const req: any = await fetch(url, {
		body: JSON.stringify({
			query,
			variables,
		}),
		headers: new Headers({ "Content-type": "application/json" }),
		method: "POST",
	});
	if (!req.ok) {
		throw new AppError({
			message: "Error fetching data",
		});
	}

	const res: any = await req.json();
	if (res.errors?.length > 0) {
		throw new AppError({
			errors: res.errors,
			message: "Error in response data",
		});
	}

	return res.data;
}

type Notification = null | {
	message?: string | undefined;
	type?: "error" | "info" | "success" | undefined;
};

type NotificationProps = Notification & {
	onClose?: () => void;
};

function Notification({ type = "info", ...props }: NotificationProps) {
	const [message, setMessage] = React.useState<string | undefined>();
	React.useEffect(() => {
		setMessage(props.message);
	}, [props.message]);

	const onClose = React.useCallback(() => {
		props.onClose?.();

		setMessage(undefined);
	}, [props]);

	React.useEffect(() => {
		const timeoutId = setTimeout(onClose, 10 * 1000);
		return () => clearTimeout(timeoutId);
	}, [onClose]);

	const bgColor = React.useMemo(() => {
		switch (type) {
			case "error":
				return "bg-red-100";
			case "info":
				return "bg-gray-100";
			case "success":
				return "bg-green-100";
		}
	}, [type]);

	const borderColor = React.useMemo(() => {
		switch (type) {
			case "error":
				return "border-red-400";
			case "info":
				return "border-gray-300";
			case "success":
				return "border-green-500";
		}
	}, [type]);

	const textColor = React.useMemo(() => {
		switch (type) {
			case "error":
				return "text-red-600";
			case "info":
				return "text-gray-600";
			case "success":
				return "text-green-600";
		}
	}, [type]);

	if (!message) {
		return null;
	}

	return (
		<div
			className={clsx(
				"body-font fixed top-6 right-6 z-10 flex rounded border px-6 py-4 pr-12 shadow-lg",
				bgColor,
				borderColor,
				textColor
			)}
		>
			<p className="text-base">{message}</p>
			<button
				className="absolute right-2 top-1 p-2 text-xl"
				onClick={onClose}
				type="button"
			>
				&times;
			</button>
		</div>
	);
}

function Page({ children }: Props) {
	return (
		<main className="p-6 sm:p-0 flex min-h-screen w-screen flex-col items-center justify-center">
			{children}
		</main>
	);
}

function PortfolioFooter() {
	const year = new Date().getFullYear();

	return (
		<footer className="w-full max-w-5xl mb-6 text-gray-500 flex flex-row justify-between">
			<div>&copy; {year}, All rights reserved</div>
			<div>Private &amp; Confidential</div>
		</footer>
	);
}

function PortfolioHeader() {
	const onClick = React.useCallback((e: any) => {
		e.preventDefault();

		const id = new URL(e.target.href).hash.replace(/^#/, "");
		document.getElementById(id)?.scrollIntoView({
			behavior: "smooth",
			block: "start",
		});
	}, []);

	return (
		<header className="flex flex-row justify-end w-full max-w-5xl mt-6">
			<nav className="space-x-6 self-end underline text-lg text-gray-600">
				<a
					aria-label="Link to Expertise"
					className="hover:text-gray-800"
					href="#expertise"
					onClick={onClick}
				>
					Expertise
				</a>
				<a
					aria-label="Link to Contact form"
					className="hover:text-gray-800"
					href="#contact"
					onClick={onClick}
				>
					Contact
				</a>
			</nav>
		</header>
	);
}

function PortfolioMain() {
	return (
		<main className="flex flex-col justify-start w-full max-w-5xl mt-36">
			<img
				alt={data.name}
				className="w-[64px] h-auto mb-6"
				loading="eager"
				src="/assets/icon.svg"
			/>
			<h1 className="text-3xl sm:text-5xl font-medium mb-8 leading-tight text-gray-800">
				{data.heading}
			</h1>
			<p className="text-base sm:text-lg mb-24 leading-relaxed text-gray-600">
				{data.description}
			</p>

			<PortfolioMainExpertise />
			<PortfolioMainContact />
		</main>
	);
}

function PortfolioMainContact() {
	const query = /* GraphQL */ `
		mutation ContactForm($input: ContactFormInput!) {
			contactForm(input: $input)
		}
	`;

	return (
		<section
			className="flex justify-center items-center sm:mt-6 sm:mb-36 h-screen"
			id="contact"
		>
			<div className="flex w-full flex-col sm:flex-row">
				<div className="w-full sm:w-1/3 self-start mb-6 sm:mb-0">
					<h2 className="text-3xl font-medium text-gray-700 mb-3 sm:mb-9">
						Contact
					</h2>
					<ul className="flex flex-row space-x-4 mb-3 sm:mb-0">
						{data.social.map((profile, index) => {
							const provider = toTitleCase(
								profile.url.match(/^https?:\/\/([a-z-_]*)/i)?.[1]
							);

							return (
								<li key={index}>
									<a aria-label={`${provider} profile`} href={profile.url}>
										<img
											alt=""
											className="opacity-25 hover:opacity-100 w-5 h-auto"
											loading="lazy"
											src={profile.icon}
										/>
									</a>
								</li>
							);
						})}
					</ul>
				</div>
				<Form
					errorMessage="Form submission failed"
					query={query}
					successMessage="Form submitted successfully"
				>
					<Input
						label="Company Name"
						minLength={2}
						maxLength={254}
						name="input[company]"
						required={true}
						type="text"
					/>
					<Input
						label="Full Name"
						minLength={2}
						maxLength={254}
						name="input[name]"
						required={true}
						type="text"
					/>
					<Input
						label="Email"
						minLength={5}
						maxLength={254}
						name="input[email]"
						required={true}
						type="email"
					/>
					<Input
						label="Timeframe"
						name="input[timeframe]"
						options={["Unknown", "3 - 6 months", "6 - 12 months", "12+ months"]}
						type="select"
					/>

					<div className="w-full sm:w-2/3 self-end">
						<Button>Continue</Button>

						<p className="mt-2 basis-full text-left text-sm text-gray-500">
							<LockClosedIcon className="-mt-1 mr-1 inline-block h-4 w-4 tracking-wider text-gray-500" />
							Your data is protected, i will never spam
						</p>
					</div>
				</Form>
			</div>
		</section>
	);
}

function PortfolioMainExpertise() {
	return (
		<section className="mt-6" id="expertise">
			<h2 className="text-3xl font-medium text-gray-700 mb-6 mt-6">
				Project Expertise
			</h2>

			{data.portfolio.map((portfolio, index) => (
				<PortfolioMainExpertisePortfolio key={index} portfolio={portfolio} />
			))}

			<PortfolioMainExpertiseStack />
		</section>
	);
}

function PortfolioMainExpertiseStack() {
	const stack = React.useMemo(() => {
		const stack: string[] = [];
		for (const portfolio of data.portfolio) {
			for (const project of portfolio.projects) {
				stack.push(...project.stack);
			}
		}
		return [...new Set(stack)].sort();
	}, []);

	if (stack?.length === 0) {
		return null;
	}

	return (
		<>
			<h3 className="text-2xl font-medium text-gray-700 mb-9 pt-16">
				Technology Stack
			</h3>

			<div className="space-x-5 flex">
				{stack.map((image: string, index: number) => {
					const title = toTitleCase(image.match(/\/([a-z-_]*).[a-z]*$/i)?.[1]);

					return (
						<img
							alt={title}
							className="w-9 h-9 grayscale hover:grayscale-0"
							key={`${index}-stack`}
							src={image}
							title={title}
						/>
					);
				})}
			</div>
		</>
	);
}

function PortfolioMainExpertisePortfolio({ portfolio }: { portfolio: any }) {
	return (
		<dl className="mb-6 sm:mb-9 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-12">
			<dt className="text-xl font-medium sm:col-span-3">{portfolio.heading}</dt>
			{portfolio.projects.map((project: any, index: number) => (
				<PortfolioMainExpertisePortfolioProject key={index} project={project} />
			))}
		</dl>
	);
}

function PortfolioMainExpertisePortfolioProject({ project }: { project: any }) {
	const [selected, setSelected] = React.useState(0);

	const onClick = React.useCallback((index: number) => {
		const img = new window.Image();
		img.onload = () => {
			setSelected(index);
		};
		img.src = project.images[index];
	}, []);

	return (
		<dd className="group relative border border-gray-200 flex-1 h-full overflow-x-hidden overflow-y-scroll">
			{project.images.map((image: any, index: number) =>
				selected !== index ? null : (
					<Image
						alt=""
						className={clsx("w-full h-auto", selected !== index && "hidden")}
						key={index}
						src={image}
					/>
				)
			)}
			{project.images.length > 1 && (
				<div className="hidden group-hover:flex w-full justify-center absolute top-6 left-0">
					<div className="flex space-x-2 bg-white rounded-[14px] px-[5px] py-[3px] w-auto">
						{project.images.map((_: any, index: number) => (
							<button
								className={clsx(
									"block w-2 h-2 rounded-full",
									selected === index ? "bg-gray-900" : "bg-gray-200"
								)}
								key={`${index}-pagination`}
								onClick={() => onClick(index)}
							/>
						))}
					</div>
				</div>
			)}
			<div className="w-full bg-gray-50 bg-opacity-90 border-t border-t-gray-200 hidden group-hover:block absolute -mt-[20%] min-h-[20%] text-sm sm:text-base">
				<p className="p-4">{toJSX(project.description)}</p>

				{project.stack?.length > 0 && (
					<div className="px-4 space-x-4 mb-4 flex">
						{project.stack.map((image: string, index: number) => {
							const title = toTitleCase(
								image.match(/\/([a-z-_]*).[a-z]*$/i)?.[1]
							);

							return (
								<img
									alt={title}
									className="w-5 h-5 grayscale hover:grayscale-0"
									key={`${index}-stack`}
									src={image}
									title={title}
								/>
							);
						})}
					</div>
				)}
			</div>
		</dd>
	);
}

function PortfolioPage() {
	React.useEffect(() => {
		const doc = window.document;
		const title = `${data.name}'s Portfolio`;
		doc.title = title;
		doc
			.querySelector('meta[name="description"]')
			?.setAttribute("content", truncate(data.description, 128));
	}, []);

	return (
		<Page>
			<PortfolioHeader />
			<PortfolioMain />
			<PortfolioFooter />
		</Page>
	);
}

function toJSX(str: string): React.ReactNode {
	return str.split("\n").map((item, idx) => {
		return (
			<React.Fragment key={idx}>
				{item}
				<br />
			</React.Fragment>
		);
	});
}

function toTitleCase(str: string | undefined) {
	return (
		str?.replace(
			/\w\S*/g,
			(txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
		) ?? ""
	);
}

function truncate(str: string, limit: number) {
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
