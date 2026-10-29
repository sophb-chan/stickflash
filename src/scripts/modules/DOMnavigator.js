class DOMNavigator {
	static cached = {};
	static cacheLimitTime = 60e3 * 5; // 5 minutes

	async loadFromURL(webpageURL) {
		if (
			this.constructor.cached[webpageURL] == null
			||
			Date.now() - this.constructor.cached[webpageURL]?.cacheTime > this.constructor.cacheLimitTime
		) {
			// fetch website content
			const documentFetchResponse = await fetch(webpageURL);
			const documentContent = await documentFetchResponse.text();
			this.constructor.cached[webpageURL] = {
				cacheTime: Date.now(),
				content: documentContent,
			};
		}
		// get cached content
		const documentContent = this.constructor.cached[webpageURL].content;

		// check if content is valid HTML
		const parser = new DOMParser();
		const parserDoc = parser.parseFromString(documentContent, 'text/html');
		const isValid = parserDoc.querySelector('parsererror') === null;
		if (!isValid)
			throw new SyntaxError('The selected webpage URL does not link to a webpage!');

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
