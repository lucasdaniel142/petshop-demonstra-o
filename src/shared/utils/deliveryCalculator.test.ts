// =============================================================================
// deliveryCalculator.test.ts — Testes unitários para cálculo de frete
// =============================================================================
// [BP-06 FIX] Testes abrangentes para garantir que a lógica de frete
// funciona corretamente em todos os cenários

import { describe, it, expect } from 'vitest';
import { calculateDeliveryFee, type DeliveryConfig } from './deliveryCalculator';

describe('calculateDeliveryFee', () => {
  const defaultConfig: DeliveryConfig = {
    baseFee: 5.0,
    baseRadiusKm: 3,
    perKmFee: 1.5,
    maxRadiusKm: 15,
    freeShippingMinValue: 100,
    freeShippingByValueEnabled: true,
  };

  describe('Frete grátis por item', () => {
    it('deve retornar frete grátis quando hasFreeShippingByItem é true', () => {
      const result = calculateDeliveryFee(5, true, 50, defaultConfig);
      
      expect(result.fee).toBe(0);
      expect(result.isInRange).toBe(true);
      expect(result.description).toContain('Frete grátis');
    });

    it('deve retornar frete grátis mesmo com distância alta', () => {
      const result = calculateDeliveryFee(10, true, 50, defaultConfig);
      
      expect(result.fee).toBe(0);
      expect(result.isInRange).toBe(true);
    });
  });

  describe('Frete grátis por valor mínimo', () => {
    it('deve retornar frete grátis quando cartTotal >= freeShippingMinValue', () => {
      const result = calculateDeliveryFee(5, false, 100, defaultConfig);
      
      expect(result.fee).toBe(0);
      expect(result.isInRange).toBe(true);
      expect(result.description).toContain('R$ 100,00');
    });

    it('deve retornar frete grátis quando cartTotal > freeShippingMinValue', () => {
      const result = calculateDeliveryFee(5, false, 150, defaultConfig);
      
      expect(result.fee).toBe(0);
      expect(result.isInRange).toBe(true);
    });

    it('NÃO deve retornar frete grátis quando cartTotal < freeShippingMinValue', () => {
      const result = calculateDeliveryFee(5, false, 99.99, defaultConfig);
      
      expect(result.fee).toBeGreaterThan(0);
    });

    it('deve lidar com imprecisão de ponto flutuante (33.33 + 66.67 = 100)', () => {
      const result = calculateDeliveryFee(5, false, 33.33 + 66.67, defaultConfig);
      
      expect(result.fee).toBe(0);
      expect(result.description).toContain('Frete grátis');
    });

    it('NÃO deve aplicar frete grátis quando freeShippingByValueEnabled é false', () => {
      const config = { ...defaultConfig, freeShippingByValueEnabled: false };
      const result = calculateDeliveryFee(5, false, 150, config);
      
      expect(result.fee).toBeGreaterThan(0);
    });
  });

  describe('Cálculo de taxa de entrega', () => {
    it('deve retornar taxa base para distância dentro do raio base', () => {
      const result = calculateDeliveryFee(2, false, 50, defaultConfig);
      
      expect(result.fee).toBe(5.0);
      expect(result.isInRange).toBe(true);
    });

    it('deve retornar taxa base para distância exatamente no raio base', () => {
      const result = calculateDeliveryFee(3, false, 50, defaultConfig);
      
      expect(result.fee).toBe(5.0);
    });

    it('deve calcular taxa adicional por km extra', () => {
      // 5 km = 3 km base + 2 km extra
      // Taxa = 5.00 + (2 * 1.50) = 8.00
      const result = calculateDeliveryFee(5, false, 50, defaultConfig);
      
      expect(result.fee).toBe(8.0);
    });

    it('deve arredondar km extras para cima (Math.ceil)', () => {
      // 4.5 km = 3 km base + 1.5 km extra → arredonda para 2 km
      // Taxa = 5.00 + (2 * 1.50) = 8.00
      const result = calculateDeliveryFee(4.5, false, 50, defaultConfig);
      
      expect(result.fee).toBe(8.0);
    });

    it('deve calcular corretamente para distância máxima', () => {
      // 15 km = 3 km base + 12 km extra
      // Taxa = 5.00 + (12 * 1.50) = 23.00
      const result = calculateDeliveryFee(15, false, 50, defaultConfig);
      
      expect(result.fee).toBe(23.0);
      expect(result.isInRange).toBe(true);
    });
  });

  describe('Área de cobertura', () => {
    it('deve retornar isInRange false quando distância > maxRadiusKm', () => {
      const result = calculateDeliveryFee(20, false, 50, defaultConfig);
      
      expect(result.isInRange).toBe(false);
      expect(result.fee).toBe(0);
      expect(result.description).toContain('Fora da área');
    });

    it('deve retornar isInRange true quando distância = maxRadiusKm', () => {
      const result = calculateDeliveryFee(15, false, 50, defaultConfig);
      
      expect(result.isInRange).toBe(true);
    });
  });

  describe('Formatação de valores', () => {
    it('deve arredondar distância para 1 casa decimal', () => {
      const result = calculateDeliveryFee(5.678, false, 50, defaultConfig);
      
      expect(result.distanceKm).toBe(5.7);
    });

    it('deve arredondar taxa para 2 casas decimais', () => {
      const result = calculateDeliveryFee(5.5, false, 50, defaultConfig);
      
      // 5.5 km = 3 km base + 2.5 km extra → arredonda para 3 km
      // Taxa = 5.00 + (3 * 1.50) = 9.50
      expect(result.fee).toBe(9.5);
    });
  });

  describe('Casos extremos', () => {
    it('deve lidar com distância zero', () => {
      const result = calculateDeliveryFee(0, false, 50, defaultConfig);
      
      expect(result.fee).toBe(5.0);
      expect(result.isInRange).toBe(true);
    });

    it('deve lidar com cartTotal zero', () => {
      const result = calculateDeliveryFee(5, false, 0, defaultConfig);
      
      expect(result.fee).toBeGreaterThan(0);
    });

    it('deve lidar com valores negativos de distância (tratando como zero)', () => {
      const result = calculateDeliveryFee(-5, false, 50, defaultConfig);
      
      expect(result.isInRange).toBe(true);
    });
  });
});
