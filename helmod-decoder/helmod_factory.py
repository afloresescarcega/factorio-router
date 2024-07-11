import base64
import gzip
import json
import re


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
        def parse_value(s, i):
            s = s[i:].lstrip()
            if s.startswith('{'):
                return parse_table(s)
            elif s.startswith('"'):
                end = s.index('"', 1)
                return s[1:end], end + 1
            elif s.startswith("'"):
                end = s.index("'", 1)
                return s[1:end], end + 1
            elif s.startswith('true'):
                return True, 4
            elif s.startswith('false'):
                return False, 5
            elif s.startswith('nil'):
                return None, 3
            else:
                match = re.match(r'-?\d+(?:\.\d+)?', s)
                if match:
                    return float(match.group()) if '.' in match.group() else int(match.group()), match.end()
                else:
                    # Handle unquoted string keys
                    match = re.match(r'[a-zA-Z_][a-zA-Z0-9_]*', s)
                    if match:
                        return match.group(), match.end()
                    raise ValueError(f"Unable to parse: {s}")

        def parse_table(s):
            result = {}
            s = s[1:].lstrip()  # Remove opening '{'
            while s and not s.startswith('}'):
                # Parse key
                if s.startswith('['):
                    end = s.index(']')
                    key = s[1:end].strip()
                    if key.startswith('"') or key.startswith("'"):
                        key = key[1:-1]
                    s = s[end + 1:].lstrip()
                else:
                    key, end = parse_value(s, 0)
                    s = s[end:].lstrip()

                if not s.startswith('='):
                    raise ValueError(f"Expected '=' after key, found: {s}")
                s = s[1:].lstrip()

                # Parse value
                value, end = parse_value(s, 0)
                s = s[end:].lstrip()

                result[key] = value

                if s.startswith(','):
                    s = s[1:].lstrip()
                elif not s.startswith('}'):
                    # If we're not at the end of this table, continue parsing
                    if s:
                        continue
                    raise ValueError(f"Expected ',' or '}}', found: {s}")

            if not s.startswith('}'):
                raise ValueError(f"Expected '}}', found: {s}")

            return result, len(s) - len(s.lstrip('}'))

        return parse_value(lua_string, 0)[0]

    @staticmethod
    def python_to_lua(data):
        if isinstance(data, dict):
            items = []
            for k, v in data.items():
                if isinstance(k, str):
                    if re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', k):
                        k = k  # Keep valid Lua identifiers unquoted
                    else:
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
    helmod_string = """
    H4sIAAAAAAAA/81UXY/aMBD8KyjPDkrg6LU6+U/c6+kUOc4SLPwlxz6KkP971yQhgUKF7ql5gV17Z8fj8TZmIQ1nclHRk2hopkwDslpnxBw0OJrtQApjd6YW
    vAkNZKTG7fuOns6/VdlXDUFGNFNAMxa8UcwLo/OOC9Accsv4/jEoN0F7WhJrDrheEKFbBw1Weuz0kXFjLbjcSuYh+6SnvstVlvijxZzwoEa4gnQel+gqko9M
    OCTTAnP5YQcgJ5TbhX8CRWKdaQLvaT065gX7oQ6Pe5TYwwEXFrDF+6qX932VoSQN/MZtTyH3CBP2wBq3o8hbxr1xxwvJrgNVS5Q8V4zvhIa8HHHwAoQ/TjiA
    19ce6evrpkDCFqChxXJDpFAiLaN5gkzEI4HtFs4yDbsuFL4QEENudBeUPVPCRSNl6P9Hwpn9TtksWBY/br5yoF5545mcl46ZSGpgCD/K0kf3r2qQ4eVngR9m
    VW3oC0EzVqO2SZVZXCXenmHx+q5YV9wi8QIZPEE5XlwRNF7gHhXzLsCNCQa0v8oJKqlYMkIdhGzQAJjrCQvoDX7PGp/PGOdKrzhqm8bGsyJj0aRQPB91NhPS
    I+lMcLwXcDjiF7guGSArlr+W6834aMp+aFX4lMrhcaX/q9ljjpMY/6cCZHZHg/1u/N+mNEPquJ1xHlSQKbpwnVL3u+GQ7IzEOWiZng/IefJhoQemctAtSjCr
    nGfvnzC+OfDB6UX1Brr5A4bXHxaNBgAA
    """

    # Decode
    decoded_output = HelmodFactory.decode_helmod(helmod_string)
    print("Decoded data:")
    print(json.dumps(decoded_output, indent=2))

    # Encode
    re_encoded_input = HelmodFactory.encode_helmod(decoded_output)
    print("\nRe-encoded string:")
    print(re_encoded_input)
