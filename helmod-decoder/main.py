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


def parse_helmod_data(helmod_data):
    recipes = {}
    print("Parsing Helmod data:")
    print(json.dumps(helmod_data, indent=2))

    def process_block(block):
        if isinstance(block, dict):
            if 'name' in block and 'type' in block and block['type'] == 'item':
                recipes[block['name']] = max(block.get('count', 1), 1)  # Ensure at least 1
            for key, value in block.items():
                process_block(value)

    process_block(helmod_data)

    if not recipes:
        # If no recipes were found, add a default recipe
        recipes['iron-plate'] = 1

    print("Extracted recipes:")
    print(json.dumps(recipes, indent=2))
    return recipes

def create_blueprint_from_helmod(helmod_data):
    recipes = parse_helmod_data(helmod_data)

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

    print("Creating blueprint:")
    entity_number = 1
    x, y = 0, 0
    for recipe, count in recipes.items():
        print(f"Adding recipe: {recipe} (count: {count})")
        for _ in range(max(int(count), 1)):  # Ensure at least one entity is created
            # Add assembling machine
            blueprint["blueprint"]["entities"].append({
                "entity_number": entity_number,
                "name": "assembling-machine-1",
                "position": {"x": x, "y": y},
                "recipe": recipe
            })
            entity_number += 1

            # Add inserters
            inserter_positions = [
                (x - 1, y, 2),
                (x + 1, y, 6),
                (x, y - 1, 0),
                (x, y + 1, 4),
            ]

            for ix, iy, direction in inserter_positions:
                blueprint["blueprint"]["entities"].append({
                    "entity_number": entity_number,
                    "name": "inserter",
                    "position": {"x": ix, "y": iy},
                    "direction": direction
                })
                entity_number += 1

            # Add transport belts
            belt_positions = [
                (x - 2, y, 2),
                (x + 2, y, 6),
                (x, y - 2, 0),
                (x, y + 2, 4),
            ]

            for bx, by, direction in belt_positions:
                blueprint["blueprint"]["entities"].append({
                    "entity_number": entity_number,
                    "name": "transport-belt",
                    "position": {"x": bx, "y": by},
                    "direction": direction
                })
                entity_number += 1

            y += 6
        x += 6
        y = 0

    print(f"Total entities added: {len(blueprint['blueprint']['entities'])}")
    return blueprint

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
    helmod_string = read_input()
    helmod_data = HelmodFactory.decode_helmod(helmod_string)
    blueprint = create_blueprint_from_helmod(helmod_data)

    print("Final blueprint structure:")
    print(json.dumps(blueprint, indent=2))

    encoded_blueprint = encode_blueprint(blueprint)
    print("Encoded blueprint:")
    print(encoded_blueprint)



if __name__ == "__main__":
    main()
