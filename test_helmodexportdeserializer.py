# pylint: disable=missing-module-docstring
# pylint: disable=missing-class-docstring
# pylint: disable=missing-function-docstring
# pylint: disable=no-self-use
from unittest import TestCase


import helmodexportdeserializer


class TestHelmodExportDeserializer(TestCase):

    def test_helmodexportdeserializer_decode_helmod(self):
        helmod_export_string: str = "H4sIAAAAAAAA/81VTW+jMBD9KxVngyA0u11VHPcP9FpVyJhJYtVf8ke7UcV" \
                                    "/3wEDYbNki3paLsE28+bNm+dJq++EZlTc1dUHb6tE6hZE/S0h+l2BrZITCK7" \
                                    "NSTectaGFhDT4+aurPobfuohR4yIhikqoEhq8ltRzrVLHOCgGqaHs9TYo00H" \
                                    "5qiBGv+N5sd/n+BCujhZajPeY7zlh2hiwqRHUQ/JSfcRcf+wSfza4xz3I" \
                                    "C6jzeFTtOvKccIuUjkBt+n4CEBeU64N/AnXEWN0GFmndKnbGvqnG7RwF5" \
                                    "rDAuAFM8TSK/IT6ctXCryr/TOeIHBEW6kbW+DkuDpR5bc8zSedANgIlTy" \
                                    "VlJ64gLSccbAD35wnnngA28Xiuyofv2CfiDEBbFdluTwSX3CM7NFEQPfW" \
                                    "OwOEAg1Dxs3wm8YaQuGRauSDNQAoPtRAhvneEUfOVsMUiy8urZ+Ree+2pm" \
                                    "I02h4z7eVb8FciVCVh8RxqgmH3SLa7WeplPOt0/DEmYlo1G9dCt9SR+nu2" \
                                    "X67ovy1MMLle1XHLHSj1HBsWXS0KPcfczcjxQ4WB2V1BohFfU3dsAV2Yak" \
                                    "26RDDskaW+xJnDRorWw+lgph3h11kz3ssWSS6Hvu6kp/Vja2h0MukiLAOe" \
                                    "5KUPRTos3HEVRl+m616MsGNB9Np2iljuycUrdmE4RpSTbp9QwOZwOlkXTj" \
                                    "P3CYlx/J5I8+5GV+3GO1zhXduOk6d/LrZMt8iq2zaFrfrMv/k8zkIVdxyv" \
                                    "8161avU/k2H9OsSSEoYwFGUS/mmu4bK1Sz3sToPGwv4aq5d/TcnMt8mGI9E" \
                                    "BlCuqI4ixCl7vrgnWPFnyw6q5+BNX+BrftMJESCAAA"

        expected_output: str = 'do local _={id="model_6",owner="heliophobicdude",blocks={block_1' \
                               '={id="block_1",name="automation-science-pack",owner="heliophobic' \
                               'dude",count=1,power=1550000,ingredients={["copper-plate"]={name' \
                               '="copper-plate",type="item",count=1,state=2},["iron-gear-wheel"]' \
                               '={name="iron-gear-wheel",type="item",count=1,state=2}},products' \
                               '={["automation-science-pack"]={name="automation-science-pack",ty' \
                               'pe="item",count=1,state=1}},recipes={R1={id="R1",index=0,name="au' \
                               'tomation-science-pack",type="recipe",count=1,production=1,factory' \
                               '={name="assembling-machine-3",type="entity",count=4,energy=387500' \
                               ',speed=1.25,limit=0,modules={},effects={speed=0,productivity=0,co' \
                               'nsumption=0,pollution=0},cap={speed=0,productivity=0,consumption' \
                               '=0,pollution=0},pollution=0.03333333333333333,energy_total=155000' \
                               '0,pollution_total=0.13333333333333333,input=4},beacon={name="be' \
                               'acon",type="item",count=0,energy=480000,combo=4,per_factory=0.5,' \
                               'per_factory_constant=3,limit=0,modules={},energy_total=0},time=1' \
                               ',energy_total=1550000,pollution_total=0.13333333333333333}},isEne' \
                               'rgy=false,index=0,unlinked=true,type="recipe",time=1,pollution_to' \
                               'tal=0.13333333333333333,summary={building=4,factories={["assembl' \
                               'ing-machine-3"]={name="assembling-machine-3",type="item",count=4}' \
                               '},beacons={beacon={name="beacon",type="item",count=0}},modules={}' \
                               '},by_factory=true,solver=false,products_linked={}}},ingredients={' \
                               '["copper-plate"]={index=2,name="copper-plate",type="item",count' \
                               '=1},["iron-gear-wheel"]={index=3,name="iron-gear-wheel",type="i' \
                               'tem",count=1}},resources={},time=1,version="0.9.35",block_id=2,' \
                               'recipe_id=3,products={["automation-science-pack"]={index=1,name=' \
                               '"automation-science-pack",type="item",count=1}},summary={factorie' \
                               's={["assembling-machine-3"]={name="assembling-machine-3",type="it' \
                               'em",count=4}},beacons={beacon={name="beacon",type="item",count=0' \
                               '}},modules={},building=4,energy=1550000,pollution=0.133333333333' \
                               '33333},generators={accumulator={name="accumulator",type="item",co' \
                               'unt=40},["solar-panel"]={name="solar-panel",type="item",count=48}' \
                               ',["steam-engine"]={name="steam-engine",type="item",count=4}}};re' \
                               'turn _;end'
        assert helmodexportdeserializer.HelmodExportDeserializer\
                   .decode_base64_and_gunzip(helmod_export_string) == expected_output
