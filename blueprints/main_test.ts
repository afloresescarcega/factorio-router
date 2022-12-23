import { assertEquals, assertThrows } from "https://deno.land/std@0.148.0/testing/asserts.ts";
import DEFAULT_ENTITIES from "https://esm.sh/v87/factorio-blueprint@2.4.0/es2022/factorio-blueprint.js";
import Blueprint from "https://esm.sh/v87/factorio-blueprint@2.4.0/es2022/factorio-blueprint.js";
import {validate_io_orientations, add_inserters} from "./main.ts";

Deno.test("validate_io_orientations #1", () => {
    let orientations_ideal = ["i", "i", "i", "i", "i", "i", "i", "i", "i", "i", "i", "i"];
    assertEquals(validate_io_orientations(DEFAULT_ENTITIES.getEntityData().assembling_machine_1, orientations_ideal), true);
});

Deno.test("validate add_inserters middles are inputs else outputs", () => {
    let myBlueprint: InstanceType<typeof Blueprint> = new Blueprint();
    myBlueprint.createEntity("assembling_machine_1", { x: 0, y: 0 }, Blueprint.UP);
    let orientations_ideal = ["o", "i", "o", "o", "i", "o", "o", "i", "o", "o", "i", "o"];
    add_inserters(DEFAULT_ENTITIES.getEntityData().assembling_machine_1, myBlueprint, orientations_ideal);
    let ideal_output = "0eJy9lttugzAMht/F1yCR0JWWy71GVVVArdZSSFAI1SrEuy+BburK1hQNcUkw9hcfftxCLhqsNEkDaQtUKFlDumuhppPMhDsz1wohBTJYQgAyK91TVtdY5oLkKSyz4kwSQwZdACSP+AEp6wKvixKP1JQhCiyMpiKslMA7F7zbB4DSkCEckJ6FDqBStTVV0sVzBAFcew44krYR+jfRzeP1IJsyR92bfcHJqjHWj82AHOxt1NZ+L5FO51w12lHsewOjlTjkeM4upLSzctd9dq0RXjjwhQ+AqxEgnwgYz0UYvwgYTwTkfkCSNWpjnY+gohehVrOX9W+m3ys5brW3BZn4i3laL8g0NFT0E2k9QkoWR3rIEh8hbRZH4r4sbRdEGoYu9kpptPjQxb7+ZvPru2/o/HmaKun/Ybr9ZyJfi7OpMj4DFPM1OVtSxm9Q3JupuXTcnvcLUXq3ggVwQV0PkTdslWx5Em8TlrjyiCxHu03B+7d1130CUvtV2Q==";
    assertEquals(myBlueprint.encode(), ideal_output);
});

Deno.test("validate add_inserters middles are inputs", () => {
    let myBlueprint: InstanceType<typeof Blueprint> = new Blueprint();
    myBlueprint.createEntity("assembling_machine_1", { x: 0, y: 0 }, Blueprint.UP);
    let orientations_ideal = ["", "i", "", "", "i", "", "", "i", "", "", "i", ""];
    add_inserters(DEFAULT_ENTITIES.getEntityData().assembling_machine_1, myBlueprint, orientations_ideal);
    // console.log(myBlueprint.encode());
    let ideal_output = "0eJy9lN2KwyAQhd9lrhU2P9tsc7mvUUpJ0qEd0DGoKVtC3n012V1K058tlF6qxzOfHp0eatVha4k9lD1QY9hBuerB0Y4rFef8sUUogTxqEMCVjqPKOdS1It5JXTV7YpQJDAKIt/gFZTKIuxYat9RpiQobb6mRrVF4YpEOawHInjzhhHSrtIDWuCA1HOtFAgHHkQO2ZEOFceXtx/G44U7XaEfZLxy3nQ8+4QZ40oeqfdjPSLt9bTobKdajwFujNjXuqwMZG1XxuLeONcOTE588A8xngOmDgNmzCLN/AmYPAqb3AYkdWh/Mr6R6DjWPNX96rNeZsksvLZ0hvb8Qabqm7F50ixciyYsfcjFjKp7EFObHdlOeNDgBB7RuyucjyYtlWmTLIimSEKGqagy9Cj7/1MPwDT80vzE=";
    assertEquals(myBlueprint.encode(), ideal_output);
});

Deno.test("validate add_inserters chest top and bottom only inserting", () => {
    let myBlueprint: InstanceType<typeof Blueprint> = new Blueprint();
    myBlueprint.createEntity("wooden_chest", { x: 0, y: 0 }, Blueprint.UP);
    let orientations_ideal = ["i", "", "i", ""];
    add_inserters(DEFAULT_ENTITIES.getEntityData().wooden_chest, myBlueprint, orientations_ideal);
    // console.log(myBlueprint.encode());
    let ideal_output = "0eJytk91ugzAMhd/F10EqlImVy73GVFX8WMVScFASuiHEu8+hU9WNbawSN5ESjs/5jOURSt1jZ4k95CNQZdhB/jqCozMXOrz5oUPIgTy2oICLNtzejKmRo6pB52FSQFzjO+TxpFZLW6ypbyPUWHlLVdQZjXcWyXRUgOzJE15RfopU0BknEsMhR8p2CgY5xacmK87zl92n03Divi3RCqC6QXHXBx/pmK96SRulnpHOTWl6G9KPs8Bbo08lNsWFjA2q0OZf7Szwonjmi+KvgOkCMHkQcL8V4X8B9w8CJuuAxA6tF/NfpvodajnWdPOxrjGt/qenjZDkfd6f/G5TFVzQujk4eY7T7JBk+0MWZ7EMRxclyvLBy009TR8nSlRf";
    assertEquals(myBlueprint.encode(), ideal_output);
});

Deno.test("validate add_inserters no io", () => {
    let myBlueprint: InstanceType<typeof Blueprint> = new Blueprint();
    myBlueprint.createEntity("assembling_machine_1", { x: 0, y: 0 }, Blueprint.UP);
    // let orientations_ideal = ["", "i", "", "", "i", "", "", "i", "", "", "i", ""];
    add_inserters(DEFAULT_ENTITIES.getEntityData().assembling_machine_1, myBlueprint);
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
