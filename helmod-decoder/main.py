# pylint: disable=missing-module-docstring
# pylint: disable=missing-function-docstring
import sys

from helmodexportdeserializer import get_deserialized_helmod_export_string_as_json, \
    jsonify_json_string


def aggregate_helmod_string_output_into_single_line() -> str:
    result = ""
    for i in range(1, len(sys.argv)):
        arg_i = sys.argv[i]
        result += arg_i.strip()
    return result


if __name__ == '__main__':
    deserialized_helmod_export_string_as_json: str = get_deserialized_helmod_export_string_as_json(
        aggregate_helmod_string_output_into_single_line())
    print(deserialized_helmod_export_string_as_json)
    jsonify_json_string(deserialized_helmod_export_string_as_json)
