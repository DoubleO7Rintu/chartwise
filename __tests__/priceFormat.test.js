const test = require('node:test');
const assert = require('node:assert/strict');
require('tsx/cjs');
const { formatCurrency, abbreviateNumber, formatPrice } = require('../src/utils/priceFormat.ts');

test('formatCurrency formats USD by default', () => {
  assert.equal(formatCurrency(1234.5), '$1,234.50');
});

test('formatCurrency supports other currencies and locales', () => {
  assert.equal(formatCurrency(1234.5, { currency: 'EUR', locale: 'de-DE' }), '1.234,50 €');
});

test('abbreviateNumber formats large values with compact suffixes', () => {
  assert.equal(abbreviateNumber(1_200_000), '1.2M');
  assert.equal(abbreviateNumber(3_500_000_000), '3.5B');
  assert.equal(abbreviateNumber(42_000), '42K');
});

test('abbreviateNumber preserves negative values', () => {
  assert.equal(abbreviateNumber(-2_500_000), '-2.5M');
});

test('formatPrice handles decimal precision by magnitude', () => {
  assert.equal(formatPrice(1234.567), '$1,234.57');
  assert.equal(formatPrice(0.123456), '$0.123456');
  assert.equal(formatPrice(0.00001234), '$0.00001234');
});

test('formatPrice handles zero, negative, and invalid values', () => {
  assert.equal(formatPrice(0), '$0.00');
  assert.equal(formatPrice(-12.3), '-$12.30');
  assert.equal(formatPrice(Number.NaN), 'N/A');
});
