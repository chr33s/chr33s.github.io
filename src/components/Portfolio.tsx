import { LockClosedIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";
import * as React from "react";

import { Form } from "./Form";
import { Image } from "./Image";
import { Page } from "./Page";
import * as utils from "../utils";

type Project = {
	description: string;
	images: string[];
	stack: string[];
};

type Portfolio = {
	heading: string;
	projects: Project[];
};

type Social = {
	icon: string;
	url: string;
};

type Testimonial = {
	description: string;
	name: string;
};

type Data = {
	description: string;
	heading: string;
	name: string;
	portfolio: Portfolio[];
	social: Social[];
	testimonials: Testimonial[];
};

type Props = {
	data: Data;
};

function Footer() {
	const year = new Date().getFullYear();

	return (
		<footer className="w-full max-w-5xl mb-6 text-gray-500 flex flex-row justify-between">
			<div>&copy; {year}, All rights reserved</div>
			<div>Private &amp; Confidential</div>
		</footer>
	);
}

function Header() {
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
					aria-label="Link to Testimonials"
					className="hover:text-gray-800"
					href="#testimonials"
					onClick={onClick}
				>
					Testimonials
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

function Contact({ data }: Props) {
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
							const provider = utils.toTitleCase(
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
					<Form.Input
						label="Company Name"
						minLength={2}
						maxLength={254}
						name="input[company]"
						required={true}
						type="text"
					/>
					<Form.Input
						label="Full Name"
						minLength={2}
						maxLength={254}
						name="input[name]"
						required={true}
						type="text"
					/>
					<Form.Input
						label="Email"
						minLength={5}
						maxLength={254}
						name="input[email]"
						required={true}
						type="email"
					/>
					<Form.Input
						label="Timeframe"
						name="input[timeframe]"
						options={["Unknown", "3 - 6 months", "6 - 12 months", "12+ months"]}
						type="select"
					/>

					<div className="w-full sm:w-2/3 self-end">
						<Form.Button>Continue</Form.Button>

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

function Expertise({ data }: Props) {
	return (
		<section className="mt-6" id="expertise">
			<h2 className="text-3xl font-medium text-gray-700 mb-6 mt-6">
				Project Expertise
			</h2>

			{data.portfolio.map((portfolio, index) => (
				<dl
					className="mb-6 sm:mb-9 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-12"
					key={index}
				>
					<dt className="text-xl font-medium sm:col-span-3">
						{portfolio.heading}
					</dt>
					{portfolio.projects.map((project: any, index: number) => (
						<Project key={index} project={project} />
					))}
				</dl>
			))}
		</section>
	);
}

function Main({ data }: Props) {
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

			<Expertise data={data} />
			<Testimonials data={data} />
			<Contact data={data} />
		</main>
	);
}

export function Portfolio({ data }: Props) {
	React.useEffect(() => {
		const doc = window.document;
		const title = `${data.name}'s Portfolio`;
		doc.title = title;
		doc
			.querySelector('meta[name="description"]')
			?.setAttribute("content", utils.truncate(data.description, 128));
	}, []);

	return (
		<Page>
			<Header />
			<Main data={data} />
			<Footer />
		</Page>
	);
}

function Project({ project }: { project: Project }) {
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
				<p className="p-4">{utils.toJSX(project.description)}</p>

				{project.stack?.length > 0 && (
					<div className="px-4 space-x-4 mb-4 flex">
						{project.stack.map((image: string, index: number) => {
							const title = utils.toTitleCase(
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

function Testimonials({ data }: Props) {
	return (
		<section className="mt-24" id="testimonials">
			<h2 className="text-3xl font-medium text-gray-700 mb-12 mt-6">
				Project Testimonials
			</h2>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-16">
				{data.testimonials.map((testimonial: any, index: number) => (
					<figure key={index}>
						<blockquote className="text-sm mb-3 text-gray-600 before:text-gray-500 before:content-['\201C'] before:text-5xl before:inline before:leading-[5px] before:mr-[0.25em] before:align-[-0.4em] after:text-gray-500 after:content-['\201D'] after:text-5xl after:inline after:leading-[5px] after:ml-[0.25em] after:align-[-0.6em]">
							{testimonial.description}
						</blockquote>
						<figcaption className="text-gray-700 italic">
							{testimonial.name}
						</figcaption>
					</figure>
				))}
			</div>
		</section>
	);
}
