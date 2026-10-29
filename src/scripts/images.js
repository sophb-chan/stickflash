async function getBoards() {
	return Object.keys(await getBoardToModelMap());
}
async function getRecoveries(board, channel = 'all') {
	const boards = await getBoards();
	if (!boards.includes(board))
		throw new ReferenceError(`Unknown board "${board}"`);

	const DOM = await new DOMNavigator(`https://cros.download/recovery/${board}`);
	const channels = [
		...DOM.getElementById('channel_select').children
	].map(element => element.value.toLowerCase());

	if (!channels.includes(channel))
		throw new ReferenceError(`Unknown channel "${channel}"`);

	const recoveryLinks = [];
	const imageTableItems = [...DOM.querySelectorAll('#images_table tbody tr')];
	for (const imageTableItem of imageTableItems) {
		const item = {};
		item.chromeVersion = imageTableItem.querySelector('td[data-field=chrome_version]').textContent.trim();
		item.platformVersion = imageTableItem.querySelector('td[data-field=platform_version]').textContent.trim();
		item.downloadURL = imageTableItem.querySelector('td:not([data-field]) a[href]').href;
		item.kernelVersion = parseInt(imageTableItem.querySelector('td.extra_cell p').textContent) || null;
		recoveryLinks.push(item);
	}
	return recoveryLinks;
}
async function getRMAShims() {
	const DOM = await new DOMNavigator('https://cros.download/shims');
	const shimTableItems = [...DOM.querySelectorAll('#shims_table .shim_link')];
	const shimEntries = shimTableItems
		.map(element => [
			element.textContent.split('.')[0], element.href
		]);
	const shims = Object.fromEntries(shimEntries);
	return shims;
}
async function getRMAShim(board) {
	const boards = await getBoards();
	if (!boards.includes(board))
		throw new ReferenceError(`Unknown board "${board}"`);

	const RMAshims = await getRMAShims();
	return RMAshims[board] ?? null;
}
async function boardHasRMAShim(board) {
	return await getRMAShim(board) != null;
}
