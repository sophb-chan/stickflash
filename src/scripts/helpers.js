function deviceIsChromeOS() {
	return navigator.userAgent.includes('CrOS');
}
async function getRecovery2() {
	const r = await fetch(location.origin + '/recovery2.json');
	const text = await r.text();
	return JSON.parse(text);
}
async function getBoardToModelMap() {
	const r = await fetch(location.origin + '/board_to_model.json');
	const text = await r.text();
	return JSON.parse(text);
}
async function findBoardFromModel(model) {
	const boardToModelMap = await getBoardToModelMap();
	for (const [board, models] of Object.entries(boardToModelMap)) {
		if (models.includes(model)) {
			return board;
		}
	}
}
