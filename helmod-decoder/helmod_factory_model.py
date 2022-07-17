class HelmodFactoryModel:
    def __init__(self, _model: dict):
        self.model: dict = _model

    def get_blocks(self):
        try:
            return self.model["blocks"]
        except Exception as e:
            print("Unable to retrieve blocks", e)

    def get_ingredients(self):
        try:
            return self.model["ingredients"]
        except Exception as e:
            print("Unable to retrieve ingredients", e)

    def get_products(self):
        try:
            return self.model["products"]
        except Exception as e:
            print("Unable to retrieve products", e)

