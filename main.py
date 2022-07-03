import re
import sys


class Main:
    @classmethod
    def decode(self, input):
        import base64
        import gzip
        base64_decoded = base64.b64decode(input)
        gzip_decompress = gzip.decompress(base64_decoded).decode('utf-8')
        return gzip_decompress


if __name__ == '__main__':
    result = ""
    for i in range(1, len(sys.argv)):
        arg_i = sys.argv[i]
        result += arg_i.strip()
    replace = Main.decode(result).replace('do local _=', '').replace(';return _;end', '').replace('"', '\\"')
    import subprocess
    cmd = ['xargs', 'lua', 'deserialize_serpent_into_json.lua']
    result = subprocess.run(cmd, stdout=subprocess.PIPE, input=replace.encode('utf-8'))
    lua_output = result.stdout.decode('utf-8').strip()
    lua_output = re.sub(r"^true\s+", r'', lua_output)
    print(lua_output)
    import json
    json_object = json.loads(lua_output)
