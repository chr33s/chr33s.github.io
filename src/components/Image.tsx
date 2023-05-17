import clsx from "clsx";
import * as React from "react";

import { Loading } from "./Loading";

type ImageProps = {
	alt?: string;
	className?: string;
	loading?: "eager" | "lazy";
	src: string;
};

export function Image(props: ImageProps) {
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
