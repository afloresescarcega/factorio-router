import base64
import gzip
import json
import re


def _parse_lua_literal(s):
    match = re.match(r'-?\d+(?:\.\d+)?', s)
    if match:
        return float(match.group()) if '.' in match.group() else int(match.group()), match.end()
    # Handle unquoted string keys
    match = re.match(r'[a-zA-Z_]\w*', s)
    if match:
        return match.group(), match.end()
    raise ValueError(f"Unable to parse: {s}")


def _parse_lua_value(s, i):
    s = s[i:].lstrip()
    if s.startswith('{'):
        return _parse_lua_table(s)
    if s.startswith('"'):
        end = s.index('"', 1)
        return s[1:end], end + 1
    if s.startswith("'"):
        end = s.index("'", 1)
        return s[1:end], end + 1
    if s.startswith('true'):
        return True, 4
    if s.startswith('false'):
        return False, 5
    if s.startswith('nil'):
        return None, 3
    return _parse_lua_literal(s)


def _parse_bracket_key(s):
    end = s.index(']')
    key = s[1:end].strip()
    if key.startswith(('"', "'")):
        key = key[1:-1]
    return key, s[end + 1:].lstrip()


def _parse_table_key(s):
    if s.startswith('['):
        return _parse_bracket_key(s)
    key, end = _parse_lua_value(s, 0)
    return key, s[end:].lstrip()


def _parse_lua_table(s):
    result = {}
    s = s[1:].lstrip()  # Remove opening '{'
    while s and not s.startswith('}'):
        key, s = _parse_table_key(s)

        if not s.startswith('='):
            raise ValueError(f"Expected '=' after key, found: {s}")
        s = s[1:].lstrip()

        value, end = _parse_lua_value(s, 0)
        s = s[end:].lstrip()

        result[key] = value

        if s.startswith(','):
            s = s[1:].lstrip()
        elif not s.startswith('}') and not s:
            # If there's more content but no comma, tolerate it and keep parsing.
            raise ValueError(f"Expected ',' or '}}', found: {s}")

    if not s.startswith('}'):
        raise ValueError(f"Expected '}}', found: {s}")

    return result, len(s) - len(s.lstrip('}'))


class HelmodFactory:
    @staticmethod
    def decode_helmod(encoded_string):
        encoded_string = ''.join(encoded_string.split())
        decoded_data = base64.b64decode(encoded_string)
        decompressed_data = gzip.decompress(decoded_data).decode('utf-8')
        lua_table = decompressed_data.replace('do local _=', '').replace(';return _;end', '')
        python_dict = HelmodFactory.lua_to_python(lua_table)

        return python_dict

    @staticmethod
    def encode_helmod(data):
        lua_string = HelmodFactory.python_to_lua(data)
        wrapped_lua = f"do local _={lua_string};return _;end"
        utf8_encoded = wrapped_lua.encode('utf-8')
        compressed_data = gzip.compress(utf8_encoded)
        return base64.b64encode(compressed_data).decode('utf-8')

    @staticmethod
    def lua_to_python(lua_string):
        return _parse_lua_value(lua_string, 0)[0]

    @staticmethod
    def python_to_lua(data):
        if isinstance(data, dict):
            items = []
            for k, v in data.items():
                if isinstance(k, str) and not re.match(r'^[a-zA-Z_]\w*$', k):
                    k = f'["{k}"]'
                items.append(f"{k}={HelmodFactory.python_to_lua(v)}")
            return '{' + ','.join(items) + '}'
        elif isinstance(data, list):
            return '{' + ','.join(HelmodFactory.python_to_lua(x) for x in data) + '}'
        elif isinstance(data, str):
            return f'"{data}"'
        elif isinstance(data, bool):
            return 'true' if data else 'false'
        elif data is None:
            return 'nil'
        else:
            return str(data)


# Example usage
if __name__ == "__main__":
    # Example Helmod string
    pass
