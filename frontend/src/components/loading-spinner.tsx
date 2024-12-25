export default function LoadingSpinner() {
	return (
		<div className="h-full w-full grid place-content-center">
			<div className="animate-spin border-4 border-b-transparent border-sidebar-primary rounded-full box-border w-12 h-12" />
		</div>
	);
}
