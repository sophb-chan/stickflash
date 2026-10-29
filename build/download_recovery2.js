const fs = require('fs');
const path = require('path');

const fileURL = 'https://dl.google.com/dl/edgedl/chromeos/recovery/recovery2.json';
const targetPath = path.join(process.cwd(), '/public/recovery2.json');

async function downloadFile(attempts = 0) {
	// delete file if needed to ensure fresh content on download
	if (fs.existsSync(targetPath)) {
		fs.unlinkSync(targetPath);
	}
	// use uncached URL for fresh content
	const modifyingURL = new URL(fileURL);
	modifyingURL.searchParams.set('t', Date.now());
	const targetURL = modifyingURL.href;

	try {
		console.log(`Fetching file from: ${targetURL}`);
		const response = await fetch(targetURL);

		if (!response.ok) {
			if (attempts < 3) {
				console.warn(`Attempt ${attempts + 1} failed. Retrying...`);
				return downloadFile(attempts + 1);
			}
			throw new Error(`Failed to fetch recovery2.json: ${response.statusText}`);
		}

		const unformattedContent = await response.text();
		const JSONcontent = JSON.parse(unformattedContent);
		for (const entry of JSONcontent) {
			// remove any entries that are not relevant to ChromeOS devices
			if (entry.board && entry.board.toLowerCase().includes('cloudready')) {
				console.log(`Removing CloudReady entry: ${entry.board}`);
				JSONcontent.splice(JSONcontent.indexOf(entry), 1);
			}

			// remove name key since it's always
			// exactly the same as the model key
			// and therefore redundant
			delete entry.name;
		}
		const content = JSON.stringify(JSONcontent); // reformat JSON as minified
		fs.writeFileSync(targetPath, content);
		console.log(`Successfully saved file to: ${targetPath}`);
	} catch (error) {
		console.error('Error while fetching recovery2.json during build step:', error);
		process.exit(1); // force build failure if recovery2 fails to download
	}
}

downloadFile();
