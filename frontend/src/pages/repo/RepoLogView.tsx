import { Button } from '@/components/ui/button';
import useCommitGraphBuilder from '@/hooks/use-commit-graph-builder';
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { backend } from 'wailsjs/go/models';
import { RunGitLog } from '../../../wailsjs/go/backend/App';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRepoPageHandlers } from '@/hooks/repo-page-handler-context';
import { GitCommitVertical } from 'lucide-react';
import { useCurrentRepoParams } from '@/hooks/use-current-repo';

export default function RepoLogView() {
	const { encodedRepoPath, repoPath } = useCurrentRepoParams();
	const repoPageHandlers = useRepoPageHandlers();
	const [logs, setLogs] = useState<backend.GitLogCommitInfo[]>([]);

	const commitGraph = useCommitGraphBuilder(logs);

	if (!repoPath) {
		return <>Error: why are we rendering RepoHomeView when there's no repo provided?</>;
	}

	const refreshLogs = async () => {
		const newLogs = await RunGitLog(repoPath);
		setLogs(newLogs);
	};

	const generateCommitPageUrl = (commitHash: string) => {
		return `/repo/${encodedRepoPath}/commit/${commitHash}`;
	};

	const onOpenCommitPage = (commitHash: string) => {
		repoPageHandlers?.onAddNewDynamicRoute({
			icon: <GitCommitVertical />,
			title: commitHash.slice(0, 7),
			url: generateCommitPageUrl(commitHash),
		});
	};

	const columns: ColumnDef<backend.GitLogCommitInfo>[] = [
		{
			header: 'Open',
			cell(props) {
				return (
					<Link
						to={generateCommitPageUrl(props.row.original.commitHash)}
						onClick={() => onOpenCommitPage(props.row.original.commitHash)}
					>
						Open
					</Link>
				);
			},
		},
		{
			accessorKey: 'commitHash',
			header: 'hash',
		},
		{
			accessorKey: 'username',
			header: 'User',
		},
		{
			accessorKey: 'shortStat',
			header: 'Stat',
		},
		{
			accessorKey: 'commitMessage',
			header: 'Message',
		},
	];

	return (
		<>
			<Button onClick={refreshLogs}>Refresh </Button>
			Log results:
			<LinearCommitLogTable columns={columns} data={logs} />
		</>
	);
}

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
}

function LinearCommitLogTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => {
								return (
									<TableHead key={header.id}>
										{header.isPlaceholder
											? null
											: flexRender(header.column.columnDef.header, header.getContext())}
									</TableHead>
								);
							})}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows?.length ? (
						table.getRowModel().rows.map((row) => (
							<TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
								{row.getVisibleCells().map((cell) => (
									<TableCell key={cell.id}>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell colSpan={columns.length} className="h-24 text-center">
								No results.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}
