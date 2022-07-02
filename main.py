
class Main:
    @classmethod
    def decode(self, input):
        import base64
        import gzip
        base64_decoded = base64.b64decode(input)
        gzip_decompress = gzip.decompress(base64_decoded).decode('utf-8')
        return gzip_decompress

