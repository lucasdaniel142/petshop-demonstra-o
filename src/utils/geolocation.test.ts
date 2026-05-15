/// <reference types="vitest" />
import { describe, it, expect } from 'vitest';
import { haversineDistance, type Coordinates } from './geolocation';

describe('Geolocalização (Fórmula de Haversine)', () => {
  it('deve calcular a distância correta entre dois pontos próximos', () => {
    // Coordenadas aproximadas em uma cidade
    const pontoA: Coordinates = { lat: -23.5505, lng: -46.6333 }; // São Paulo (Centro)
    const pontoB: Coordinates = { lat: -23.5587, lng: -46.6598 }; // Avenida Paulista
    
    const distancia = haversineDistance(pontoA, pontoB);
    
    // A distância deve ser em torno de 2.8km a 3.0km
    expect(distancia).toBeGreaterThan(2.5);
    expect(distancia).toBeLessThan(3.5);
  });

  it('deve retornar zero para o mesmo ponto', () => {
    const pontoA: Coordinates = { lat: -23.5505, lng: -46.6333 };
    const distancia = haversineDistance(pontoA, pontoA);
    expect(distancia).toBe(0);
  });
});
