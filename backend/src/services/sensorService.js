import MockSensorProvider from './providers/MockSensorProvider.js';
import RaspberryPiProvider from './providers/RaspberryPiProvider.js';

class SensorService {
  constructor() {
    const useHardware = process.env.USE_HARDWARE_SENSORS === 'true';
    
    if (useHardware) {
      this.provider = new RaspberryPiProvider();
      console.log('[SensorService] Initialized with RaspberryPiProvider');
    } else {
      this.provider = new MockSensorProvider();
      console.log('[SensorService] Initialized with MockSensorProvider');
    }
  }

  async getTelemetry(nodeId, sensorType) {
    try {
      return await this.provider.getTelemetry(nodeId, sensorType);
    } catch (error) {
      console.error(`[SensorService] Error getting telemetry for node ${nodeId}, sensor ${sensorType}:`, error);
      throw error;
    }
  }

  async getDigitalTwinState() {
    try {
      return await this.provider.getDigitalTwinState();
    } catch (error) {
      console.error(`[SensorService] Error getting digital twin state:`, error);
      throw error;
    }
  }
}

export default new SensorService();
