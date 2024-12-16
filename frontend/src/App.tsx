import { useState } from 'react';

import './App.css';
import { Greet } from '../wailsjs/go/main/App';
import { Button } from './components/ui/button';
import { ModeToggle } from './components/mode-toggle';

function App() {
	const [resultText, setResultText] = useState('Please enter your name below 👇');
	const [name, setName] = useState('');
	const updateName = (e: any) => setName(e.target.value);
	const updateResultText = (result: string) => setResultText(result);

	function greet() {
		Greet(name).then(updateResultText);
	}

	return (
		<div id="App">
			<ModeToggle />
			<Button onClick={greet}>Click me</Button>
		</div>
	);
}

export default App;
