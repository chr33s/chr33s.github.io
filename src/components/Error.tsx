import * as React from "react";

import type { Props } from "../types";

type Arguments =
	| string
	| {
			errors?: unknown[];
			message?: string;
	  };

export class App extends Error {
	public errors = [];

	public constructor(args: Arguments) {
		super();

		Object.setPrototypeOf(this, new.target.prototype);
		this.name = this.constructor.name;
		Object.assign(this, args);
	}
}

type BoundaryProps = Props & {
	fallback: React.ReactNode;
};

type BoundaryState = {
	hasError: boolean;
};

export class Boundary extends React.Component<BoundaryProps, BoundaryState> {
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

type PageProps = Props & {
	code?: number;
};

export function Page({ children }: PageProps) {
	return (
		<Page>
			<h1>{children}</h1>
		</Page>
	);
}
