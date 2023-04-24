import React from "react";

import { Error, Loading, Portfolio } from "./components";
import data from "./data.json";

export default function App() {
	return (
		<Error.Boundary
			fallback={<Error.Page code={500}>Something went wrong</Error.Page>}
		>
			<React.Suspense fallback={<Loading.Page />}>
				<Portfolio data={data} />
			</React.Suspense>
		</Error.Boundary>
	);
}
