import { Button } from '@/components/ui/button';
import useCommitGraphBuilder from '@/hooks/use-commit-graph-builder';
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useState } from 'react';
import { useParams } from 'react-router';
import { backend } from 'wailsjs/go/models';
import { RunGitLog } from '../../../wailsjs/go/backend/App';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function RepoLogView() {
	const { encodedRepoPath } = useParams();
	const [logs, setLogs] = useState<backend.GitLogCommitInfo[]>([]);

	const commitGraph = useCommitGraphBuilder(logs);

	if (!encodedRepoPath) {
		return <>Error: why are we rendering RepoHomeView when there's no repo provided?</>;
	}

	const repoPath = atob(encodedRepoPath);

	const refreshLogs = async () => {
		console.debug('refreshing logs on ', repoPath);
		const newLogs = await RunGitLog(repoPath);
		console.debug('got: ', newLogs);
		setLogs(newLogs);
	};

	console.debug(commitGraph);

	return (
		<>
			<Button onClick={refreshLogs}>Refresh </Button>
			Log results:
			<LinearCommitLogTable columns={columns} data={logs} />
			{/* {logs.map((log) => {
				return (
					<div key={log.commitHash}>
						<code className="whitespace-pre-wrap">{JSON.stringify(log, null, 3)}</code>
					</div>
				);
			})} */}
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

const columns: ColumnDef<backend.GitLogCommitInfo>[] = [
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
