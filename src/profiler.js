async function getHardwareSignature() {
	let profile = {
		gpu: 'unknown',
		arch: 'unknown',
		cores: navigator.hardwareConcurrency || 0
	};

	if (navigator.userAgentData) {
		const hints = await navigator.userAgentData.getHighEntropyValues(['architecture']);
		profile.arch = (hints.architecture || 'unknown').toLowerCase();
	}

	try {
		const canvas = document.createElement('canvas');
		const gl = canvas.getContext('webgl');
		const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
		if (debugInfo) {
			let rawGPU = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
			profile.gpu = rawGPU.replace(/ANGLE \((.*)\)/, '$1').toLowerCase();
		}
	} catch { }

	return profile;
}

async function autoDetectChromeOSBoard() {
	console.log('Analyzing hardware...');
	const hardware = await getHardwareSignature();
	const boardMap = await getBoardToModelMap();

	console.log('Detected hardware signature:', hardware);

	if (hardware.gpu === 'unknown' && hardware.arch === 'unknown') {
		return 'unknown_generic';
	}

	const GPUkeyword = hardware.gpu
		.replace(/mesa|intel\(r\)|\(tm\)|graphics|opensource|opengl|direct3d.*/g, "")
		.replace(/\s+/g, " ")
		.trim();

	const HardwareToBoardBridge = {
		octopus: /uhd\s+(graphics\s+)?6(00|05)?\b/i, // catches: "uhd 600", "uhd 6", "uhd graphics 6", etc.
		apollo: /hd\s+(graphics\s+)?5(00|05)\b/i,   // catches: "hd 500", "hd graphics 505", etc.
		amberlake: /hd\s+(graphics\s+)?615\b/i,
		volteer: /iris\s+xe\b/i,
		brya: /uhd\b/i,                          // baseline catch-all for newer Intel UHD lines
		kukui: /mali-g52\b/i,
		cherry: /mali-g57\b/i,
		zork: /radeon\b/i
	};

	let predictedBaseBoard = 'unknown';
	for (const [boardName, regexPattern] of Object.entries(HardwareToBoardBridge)) {
		// test the regex against both the raw and semi-cleaned strings for maximum safety
		if (regexPattern.test(hardware.gpu) || regexPattern.test(GPUkeyword)) {
			predictedBaseBoard = boardName;
			break;
		}
	}

	console.log('Resolved baseboard via regex:', predictedBaseBoard);

	const isArmGpu = ['mali', 'adreno', 'mediatek'].some(keyword => GPUkeyword.includes(keyword));
	const potentialMatches = [];

	for (const [boardName, entry] of Object.entries(boardMap)) {
		let score = 0;
		const currentBoard = boardName.toLowerCase();
		const modelName = (entry.model || "").toLowerCase();
		const hwid = (entry.hwidmatch || "").toLowerCase();

		// Rule 1: Core system architecture check
		if (hardware.arch === 'arm' && isArmGpu) score += 10;
		if (hardware.arch === 'x86' && !isArmGpu) score += 5;

		// Rule 2: Reference board blueprint matching
		if (predictedBaseBoard !== 'unknown' && currentBoard === predictedBaseBoard) {
			score += 100;
		}

		// Rule 3: Exact hardware name token matching
		if (GPUkeyword !== 'unknown' && (modelName.includes(GPUkeyword) || GPUkeyword.includes(modelName))) {
			score += 20;
		}

		// Rule 4: HWID / GPU character alignment
		const cleanHwid = hwid.replace(/[^a-z]/g, '');
		if (cleanHwid.length > 0 && GPUkeyword.length > 0) {
			const firstHWIDchar = cleanHwid[0];
			const firstGPUchar = GPUkeyword[0];
			if (firstHWIDchar === firstGPUchar) {
				score += 2;
			}
		}

		if (score > 0) {
			potentialMatches.push({ board: boardName, score, entry });
		}
	}

	potentialMatches.sort((a, b) => b.score - a.score);
	console.log('Potential board matches:', potentialMatches);

	if (potentialMatches.length > 0) {
		const bestMatch = potentialMatches[0];
		console.log('Successfully isolated best board match:', bestMatch);
		console.log('Match score:', bestMatch.score);
		return bestMatch;
	}

	console.warn("Couldn't isolate a deterministic board match from manifest parameters.");
	return 'unknown_unmapped';
}
