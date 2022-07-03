# pylint: disable=missing-module-docstring
# pylint: disable=missing-class-docstring
# pylint: disable=missing-function-docstring

import json
import re
import subprocess
from base64 import b64decode
from gzip import decompress


class HelmodExportDeserializer:
    @classmethod
    def decode_base64_and_gunzip(cls, base64_gzip_input) -> str:
        base64_decoded = b64decode(base64_gzip_input)
        gzip_decompressed = decompress(base64_decoded).decode('utf-8')
        return gzip_decompressed


def get_deserialized_helmod_export_string_as_json(helmod_export_string_in_serpent) -> str:
    lua_serpent_serialized_table: str = HelmodExportDeserializer.decode_base64_and_gunzip(
        helmod_export_string_in_serpent)
    cleaned_lua_serpent_serialized_table: str = escape_double_quotes(lua_serpent_serialized_table)
    lua_json_output: str = \
        convert_serpent_serialization_into_json_in_lua(cleaned_lua_serpent_serialized_table)
    return lua_json_output


def jsonify_json_string(json_as_str: str) -> dict:
    return json.loads(json_as_str)


def convert_serpent_serialization_into_json_in_lua(replace: str) -> str:
    cmd = ['xargs', 'lua', 'deserialize_serpent_into_json.lua']
    result = subprocess.run(cmd, stdout=subprocess.PIPE, input=replace.encode('utf-8'), check=True)
    lua_output = result.stdout.decode('utf-8').strip()
    lua_output = remove_boolean_result_from_lua_output_and_white_space(lua_output)
    return lua_output


def remove_boolean_result_from_lua_output_and_white_space(lua_output: str) -> str:
    return re.sub(r"^true\s+", r'', lua_output)


def escape_double_quotes(lua_serpent_serialized_table: str) -> str:
    return remove_extraneous_lua_code_pre_and_post_fix(lua_serpent_serialized_table)\
        .replace('"', '\\"')


def remove_extraneous_lua_code_pre_and_post_fix(lua_serpent_serialized_table: str) -> str:
    return lua_serpent_serialized_table.replace('do local _=', '').replace(';return _;end', '')
