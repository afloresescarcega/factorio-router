import { assertEquals, assertThrows } from "https://deno.land/std@0.148.0/testing/asserts.ts";
import DEFAULT_ENTITIES from "https://esm.sh/v87/factorio-blueprint@2.4.0/es2022/factorio-blueprint.js";
import Blueprint from "https://esm.sh/v87/factorio-blueprint@2.4.0/es2022/factorio-blueprint.js";
import {validate_io_orientations, add_inserters, add_single_assembler} from "./main.ts";

Deno.test("validate_io_orientations #1", () => {
    let orientations_ideal = ["i", "i", "i", "i", "i", "i", "i", "i", "i", "i", "i", "i"];
    assertEquals(validate_io_orientations(DEFAULT_ENTITIES.getEntityData().assembling_machine_1, orientations_ideal), true);
});

Deno.test("validate add_inserters middles are inputs else outputs", () => {
    let myBlueprint: InstanceType<typeof Blueprint> = new Blueprint();
    myBlueprint.createEntity("assembling_machine_1", { x: 0, y: 0 }, Blueprint.UP);
    let orientations_ideal = ["o", "i", "o", "o", "i", "o", "o", "i", "o", "o", "i", "o"];
    let pos:InstanceType<typeof Blueprint.position> = {x: 0, y: 0};
    add_inserters(DEFAULT_ENTITIES.getEntityData().assembling_machine_1, myBlueprint, pos, orientations_ideal);
    let ideal_output = "0eJy9lttugzAMht/F1yCR0JWWy71GVVVArdZSSFAI1SrEuy+BburK1hQNcUkw9hcfftxCLhqsNEkDaQtUKFlDumuhppPMhDsz1wohBTJYQgAyK91TVtdY5oLkKSyz4kwSQwZdACSP+AEp6wKvixKP1JQhCiyMpiKslMA7F7zbB4DSkCEckJ6FDqBStTVV0sVzBAFcew44krYR+jfRzeP1IJsyR92bfcHJqjHWj82AHOxt1NZ+L5FO51w12lHsewOjlTjkeM4upLSzctd9dq0RXjjwhQ+AqxEgnwgYz0UYvwgYTwTkfkCSNWpjnY+gohehVrOX9W+m3ys5brW3BZn4i3laL8g0NFT0E2k9QkoWR3rIEh8hbRZH4r4sbRdEGoYu9kpptPjQxb7+ZvPru2/o/HmaKun/Ybr9ZyJfi7OpMj4DFPM1OVtSxm9Q3JupuXTcnvcLUXq3ggVwQV0PkTdslWx5Em8TlrjyiCxHu03B+7d1130CUvtV2Q==";
    assertEquals(myBlueprint.encode(), ideal_output);
});

Deno.test("multiples", () => {
    let myBlueprint: InstanceType<typeof Blueprint> = new Blueprint();

    function create_assembler() {
        for (let i = 1; i <= 3; i++) {
            let position = {x: i * 9 , y: 0};
            let entity = myBlueprint.createEntity("assembling_machine_1", position, Blueprint.UP);
        let orientations_ideal = ["o", "i", "o", "o", "i", "o", "o", "i", "o", "o", "i", "o"];
        add_inserters(DEFAULT_ENTITIES.getEntityData().assembling_machine_1, myBlueprint, position, orientations_ideal);
        }
    }

    create_assembler();
    let ideal_output = "0eJzFmduOmzAQht/F1yDFY4qBy75GtVpBYiWWwCAOq0YR715z0Gob3PWgoOllEsf+cMb/fHIerCgH1bTa9Cx7MH2uTceyXw/W6avJy+m9/t4oljHdq4oFzOTV9CrvOlUVpTbXsMrPN21UyNkYMG0u6jfL+Bh4p6jURQ9VqEp17lt9Dpu6VF+mgPEtYMr0utdqQfpu6YA1dWeH1mZabyI4Bew+g7CLbu0S80endcr7uxmqQrV2QPBJZ5qhtxPZLTDLeLvsw37fKH29FfXQThhv84C+rcv3Qt3yD12306jpeb97rg1fMuOFT3zRhg928omjADkgCcVOQgi49ENq06m2t/NvwFIkV3T4L/tvprXanqG25faDEoojdyqmhFrK6vQ3U7xhkvRMT/sEG6aEngl8+5QSMi0nT3gj9UR/8oSvxvnxQe89ef6d2pvur0AlroO3LXK+N89fZ+K+IueUWZ64Dp5jn46PcqTZpEizOT7WkeYgkX2H7w15EfDkKErAdke+N/btYwl4KT6wcsgp05+7xWtbeECZ/+A2L4dIUzaAtbi8lgOUDWCF8moOUHaAFcrrOUCq8wmufwOpzjv1y1HolDoPTv1y7BSpz0uc6gCp0Euc6wBppkuc7IjjIx0nO+A0xG19if91jzOdNtw1yd6otyEkDrvNEdg2KfaG/2uqA1hXFJT5D24Bc5QdZQMA7M2XoOwAa2V5VUdQdgDhvP115BplB1ihvKojKDvAegC9DTwilXqnfzmueEmdHnn9FZE6fYxTnYjU6WOc6kSkmR7jVCc6KtLt+/MfXtmXv9gC9qHablk54ZFMQYpUcjldupV5oUo7+ufn6HH8A5bgcH8=";
    assertEquals(myBlueprint.encode(), ideal_output);
});

