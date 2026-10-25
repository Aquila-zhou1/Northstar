import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMotto, readMotto } from '../src/domain/userSettings.js';

test('motto is a single line, supports Unicode, and can be cleared', () => {
  assert.equal(normalizeMotto('  每天\n前进一点  '), '每天 前进一点');
  assert.equal(normalizeMotto('   '), '');
  assert.equal(normalizeMotto('x'.repeat(160)).length, 160);
  assert.throws(() => normalizeMotto('x'.repeat(161)), /160/);
});

test('unexpected user metadata cannot become a visible object or break the header', () => {
  assert.equal(readMotto(null), '');
  assert.equal(readMotto({ user_metadata: { northstar_motto: { text: 'wrong type' } } }), '');
  assert.equal(readMotto({ user_metadata: { northstar_motto: 'x'.repeat(200) } }).length, 160);
  assert.throws(() => normalizeMotto({}), /text/);
});
