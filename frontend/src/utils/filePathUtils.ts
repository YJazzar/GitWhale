export function getNameFromPath(filePath: string) {
	return filePath.split('/').pop() || filePath;
}

export function getDirNameFromPath(filePath: string) {
	return filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '';
}
