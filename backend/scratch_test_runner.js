import { runMultiAgentPipeline } from './src/utils/pythonRunner.js';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
  const query = "Assess health and safety anomalies at Bhusawal Power Hub (S-011) under current telemetry conditions: Temperature 95°C, Track Vibration 12 mm/s, Hazardous Gas 14 ppm, Power Grid Voltage 24 kV, Risk Score 87/100.";
  const telemetry = {
    temperature: 95,
    vibration: 12,
    gas: 14,
    power: 24,
    riskScore: 87
  };

  console.log("Running pipeline...");
  try {
    const result = await runMultiAgentPipeline(query, telemetry);
    console.log("=== PIPELINE RESULT ===");
    console.log(result);
  } catch (e) {
    console.error("Pipeline threw error:", e);
  }
}

test().catch(console.error);
