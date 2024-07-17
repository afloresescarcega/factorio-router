import pako from 'pako';

export class HelmodFactory {
    static decodeHelmod(encodedString) {
        encodedString = encodedString.replace(/\s/g, '');
        const decodedData = atob(encodedString);
        const uint8Array = new Uint8Array(decodedData.length);
        for (let i = 0; i < decodedData.length; i++) {
            uint8Array[i] = decodedData.charCodeAt(i);
        }
        const decompressedData = pako.inflate(uint8Array, { to: 'string' });
        const luaTable = decompressedData.replace('do local _=', '').replace(';return _;end', '');
        return HelmodFactory.luaToPython(luaTable);
    }

    static encodeHelmod(data) {
        const luaString = HelmodFactory.pythonToLua(data);
        const wrappedLua = `do local _=${luaString};return _;end`;
        const compressedData = pako.deflate(wrappedLua);
        return btoa(String.fromCharCode.apply(null, compressedData));
    }

    static luaToPython(luaString) {
        function parseValue(s, i) {
            s = s.slice(i).trim();
            if (s.startsWith('{')) {
                return parseTable(s);
            } else if (s.startsWith('"') || s.startsWith("'")) {
                const end = s.indexOf(s[0], 1);
                return [s.slice(1, end), end + 1];
            } else if (s.startsWith('true')) {
                return [true, 4];
            } else if (s.startsWith('false')) {
                return [false, 5];
            } else if (s.startsWith('nil')) {
                return [null, 3];
            } else {
                const match = s.match(/^-?\d+(?:\.\d+)?/);
                if (match) {
                    return [match[0].includes('.') ? parseFloat(match[0]) : parseInt(match[0]), match[0].length];
                } else {
                    const match = s.match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
                    if (match) {
                        return [match[0], match[0].length];
                    }
                    throw new Error(`Unable to parse: ${s}`);
                }
            }
        }

        function parseTable(s) {
            const result = {};
            s = s.slice(1).trim();
            while (s && !s.startsWith('}')) {
                let key, end;
                if (s.startsWith('[')) {
                    end = s.indexOf(']');
                    key = s.slice(1, end).trim();
                    if (key.startsWith('"') || key.startsWith("'")) {
                        key = key.slice(1, -1);
                    }
                    s = s.slice(end + 1).trim();
                } else {
                    [key, end] = parseValue(s, 0);
                    s = s.slice(end).trim();
                }

                if (!s.startsWith('=')) {
                    throw new Error(`Expected '=' after key, found: ${s}`);
                }
                s = s.slice(1).trim();

                let value;
                [value, end] = parseValue(s, 0);
                s = s.slice(end).trim();

                result[key] = value;

                if (s.startsWith(',')) {
                    s = s.slice(1).trim();
                } else if (!s.startsWith('}')) {
                    if (s) continue;
                    throw new Error(`Expected ',' or '}', found: ${s}`);
                }
            }

            if (!s.startsWith('}')) {
                throw new Error(`Expected '}', found: ${s}`);
            }

            return [result, s.length - s.trimLeft().length];
        }

        return parseValue(luaString, 0)[0];
    }

    static pythonToLua(data) {
        if (typeof data === 'object' && data !== null) {
            if (Array.isArray(data)) {
                return '{' + data.map(x => HelmodFactory.pythonToLua(x)).join(',') + '}';
            } else {
                const items = [];
                for (const [k, v] of Object.entries(data)) {
                    let key = k;
                    if (typeof k === 'string') {
                        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k)) {
                            key = k;
                        } else {
                            key = `["${k}"]`;
                        }
                    }
                    items.push(`${key}=${HelmodFactory.pythonToLua(v)}`);
                }
                return '{' + items.join(',') + '}';
            }
        } else if (typeof data === 'string') {
            return `"${data}"`;
        } else if (typeof data === 'boolean') {
            return data ? 'true' : 'false';
        } else if (data === null) {
            return 'nil';
        } else {
            return String(data);
        }
    }
}
