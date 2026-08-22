class MockSensorProvider {
  constructor() {
    this.name = 'MockSensorProvider';
    // Base simulation values
    this.simulatedValues = {
      'Temperature': 35.5,
      'Vibration': 0.8,
      'Voltage': 25000,
      'Pressure': 1.2
    };
  }

  async getTelemetry(nodeId, sensorType) {
    // Generate realistic fluctuating data based on base values
    const baseVal = this.simulatedValues[sensorType] || 50;
    const fluctuation = (Math.random() - 0.5) * (baseVal * 0.1); // +/- 5%
    return Number((baseVal + fluctuation).toFixed(2));
  }

  async getDigitalTwinState() {
    // Mock the state of different layers for the Digital Twin
    return {
      track: { vibrationLevel: 'Normal', wearIndex: 0.12 },
      train: { speed: 85, active: true },
      engine: { temperature: 85.5, status: 'Optimal' },
      coaches: [
        { id: 'C1', occupancy: 85, acStatus: 'ON' },
        { id: 'C2', occupancy: 92, acStatus: 'ON' }
      ],
      tunnel: { structuralIntegrity: 98, humidity: 45 },
      bridge: { stressLoad: 'Low', windSpeed: 12 },
      signals: { state: 'Green', lastUpdated: new Date().toISOString() }
    };
  }
}

export default MockSensorProvider;
