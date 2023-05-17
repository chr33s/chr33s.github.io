import clsx from "clsx";
import * as React from "react";

type Notification = null | {
	message?: string | undefined;
	type?: "error" | "info" | "success" | undefined;
};

type NotificationProps = Notification & {
	onClose?: () => void;
};

export function Notification({ type = "info", ...props }: NotificationProps) {
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
