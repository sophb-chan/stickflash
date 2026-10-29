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
    } catch {}

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
        octopus:   /uhd\s+(graphics\s+)?6(00|05)?\b/i,
        apollo:    /hd\s+(graphics\s+)?5(00|05)\b/i,
        amberlake: /hd\s+(graphics\s+)?615\b/i,
        volteer:   /iris\s+xe\b/i,
        dedede:    { pattern: /uhd\b/i, maxCores: 4 }, // Jasper Lake: generic "UHD" tag but strictly <= 4 cores
        brya:      { pattern: /uhd\b/i, minCores: 5 }, // Alder Lake+: generic "UHD" tag but hybrid architectures >= 5 cores
        kukui:     /mali-g52\b/i,
        cherry:    /mali-g57\b/i,
        zork:      /radeon\b/i
    }

    let predictedBaseBoard = "unknown";
    for (const [boardName, rule] of Object.entries(HardwareToBoardBridge)) {
        const pattern = rule.pattern || rule; // handle both short regex syntax and long rules objects

        if (pattern.test(hardware.gpu) || pattern.test(GPUkeyword)) {
            // enforce strict core density checks to separate overlapping profiles
            if (rule.maxCores && hardware.cores > rule.maxCores) continue;
            if (rule.minCores && hardware.cores < rule.minCores) continue;

            predictedBaseBoard = boardName;
            break;
        }
    }

    console.log('Resolved baseboard via cores and regex:', predictedBaseBoard);

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

await autoDetectChromeOSBoard();
