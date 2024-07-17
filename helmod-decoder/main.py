import json
import sys
from helmod_factory import HelmodFactory
from blueprint_factory import encode_blueprint


def read_input():
    """Read input from stdin or a file."""
    if not sys.stdin.isatty():
        return sys.stdin.read().strip()
    else:
        with open('input.txt', 'r') as f:
            return f.read().strip()


def create_blueprint_from_helmod(helmod_data):
    # Parse Helmod data
    recipes = parse_helmod_data(helmod_data)

    # Create blueprint structure
    blueprint = {
        "blueprint": {
            "icons": [
                {"signal": {"type": "item", "name": "assembling-machine-1"}, "index": 1}
            ],
            "entities": [],
            "item": "blueprint",
            "version": 281479275151360
        }
    }

    # Place assemblers and inserters
    entity_number = 1
    for i, (recipe, count) in enumerate(recipes.items()):
        x, y = i * 4, 0  # Simple grid layout
        for _ in range(int(count)):
            # Add assembler
            blueprint["blueprint"]["entities"].append({
                "entity_number": entity_number,
                "name": "assembling-machine-1",
                "position": {"x": x, "y": y},
                "recipe": recipe
            })
            entity_number += 1

            # Add inserters (simplified, just adding 4 around each assembler)
            for dx, dy in [(0, -1), (1, 0), (0, 1), (-1, 0)]:
                blueprint["blueprint"]["entities"].append({
                    "entity_number": entity_number,
                    "name": "inserter",
                    "position": {"x": x + dx, "y": y + dy}
                })
                entity_number += 1

            y += 4  # Move to next row

    return blueprint


def parse_helmod_data(helmod_data):
    # This is a simplified parser. You'll need to adapt it based on your actual Helmod JSON structure
    recipes = {}
    for block in helmod_data.get('blocks', {}).values():
        if 'recipes' in block:
            for recipe in block['recipes'].values():
                recipes[recipe['name']] = recipe['factory']['count']
    return recipes


helmod_json = '''
{
  "id": "block_1",
  "owner": "heliophobicdude",
  "blocks": {
    "block_1": {
      "id": "block_1",
      "name": "copper-plate",
      "owner": "heliophobicdude",
      "count": 0,
      "power": 0,
      "ingredients": {
        "copper-plate": {
          "name": "copper-plate",
          "type": "item",
          "count": 0,
          "state": 2
        },
        "name": "copper-plate",
        "type": "item",
        "count": 0,
        "state": 2
      },
      "copper-plate": {
        "name": "copper-plate",
        "type": "item",
        "count": 0,
        "state": 2
      },
      "type": "item",
      "state": 2
    },
    "id": "block_1",
    "name": "copper-plate",
    "owner": "heliophobicdude",
    "count": 0,
    "power": 0,
    "ingredients": {
      "copper-plate": {
        "name": "copper-plate",
        "type": "item",
        "count": 0,
        "state": 2
      },
      "name": "copper-plate",
      "type": "item",
      "count": 0,
      "state": 2
    },
    "copper-plate": {
      "name": "copper-plate",
      "type": "item",
      "count": 0,
      "state": 2
    },
    "type": "item",
    "state": 2
  },
  "block_1": {
    "id": "block_1",
    "name": "copper-plate",
    "owner": "heliophobicdude",
    "count": 0,
    "power": 0,
    "ingredients": {
      "copper-plate": {
        "name": "copper-plate",
        "type": "item",
        "count": 0,
        "state": 2
      },
      "name": "copper-plate",
      "type": "item",
      "count": 0,
      "state": 2
    },
    "copper-plate": {
      "name": "copper-plate",
      "type": "item",
      "count": 0,
      "state": 2
    },
    "type": "item",
    "state": 2
  },
  "name": "copper-plate",
  "count": 0,
  "power": 0,
  "ingredients": {
    "copper-plate": {
      "name": "copper-plate",
      "type": "item",
      "count": 0,
      "state": 2
    },
    "name": "copper-plate",
    "type": "item",
    "count": 0,
    "state": 2
  },
  "copper-plate": {
    "name": "copper-plate",
    "type": "item",
    "count": 0,
    "state": 2
  },
  "type": "item",
  "state": 2
}
'''


def main():
    helmod_data = json.loads(helmod_json)
    blueprint = create_blueprint_from_helmod(helmod_data)
    encoded_blueprint = encode_blueprint(blueprint)
    print("here's the new blueprint:")
    print(encoded_blueprint)


if __name__ == "__main__":
    main()
