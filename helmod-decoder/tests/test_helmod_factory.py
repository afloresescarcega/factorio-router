import pytest

from helmod_factory import HelmodFactory


class TestLuaToPython:
    def test_flat_table_with_mixed_value_types(self):
        lua = '{a=1,b="hello",c=true,d=false,e=nil,f=-2.5,["g h"]=3}'
        result = HelmodFactory.lua_to_python(lua)
        assert result == {
            "a": 1,
            "b": "hello",
            "c": True,
            "d": False,
            "e": None,
            "f": -2.5,
            "g h": 3,
        }
        # ints stay ints, floats stay floats
        assert isinstance(result["a"], int)
        assert isinstance(result["f"], float)

    def test_single_quoted_string_value(self):
        assert HelmodFactory.lua_to_python("{a='x'}") == {"a": "x"}

    def test_double_quoted_string_value(self):
        assert HelmodFactory.lua_to_python('{a="x"}') == {"a": "x"}

    def test_bracket_quoted_key(self):
        assert HelmodFactory.lua_to_python('{["my key"]=1}') == {"my key": 1}

    def test_bracket_quoted_key_single_quotes(self):
        assert HelmodFactory.lua_to_python("{['my key']=1}") == {"my key": 1}

    def test_unquoted_string_key(self):
        assert HelmodFactory.lua_to_python("{name=1}") == {"name": 1}

    def test_negative_integer(self):
        assert HelmodFactory.lua_to_python("{a=-5}") == {"a": -5}

    def test_positive_float(self):
        assert HelmodFactory.lua_to_python("{a=3.14}") == {"a": 3.14}

    def test_empty_table(self):
        assert HelmodFactory.lua_to_python("{}") == {}

    def test_multiple_keys(self):
        result = HelmodFactory.lua_to_python("{a=1,b=2,c=3}")
        assert result == {"a": 1, "b": 2, "c": 3}

    def test_missing_comma_between_pairs_is_tolerated(self):
        # Existing (if odd) behavior: a missing comma does not raise, the
        # parser silently continues on to the next key=value pair.
        assert HelmodFactory.lua_to_python("{a=1 b=2}") == {"a": 1, "b": 2}

    def test_nested_table_value_raises_value_error(self):
        # The hand-rolled parser does not correctly support nested tables
        # as values; this is a known limitation, not something to fix here.
        with pytest.raises(ValueError):
            HelmodFactory.lua_to_python("{a={b=1}}")

    def test_array_style_table_raises_value_error(self):
        # Lua array-style tables (no explicit keys) are not supported.
        with pytest.raises(ValueError):
            HelmodFactory.lua_to_python("{1,2,3}")

    def test_missing_equals_after_key_raises_value_error(self):
        with pytest.raises(ValueError):
            HelmodFactory.lua_to_python("{a 1}")

    def test_unparseable_value_raises_value_error(self):
        with pytest.raises(ValueError):
            HelmodFactory.lua_to_python("{a=$}")


class TestPythonToLua:
    def test_dict_with_simple_identifier_keys(self):
        assert HelmodFactory.python_to_lua({"a": 1, "b": 2}) == "{a=1,b=2}"

    def test_dict_with_key_needing_brackets(self):
        assert HelmodFactory.python_to_lua({"my key": 1}) == '{["my key"]=1}'

    def test_string_value_is_quoted(self):
        assert HelmodFactory.python_to_lua("hi") == '"hi"'

    def test_true_value(self):
        assert HelmodFactory.python_to_lua(True) == "true"

    def test_false_value(self):
        assert HelmodFactory.python_to_lua(False) == "false"

    def test_none_value(self):
        assert HelmodFactory.python_to_lua(None) == "nil"

    def test_int_and_float_values(self):
        assert HelmodFactory.python_to_lua(5) == "5"
        assert HelmodFactory.python_to_lua(-2.5) == "-2.5"

    def test_list_value(self):
        assert HelmodFactory.python_to_lua([1, 2, 3]) == "{1,2,3}"

    def test_nested_dict_serializes_recursively(self):
        # python_to_lua (unlike lua_to_python) does support nesting.
        result = HelmodFactory.python_to_lua({"a": {"b": 1}})
        assert result == "{a={b=1}}"


class TestEncodeDecodeHelmodRoundTrip:
    def test_flat_dict_round_trips(self):
        data = {"a": 1, "b": "hi", "c": True, "d": False, "e": None, "f": -1.5}
        encoded = HelmodFactory.encode_helmod(data)
        assert isinstance(encoded, str)
        decoded = HelmodFactory.decode_helmod(encoded)
        assert decoded == data

    def test_encode_produces_base64_string(self):
        import base64

        encoded = HelmodFactory.encode_helmod({"a": 1})
        # Should decode as valid base64 without raising.
        base64.b64decode(encoded)

    def test_decode_strips_embedded_whitespace(self):
        # Helmod export strings are often copy-pasted with line breaks;
        # decode_helmod strips all whitespace before base64-decoding.
        encoded = HelmodFactory.encode_helmod({"a": 1, "b": "hi"})
        chunk_size = 20
        chunked = "\n".join(
            encoded[i : i + chunk_size] for i in range(0, len(encoded), chunk_size)
        )
        assert chunked != encoded
        assert HelmodFactory.decode_helmod(chunked) == {"a": 1, "b": "hi"}

    def test_decode_helmod_from_real_export_file(self):
        import os

        input_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "input.txt"
        )
        with open(input_path) as f:
            encoded = f.read().strip()
        decoded = HelmodFactory.decode_helmod(encoded)
        assert isinstance(decoded, dict)
        assert decoded.get("owner") == "heliophobicdude"
