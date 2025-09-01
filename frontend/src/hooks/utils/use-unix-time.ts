export const convertUnixTimeToDate = (unixTimeStamp: string): Date => {
	const date = new Date(parseInt(unixTimeStamp) * 1000);
	return date;
};
