import pako from 'pako';

export class HelmodFactory {
    static decodeHelmod(encodedString) {
        encodedString = encodedString.replace(/\s/g, '');
        const decodedData = atob(encodedString);
        const uint8Array = new Uint8Array(decodedData.length);
        for (let i = 0; i < decodedData.length; i++) {
            uint8Array[i] = decodedData.codePointAt(i);
        }
        const decompressedData = pako.inflate(uint8Array, { to: 'string' });
        const luaTable = decompressedData.replace('do local _=', '').replace(';return _;end', '');
        return HelmodFactory.luaToPython(luaTable);
    }

    static encodeHelmod(data) {
        const luaString = HelmodFactory.pythonToLua(data);
        const wrappedLua = `do local _=${luaString};return _;end`;
        const compressedData = pako.deflate(wrappedLua);
        return btoa(String.fromCodePoint(...compressedData));
    }

    static luaToPython(luaString) {
        // Recursive-descent parser over a single cursor position so nested
        // tables consume the correct number of characters.
        const s = luaString;
        let i = 0;

        function skipWhitespace() {
            while (i < s.length && /\s/.test(s[i])) i++;
        }

        function parseValue() {
            skipWhitespace();
            if (s[i] === '{') {
                return parseTable();
            }
            if (s[i] === '"' || s[i] === "'") {
                const quote = s[i];
                const end = s.indexOf(quote, i + 1);
                if (end === -1) throw new Error(`Unterminated string at ${i}`);
                const value = s.slice(i + 1, end);
                i = end + 1;
                return value;
            }
            if (s.startsWith('true', i)) { i += 4; return true; }
            if (s.startsWith('false', i)) { i += 5; return false; }
            if (s.startsWith('nil', i)) { i += 3; return null; }

            const rest = s.slice(i);
            let match = rest.match(/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/);
            if (match) {
                i += match[0].length;
                return /[.eE]/.test(match[0]) ? Number.parseFloat(match[0]) : Number.parseInt(match[0], 10);
            }
            match = rest.match(/^[a-zA-Z_]\w*/);
            if (match) {
                i += match[0].length;
                return match[0];
            }
            throw new Error(`Unable to parse at ${i}: ${rest.slice(0, 60)}`);
        }

        function parseBracketKey() {
            const end = s.indexOf(']', i);
            if (end === -1) throw new Error(`Unterminated '[' key at ${i}`);
            let key = s.slice(i + 1, end).trim();
            if (key.startsWith('"') || key.startsWith("'")) {
                key = key.slice(1, -1);
            }
            i = end + 1;
            skipWhitespace();
            if (s[i] !== '=') throw new Error(`Expected '=' after key at ${i}`);
            i++;
            return key;
        }

        function parseTableEntry(result, arrayIndex) {
            if (s[i] === '[') {
                const key = parseBracketKey();
                result[key] = parseValue();
                return arrayIndex;
            }
            const value = parseValue();
            skipWhitespace();
            if (s[i] === '=') {
                i++;
                result[value] = parseValue();
                return arrayIndex;
            }
            // Bare value: Lua array-style entry
            result[arrayIndex] = value;
            return arrayIndex + 1;
        }

        function parseTable() {
            i++; // consume '{'
            const result = {};
            let arrayIndex = 1;
            skipWhitespace();
            while (i < s.length && s[i] !== '}') {
                arrayIndex = parseTableEntry(result, arrayIndex);
                skipWhitespace();
                if (s[i] === ',') {
                    i++;
                    skipWhitespace();
                }
            }
            if (s[i] !== '}') throw new Error(`Expected '}' at ${i}`);
            i++;
            return result;
        }

        return parseValue();
    }

    static luaKey(k) {
        if (typeof k === 'string' && !/^[a-zA-Z_]\w*$/.test(k)) {
            return `["${k}"]`;
        }
        return k;
    }

    static objectToLua(data) {
        const items = Object.entries(data)
            .map(([k, v]) => `${HelmodFactory.luaKey(k)}=${HelmodFactory.pythonToLua(v)}`);
        return '{' + items.join(',') + '}';
    }

    static pythonToLua(data) {
        if (Array.isArray(data)) {
            return '{' + data.map(x => HelmodFactory.pythonToLua(x)).join(',') + '}';
        }
        if (data !== null && typeof data === 'object') {
            return HelmodFactory.objectToLua(data);
        }
        if (typeof data === 'string') {
            return `"${data}"`;
        }
        if (typeof data === 'boolean') {
            return data ? 'true' : 'false';
        }
        if (data === null) {
            return 'nil';
        }
        return String(data);
    }
}
