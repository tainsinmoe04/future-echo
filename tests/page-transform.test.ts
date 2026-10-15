import assert from "node:assert/strict";
import test from "node:test";
import { boundTransform, DEFAULT_TRANSFORM, gestureTransform, normalizeTransform, turn } from "../src/lib/page-transform";

test("one pointer translates relative to page dimensions, preserving grab offset", () => {
  assert.deepEqual(gestureTransform(DEFAULT_TRANSFORM, [{ x: 30, y: 50 }], [{ x: 60, y: 100 }], 300, 500), { x: 10, y: 10, scale: 1, rotation: 0 });
});
test("two fingers resize and rotate from the gesture baseline", () => {
  const next = gestureTransform(DEFAULT_TRANSFORM, [{ x: 0, y: 0 }, { x: 100, y: 0 }], [{ x: 50, y: -100 }, { x: 50, y: 100 }], 300, 500);
  assert.deepEqual(next, { x: 0, y: 0, scale: 2, rotation: 90 });
});
test("angle wrap, invalid values and coincident fingers remain stable", () => {
  assert.equal(turn(358), -2);
  assert.deepEqual(normalizeTransform({ x: NaN, y: Infinity, scale: NaN, rotation: Infinity }), DEFAULT_TRANSFORM);
  assert.equal(gestureTransform(DEFAULT_TRANSFORM, [{ x: 0, y: 0 }, { x: 0, y: 0 }], [{ x: 0, y: 0 }, { x: 50, y: 0 }], 300, 500).scale, 1);
});
test("rotated objects stay within the page when resized or moved to an edge", () => {
  const value = boundTransform({ x: -100, y: 100, scale: 2, rotation: 45 }, { x: 100, y: 200 }, 150, 180, 320, 700);
  const half = (150 + 180) * Math.SQRT1_2 * value.scale / 2;
  assert.ok(100 + value.x * 3.2 - half >= 11.99);
  assert.ok(200 + value.y * 7 + half <= 688.01);
});
