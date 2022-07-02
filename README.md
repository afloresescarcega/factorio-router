# factorio-router
A simple program to come up with an inefficient routing plan for all your factory machines and supplies.

Intended to consume a json object containing the output of Helmod Factorio Calculator's export. We export a basic blueprint with an inefficient layout (route) of inputs to machines.

## Usage
Export a "Production Line" in Helmod and copy to clipboard
![buttonToExportProductionLineInHelmod.png](resources/buttonToExportProductionLineInHelmod.png)

![productionLineStringExport.png](resources/productionLineStringExport.png)

## setup
- [ ] `source venv/bin/activate`
- [ ] `pip3 install -r requirements.txt`
- [ ] `python3 main.py`