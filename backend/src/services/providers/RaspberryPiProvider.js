class RaspberryPiProvider {
  constructor() {
    this.name = 'RaspberryPiProvider';
    // Future: Initialize SerialPort, MQTT, or GPIO bindings here
  }

  async getTelemetry(nodeId, sensorType) {
    // Future: Read real hardware sensor values
    throw new Error('RaspberryPiProvider not implemented yet');
  }

  async getDigitalTwinState() {
    // Future: Compose Digital Twin state from real hardware sensors
    throw new Error('RaspberryPiProvider not implemented yet');
  }
}

export default RaspberryPiProvider;
