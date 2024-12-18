import { useState } from 'react';
import { backend } from 'wailsjs/go/models';

interface TreeNodeProps {
	directory: backend.Directory;
}

const leftPadding = 'pl-4';

// A component to represent an individual folder or file
export function TreeNode(props: TreeNodeProps) {
	const [isOpen, setIsOpen] = useState(false);

	const toggleCollapse = () => {
		setIsOpen(!isOpen);
	};

	return (
		<div className={`${leftPadding} `}>
			<div onClick={toggleCollapse} className={`${leftPadding} cursor-pointer `}>
				{isOpen ? '[-]' : '[+]'} {props.directory.Name}
			</div>
			{isOpen && (
				<div>
					{props.directory.SubDirs.map((childDirectory) => (
						<TreeNode key={childDirectory.Path} directory={childDirectory} />
					))}

					{props.directory.Files.map((childFile) => (
						<FileNode key={childFile.Path} file={childFile} />
					))}
				</div>
			)}
		</div>
	);
}

export function FileNode(props: { file: backend.FileInfo }) {
	return <div className={`${leftPadding} `}>{props.file.Name}</div>;
}
