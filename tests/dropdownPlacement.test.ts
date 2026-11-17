import assert from 'node:assert/strict';
import test from 'node:test';
import { dropdownPlacement } from '../src/components/flat-form/dropdownPlacement.ts';

const screen = { left: 0, top: 0, width: 1024, height: 768 };
const field = { left: 100, top: 100, bottom: 138, width: 300 };

test('opens below a field when the full panel fits', () => {
  const position = dropdownPlacement(field, screen, 340);
  assert.equal(position.side, 'below');
  assert.equal(position.top, field.bottom + 4);
  assert.equal(position.width, field.width);
});
test('last Add Stock row opens upward with its entire panel inside the viewport', () => {
  const anchor = { ...field, top: 690, bottom: 728 };
  const position = dropdownPlacement(anchor, screen, 340);
  assert.equal(position.side, 'above');
  assert.ok(position.top >= 8);
  assert.ok(position.top + 340 <= anchor.top - 4);
});
test('long lists are height constrained instead of pushing the footer below the screen', () => {
  const position = dropdownPlacement({ ...field, top: 360, bottom: 398 }, screen, 600);
  assert.ok(position.maxHeight < 600);
  assert.ok(position.top + position.maxHeight <= screen.height - 8);
});
test('right-edge and narrow-screen dropdowns stay horizontally visible', () => {
  for (const width of [180, 320, 1024]) {
    const position = dropdownPlacement({ ...field, left: width - 80 }, { ...screen, width }, 340);
    assert.ok(position.left >= 8);
    assert.ok(position.left + position.width <= width - 8);
  }
});
test('keyboard / zoom offsets use the visual viewport instead of the full window', () => {
  const viewport = { left: 50, top: 80, width: 320, height: 280 };
  const position = dropdownPlacement({ ...field, left: 300, top: 300, bottom: 338 }, viewport, 340);
  assert.ok(position.left >= 58);
  assert.ok(position.left + position.width <= 362);
  assert.ok(position.top >= 88);
  assert.ok(position.top + Math.min(340, position.maxHeight) <= 352);
});
test('very short screens allow overlap so the search and Create action remain reachable', () => {
  const position = dropdownPlacement({ ...field, top: 75, bottom: 113 }, { ...screen, height: 190 }, 340);
  assert.equal(position.maxHeight, 174);
  assert.equal(position.top, 8);
});
test('changing result heights remains bounded above and below the trigger', () => {
  for (const top of [10, 150, 350, 700, 900]) {
    for (const height of [70, 150, 340, 600]) {
      const position = dropdownPlacement({ ...field, top, bottom: top + 38 }, screen, height);
      assert.ok(position.top >= 8);
      assert.ok(position.top + Math.min(height, position.maxHeight) <= screen.height - 8);
    }
  }
});
