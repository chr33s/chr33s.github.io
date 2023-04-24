import { Loading } from "./Loading";
import type { Props } from "../types";

type ButtonProps = Props & {
	className?: string;
	isSubmitting?: boolean;
};

export function Button({
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
