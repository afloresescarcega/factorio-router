import pytest

from blueprint_factory import decode_blueprint, encode_blueprint, main


class TestEncodeBlueprint:
    def test_returns_string_starting_with_version_prefix(self):
        blueprint = {"blueprint": {"item": "blueprint", "entities": []}}
        encoded = encode_blueprint(blueprint)
        assert isinstance(encoded, str)
        assert encoded.startswith("0")

    def test_encode_is_deterministic_for_same_input(self):
        blueprint = {"blueprint": {"item": "blueprint", "entities": [{"a": 1}]}}
        first_encoding = encode_blueprint(blueprint)
        second_encoding = encode_blueprint(blueprint)
        assert first_encoding == second_encoding


class TestDecodeBlueprint:
    def test_round_trip_simple_blueprint(self):
        blueprint = {
            "blueprint": {
                "icons": [{"signal": {"type": "item", "name": "iron-plate"}, "index": 1}],
                "entities": [
                    {"entity_number": 1, "name": "assembling-machine-1", "position": {"x": 0, "y": 0}}
                ],
                "item": "blueprint",
                "version": 281479275151360,
            }
        }
        encoded = encode_blueprint(blueprint)
        decoded = decode_blueprint(encoded)
        assert decoded == blueprint

    def test_round_trip_empty_entities(self):
        blueprint = {"blueprint": {"item": "blueprint", "entities": [], "icons": []}}
        decoded = decode_blueprint(encode_blueprint(blueprint))
        assert decoded == blueprint

    def test_round_trip_preserves_nested_and_various_types(self):
        blueprint = {
            "blueprint": {
                "item": "blueprint",
                "entities": [
                    {
                        "entity_number": 1,
                        "name": "inserter",
                        "position": {"x": -1.5, "y": 2},
                        "direction": 4,
                        "flags": None,
                        "active": True,
                    }
                ],
            }
        }
        decoded = decode_blueprint(encode_blueprint(blueprint))
        assert decoded == blueprint


def test_main_does_not_raise():
    # main() is a documented no-op placeholder; just confirm it's callable
    # without side effects (for coverage of the __main__ glue).
    assert main() is None
