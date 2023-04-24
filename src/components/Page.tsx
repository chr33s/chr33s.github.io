import type { Props } from "../types";

export function Page({ children }: Props) {
	return (
		<main className="p-6 sm:p-0 flex min-h-screen w-screen flex-col items-center justify-center">
			{children}
		</main>
	);
}
