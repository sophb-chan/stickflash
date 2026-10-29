const { JSDOM } = require("jsdom");
const fs = require('fs');
const path = require('path');

// create a basic window/document context
const { window } = new JSDOM();
const { document } = window;

// init DOMNavigator
class DOMNavigator {
    async loadFromURL(webpageURL) {
        // fetch website content
        const documentFetchResponse = await fetch(webpageURL);
        const documentContent = await documentFetchResponse.text();

        // check if content is valid HTML
        try {
            new JSDOM(documentContent);
        } catch {
            throw new SyntaxError('The selected webpage URL does not link to a webpage!');
        }


        const htmlContent = documentContent.substring(
            documentContent.indexOf('<html>') + '<html>'.length,
            documentContent.lastIndexOf('</html>')
        );
        this.html = document.createElement('html');
        this.html.innerHTML = htmlContent;
        this.document = document.implementation.createHTMLDocument(this.html.title);
        this.document.documentElement.innerHTML = documentContent;

        return this;
    }

    constructor(webpageURL) {
        return this.loadFromURL(webpageURL);
    }

    // element finding
    querySelector(selectors) {
        return this.html.querySelector(selectors) ?? this.document.head.querySelector(selectors);
    }
    querySelectorAll(selectors) {
        return this.html.querySelectorAll(selectors) ?? this.document.head.querySelectorAll(selectors);
    }
    getElementById(elementid) {
        return this.document.getElementById(elementid);
    }
    getElementsByClassName(classNames) {
        return this.document.getElementsByClassName(classNames);
    }
    getElementsByName(elementName) {
        return this.document.getElementsByName(elementName);
    }
    getElementsByTagName(qualifiedName) {
        return this.document.getElementsByTagName(qualifiedName);
    }
    getElementsByTagNameNS(namespaceURI, localName) {
        return this.document.getElementsByTagNameNS(namespaceURI, localName);
    }
}


async function getChromeToPlatformMap() {
    const recoveryDoc = await new DOMNavigator('https://cros.download/recovery');
    const tableElements = [...recoveryDoc.querySelectorAll('#boards_table tbody tr')];
    const boards = tableElements.map(element => element.dataset.board);
    const chromeToPlatformMap = {};
    for (const board of boards) {
        chromeToPlatformMap[board] ??= {};
        const recoveryPage = await new DOMNavigator(`https://cros.download/recovery/${board}`);
    }
    return boardToModelMap;
}
async function generateBoardToModelMapFile() {
    console.log('Generating board to model map file...');
    // delete file if it exists to ensure fresh content
    const targetPath = path.join(process.cwd(), '/public/board_to_model.json');
    if (fs.existsSync(targetPath)) {
		fs.unlinkSync(targetPath);
	}

    console.log('Getting board to model map...');
    const boardToModelMap = await getBoardToModelMap();
    console.log('Board count:', Object.keys(boardToModelMap).length);
    const content = JSON.stringify(boardToModelMap);
    console.log('Storing board to model map...');
    fs.writeFileSync(targetPath, content);
    console.log('Generated board to model map file!');
}
generateBoardToModelMapFile();
