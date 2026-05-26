import { describe, expect, it } from 'vitest';
import { calculateDeliveryFee, DELIVERY_BASE_FEE, DELIVERY_MAX_RADIUS_KM } from './delivery';

describe('calculateDeliveryFee', () => {
  it('returns fixed fee for distances within base radius', () => {
    const result = calculateDeliveryFee(2.5);
    expect(result.isInRange).toBe(true);
    expect(result.fee).toBe(DELIVERY_BASE_FEE);
    expect(result.distanceKm).toBe(2.5);
  });

  it('calculates extra fee for distance beyond base radius', () => {
    const result = calculateDeliveryFee(4.3);
    expect(result.isInRange).toBe(true);
    expect(result.fee).toBe(DELIVERY_BASE_FEE + 2 * 1.5);
    expect(result.description).toContain('4.3 km');
  });

  it('returns out-of-range when distance exceeds maximum', () => {
    const result = calculateDeliveryFee(DELIVERY_MAX_RADIUS_KM + 1);
    expect(result.isInRange).toBe(false);
    expect(result.fee).toBe(0);
  });

  it('returns free shipping when hasFreeShipping is true', () => {
    const result = calculateDeliveryFee(10, true);
    expect(result.isInRange).toBe(true);
    expect(result.fee).toBe(0);
    expect(result.description).toContain('Frete grátis');
  });
});
