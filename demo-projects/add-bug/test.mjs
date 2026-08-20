import assert from "node:assert/strict";
import { add } from "./math.mjs";

assert.equal(add(2, 3), 5, "add(2,3) should be 5");
assert.equal(add(0, 0), 0, "add(0,0) should be 0");
assert.equal(add(-1, 1), 0, "add(-1,1) should be 0");
console.log("All tests passed.");
