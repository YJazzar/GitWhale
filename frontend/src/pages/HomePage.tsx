import { Button } from "@/components/ui/button";
import { OpenNewRepo } from "../../wailsjs/go/backend/App";


export default function HomePage() {
	return (
		<div className="">
			Root path is here
			<Button onClick={() => {
				OpenNewRepo()
			}}>test me</Button>
		</div>
	);
}
