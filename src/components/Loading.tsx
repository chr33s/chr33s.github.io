export function Loading() {
	return (
		<div className="m-auto inline-flex">
			<span className="animate-spinner animation-delay-[-320ms] bg-gray-200 h-3 w-3 rounded-full" />
			<span className="animate-spinner animation-delay-[-160ms] bg-gray-400 ml-1 h-3 w-3 rounded-full" />
			<span className="animate-spinner bg-gray-600 ml-1 h-3 w-3 rounded-full" />
		</div>
	);
}

Loading.Page = function () {
	return (
		<main className="flex min-h-screen w-screen flex-col items-center justify-center">
			<Loading />
		</main>
	);
};
