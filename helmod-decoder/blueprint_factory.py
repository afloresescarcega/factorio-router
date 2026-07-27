import zlib
import base64
import json

VERSION_BYTE = b'\x00'


def decode_blueprint(encoded_blueprint):
    encoded_blueprint = encoded_blueprint[1:]
    compressed_data = base64.b64decode(encoded_blueprint)
    json_data = zlib.decompress(compressed_data)
    json_str = json_data.decode('utf-8')
    blueprint = json.loads(json_str)

    return blueprint


def encode_blueprint(blueprint):
    json_str = json.dumps(blueprint)
    json_data = json_str.encode('utf-8')
    compressed_data = zlib.compress(json_data, level=9)
    encoded_blueprint = base64.b64encode(compressed_data)
    encoded_blueprint = VERSION_BYTE + encoded_blueprint
    encoded_blueprint_str = encoded_blueprint.decode('utf-8')

    return '0' + encoded_blueprint_str


def main():
    # Example usage
    pass

if __name__ == "__main__":
    main()
