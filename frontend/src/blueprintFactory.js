import pako from 'pako';

export function decodeBlueprint(encodedBlueprint) {
    encodedBlueprint = encodedBlueprint.slice(1);
    const compressedData = atob(encodedBlueprint);
    const uint8Array = new Uint8Array(compressedData.length);
    for (let i = 0; i < compressedData.length; i++) {
        uint8Array[i] = compressedData.codePointAt(i);
    }
    const jsonData = pako.inflate(uint8Array, { to: 'string' });
    const blueprint = JSON.parse(jsonData);

    return blueprint;
}

export function encodeBlueprint(blueprint) {
    const jsonStr = JSON.stringify(blueprint);
    const compressedData = pako.deflate(jsonStr, { level: 9 });
    // Chunked to avoid blowing the argument limit on large blueprints
    let binary = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < compressedData.length; i += CHUNK) {
        binary += String.fromCodePoint(...compressedData.subarray(i, i + CHUNK));
    }
    return '0' + btoa(binary);
}
