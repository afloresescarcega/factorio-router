import pako from 'pako';

const VERSION_BYTE = new Uint8Array([0]);

export function decodeBlueprint(encodedBlueprint) {
    encodedBlueprint = encodedBlueprint.slice(1);
    const compressedData = atob(encodedBlueprint);
    const uint8Array = new Uint8Array(compressedData.length);
    for (let i = 0; i < compressedData.length; i++) {
        uint8Array[i] = compressedData.charCodeAt(i);
    }
    const jsonData = pako.inflate(uint8Array, { to: 'string' });
    const blueprint = JSON.parse(jsonData);

    return blueprint;
}

export function encodeBlueprint(blueprint) {
    const jsonStr = JSON.stringify(blueprint);
    const compressedData = pako.deflate(jsonStr, { level: 9 });
    const base64Encoded = btoa(String.fromCharCode.apply(null, compressedData));
    const encodedBlueprint = new Uint8Array([...VERSION_BYTE, ...new TextEncoder().encode(base64Encoded)]);
    return '0' + new TextDecoder().decode(encodedBlueprint);
}
