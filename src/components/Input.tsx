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

export function Input({
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
