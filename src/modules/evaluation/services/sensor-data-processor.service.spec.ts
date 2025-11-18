import { Test, TestingModule } from '@nestjs/testing';
import { SensorDataProcessorService } from './sensor-data-processor.service';
import { SensorData } from '@prisma/client';

describe('SensorDataProcessorService', () => {
  let service: SensorDataProcessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SensorDataProcessorService],
    }).compile();

    service = module.get<SensorDataProcessorService>(
      SensorDataProcessorService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('detectCycles', () => {
    it('deve detectar 5 ciclos completos corretamente (Happy Path)', () => {
      // 1. Gerar dados simulados de 5 ciclos perfeitos
      const mockData = generateMockSensorData(5);

      // 2. Executar a função
      const result = service.detectCycles(mockData);

      console.log('Resultado da Detecção:', JSON.stringify(result, null, 2));

      // 3. Asserções (O que esperamos que aconteça)
      expect(result.C1.TOT).toBeGreaterThan(0); // Ciclo 1 deve ter tempo
      expect(result.C5.TOT).toBeGreaterThan(0); // Ciclo 5 deve ter tempo

      // O tempo total deve ser a soma das partes
      expect(result.C1.TOT).toBeCloseTo(result.C1.SUBIR + result.C1.DESCER, 1);
    });

    it('deve retornar zeros se não houver movimento suficiente', () => {
      // Gerar dados onde a pessoa fica parada (accel_y = 0)
      const mockData = generateStationaryData(100);

      const result = service.detectCycles(mockData);

      expect(result.C1.TOT).toBe(0);
      expect(result.MAX.TOT).toBe(0);
    });
  });
});

// --- FUNÇÕES AUXILIARES PARA GERAR DADOS FALSOS ---

/**
 * Gera dados simulando ciclos de levantar e sentar
 * Baseado nos thresholds: UP > 0.5, DOWN < -0.3
 */
function generateMockSensorData(numberOfCycles: number): SensorData[] {
  const data: SensorData[] = [];
  let currentTime = new Date().getTime();
  const sampleRate = 100; // 100ms entre cada ponto

  for (let i = 0; i < numberOfCycles; i++) {
    // 1. Estado SITTING (Parado)
    addPoints(data, 5, 0.05, currentTime, sampleRate); // 5 pontos estáveis
    currentTime += 5 * sampleRate;

    // 2. Estado STANDING_UP (Pico para cima > 0.5)
    addPoints(data, 3, 0.8, currentTime, sampleRate); // Subindo!
    currentTime += 3 * sampleRate;

    // 3. Estado STANDING (Estabiliza em pé)
    addPoints(data, 10, 0.05, currentTime, sampleRate); // Em pé
    currentTime += 10 * sampleRate;

    // 4. Estado SITTING_DOWN (Pico para baixo < -0.3)
    addPoints(data, 3, -0.6, currentTime, sampleRate); // Descendo!
    currentTime += 3 * sampleRate;

    // 5. Volta ao SITTING (Estabiliza sentado - fim do ciclo)
    addPoints(data, 5, 0.05, currentTime, sampleRate);
    currentTime += 5 * sampleRate;
  }

  return data;
}

function generateStationaryData(count: number): SensorData[] {
  const data: SensorData[] = [];
  const currentTime = new Date().getTime();
  addPoints(data, count, 0.01, currentTime, 100);
  return data;
}

function addPoints(
  array: SensorData[],
  count: number,
  accelY: number,
  startTime: number,
  rate: number,
) {
  for (let i = 0; i < count; i++) {
    array.push({
      id: 'mock-id',
      evaluationId: 'mock-eval',
      timestamp: new Date(startTime + i * rate),
      accel_x: 0,
      accel_y: accelY, // O valor que importa para seu algoritmo
      accel_z: 0,
      gyro_x: 0,
      gyro_y: 0,
      gyro_z: 0,
    });
  }
}