Deno.test("multiple goldens", () => {
    let myBlueprint: InstanceType<typeof Blueprint> = new Blueprint();

    function create_assembler() {
        for (let i = 1; i <= 3; i++) {
            let position = {x: i * 12 , y: 0};
            add_single_assembler(myBlueprint, position, "splitter");
        }
    }

    create_assembler();
    let ideal_output = "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";
    assertEquals(myBlueprint.encode(), ideal_output);
});

Deno.test("validate add_inserters middles are inputs", () => {
    let myBlueprint: InstanceType<typeof Blueprint> = new Blueprint();
    myBlueprint.createEntity("assembling_machine_1", { x: 0, y: 0 }, Blueprint.UP);
    let orientations_ideal = ["", "i", "", "", "i", "", "", "i", "", "", "i", ""];
    add_inserters(DEFAULT_ENTITIES.getEntityData().assembling_machine_1, myBlueprint, {x: 0, y: 0}, orientations_ideal);
    // console.log(myBlueprint.encode());
    let ideal_output = "0eJy9lN2KwyAQhd9lrhU2P9tsc7mvUUpJ0qEd0DGoKVtC3n012V1K058tlF6qxzOfHp0eatVha4k9lD1QY9hBuerB0Y4rFef8sUUogTxqEMCVjqPKOdS1It5JXTV7YpQJDAKIt/gFZTKIuxYat9RpiQobb6mRrVF4YpEOawHInjzhhHSrtIDWuCA1HOtFAgHHkQO2ZEOFceXtx/G44U7XaEfZLxy3nQ8+4QZ40oeqfdjPSLt9bTobKdajwFujNjXuqwMZG1XxuLeONcOTE588A8xngOmDgNmzCLN/AmYPAqb3AYkdWh/Mr6R6DjWPNX96rNeZsksvLZ0hvb8Qabqm7F50ixciyYsfcjFjKp7EFObHdlOeNDgBB7RuyucjyYtlWmTLIimSEKGqagy9Cj7/1MPwDT80vzE=";
    assertEquals(myBlueprint.encode(), ideal_output);
});

Deno.test("validate add_inserters chest top and bottom only inserting", () => {
    let myBlueprint: InstanceType<typeof Blueprint> = new Blueprint();
    myBlueprint.createEntity("wooden_chest", { x: 0, y: 0 }, Blueprint.UP);
    let orientations_ideal = ["i", "", "i", ""];
    add_inserters(DEFAULT_ENTITIES.getEntityData().wooden_chest, myBlueprint, {x: 0, y: 0}, orientations_ideal);
    // console.log(myBlueprint.encode());
    let ideal_output = "0eJytk91ugzAMhd/F10EqlImVy73GVFX8WMVScFASuiHEu8+hU9WNbawSN5ESjs/5jOURSt1jZ4k95CNQZdhB/jqCozMXOrz5oUPIgTy2oICLNtzejKmRo6pB52FSQFzjO+TxpFZLW6ypbyPUWHlLVdQZjXcWyXRUgOzJE15RfopU0BknEsMhR8p2CgY5xacmK87zl92n03Divi3RCqC6QXHXBx/pmK96SRulnpHOTWl6G9KPs8Bbo08lNsWFjA2q0OZf7Szwonjmi+KvgOkCMHkQcL8V4X8B9w8CJuuAxA6tF/NfpvodajnWdPOxrjGt/qenjZDkfd6f/G5TFVzQujk4eY7T7JBk+0MWZ7EMRxclyvLBy009TR8nSlRf";
    assertEquals(myBlueprint.encode(), ideal_output);
});

Deno.test("validate add_inserters no io", () => {
    let myBlueprint: InstanceType<typeof Blueprint> = new Blueprint();
    myBlueprint.createEntity("assembling_machine_1", { x: 0, y: 0 }, Blueprint.UP);
    // let orientations_ideal = ["", "i", "", "", "i", "", "", "i", "", "", "i", ""];
    add_inserters(DEFAULT_ENTITIES.getEntityData().assembling_machine_1, myBlueprint, {x: 0, y: 0});
    // console.log(myBlueprint.encode());
    let ideal_output = "0eJytksFqwzAQRP9lzzLUdsCNj/2NEoJkL/aCtDKSHGqM/72S3JbQ0LSBHrUazbwVs4LSM06OOEC7AnWWPbSvK3gaWOo0C8uE0AIFNCCApUkn6T0apYmHwshuJMaihE0AcY9v0Jab+NXCYE+zKVBjFxx1xWQ1XllU20kAcqBAuCPdixYwWR+lllNeIhCwZA7oycWEfPP04biceTYKXZZ9wvE0h+gTf4B3fUxd43tGGkZlZ5coTlkQnNVnhaO8kHVJlda9t9YNXrHzFd8ADzeA1YOA9X8R1n8ErB8ErH4CjPNckPaqkgIu6HxOrp7LQ3OsmvrYlE0ZU7VUGNsFL1/qbXsHyI70ag==";
    assertEquals(myBlueprint.encode(), ideal_output);
});

Deno.test("validate_io_orientations should throw error when number of orientations doesn't match the entity shape", () => {
    assertThrows(
        () => {
            let orientations_array_too_short = ["i", "i", "i", "i", "i", "i", "i", "i", "i", "i", "i"];
            validate_io_orientations(DEFAULT_ENTITIES.getEntityData().assembling_machine_1, orientations_array_too_short);
        },
        TypeError,
        "Orientations array must have exactly the number of I/O slots as entity being passed in. i.e. 2 * (width+height). Orientations length: 11. Required length 12",
    );
});
