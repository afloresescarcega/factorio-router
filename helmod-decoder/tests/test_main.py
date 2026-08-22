import io
import json

import pytest

import main as main_module
from helmod_factory import HelmodFactory


class TestReadInput:
    def test_reads_from_stdin_when_not_a_tty(self, monkeypatch):
        monkeypatch.setattr(
            main_module.sys, "stdin", io.StringIO("  hello from stdin  \n")
        )
        assert main_module.read_input() == "hello from stdin"

    def test_reads_from_input_file_when_stdin_is_a_tty(self, monkeypatch, tmp_path):
        class TTYStdin:
            def isatty(self):
                return True

        monkeypatch.setattr(main_module.sys, "stdin", TTYStdin())
        monkeypatch.chdir(tmp_path)
        (tmp_path / "input.txt").write_text("  content from file  \n")

        assert main_module.read_input() == "content from file"


class TestParseHelmodData:
    def test_extracts_item_recipes_from_nested_blocks(self, capsys):
        helmod_data = {
            "id": "block_1",
            "blocks": {
                "block_1": {
                    "name": "iron-plate",
                    "type": "item",
                    "count": 5,
                },
                "block_2": {
                    "name": "copper-plate",
                    "type": "item",
                    "count": 0,
                },
            },
        }
        recipes = main_module.parse_helmod_data(helmod_data)
        # "count": 0 is clamped up to a minimum of 1
        assert recipes == {"iron-plate": 5, "copper-plate": 1}

    def test_defaults_to_iron_plate_when_no_recipes_found(self):
        recipes = main_module.parse_helmod_data({"foo": "bar"})
        assert recipes == {"iron-plate": 1}

    def test_ignores_non_item_type_blocks(self):
        helmod_data = {
            "name": "some-fluid",
            "type": "fluid",
            "count": 3,
        }
        recipes = main_module.parse_helmod_data(helmod_data)
        assert recipes == {"iron-plate": 1}

    def test_uses_default_count_of_one_when_missing(self):
        helmod_data = {"name": "steel-plate", "type": "item"}
        recipes = main_module.parse_helmod_data(helmod_data)
        assert recipes == {"steel-plate": 1}


class TestCreateBlueprintFromHelmod:
    def test_creates_entities_for_each_recipe(self):
        helmod_data = {"name": "iron-plate", "type": "item", "count": 2}
        blueprint = main_module.create_blueprint_from_helmod(helmod_data)

        entities = blueprint["blueprint"]["entities"]
        assert blueprint["blueprint"]["item"] == "blueprint"
        assemblers = [e for e in entities if e["name"] == "assembling-machine-1"]
        inserters = [e for e in entities if e["name"] == "inserter"]
        belts = [e for e in entities if e["name"] == "transport-belt"]

        # count=2 -> two assembling machines, each with 4 inserters + 4 belts
        assert len(assemblers) == 2
        assert len(inserters) == 8
        assert len(belts) == 8
        assert all(a["recipe"] == "iron-plate" for a in assemblers)

        # entity numbers are unique and sequential
        numbers = [e["entity_number"] for e in entities]
        assert numbers == list(range(1, len(entities) + 1))

    def test_creates_blueprint_for_multiple_recipes(self):
        helmod_data = {
            "blocks": {
                "b1": {"name": "iron-plate", "type": "item", "count": 1},
                "b2": {"name": "copper-plate", "type": "item", "count": 1},
            }
        }
        blueprint = main_module.create_blueprint_from_helmod(helmod_data)
        recipes_used = {
            e["recipe"]
            for e in blueprint["blueprint"]["entities"]
            if e["name"] == "assembling-machine-1"
        }
        assert recipes_used == {"iron-plate", "copper-plate"}

    def test_default_recipe_when_no_data_found(self):
        blueprint = main_module.create_blueprint_from_helmod({})
        assemblers = [
            e
            for e in blueprint["blueprint"]["entities"]
            if e["name"] == "assembling-machine-1"
        ]
        assert len(assemblers) == 1
        assert assemblers[0]["recipe"] == "iron-plate"


class TestMain:
    def test_main_reads_decodes_and_prints_blueprint(self, monkeypatch, capsys):
        helmod_data = {"name": "iron-plate", "type": "item", "count": 1}
        encoded = HelmodFactory.encode_helmod(helmod_data)
        monkeypatch.setattr(main_module.sys, "stdin", io.StringIO(encoded))

        main_module.main()

        captured = capsys.readouterr()
        assert "Encoded blueprint:" in captured.out
        assert "Final blueprint structure:" in captured.out
