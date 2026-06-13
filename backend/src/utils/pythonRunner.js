import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the Python run script
const SCRIPT_PATH = path.resolve(__dirname, '../../../ai/scripts/run_agents.py');

/**
 * Execute the Vanguard 7-agent Python LangGraph pipeline.
 * @param {string} query - The inquiry/context query for retrieval.
 * @param {object} telemetry - Raw telemetry readings.
 * @returns {Promise<object>} The final 7-agent state output.
 */
export const runMultiAgentPipeline = (query, telemetry) => {
  return new Promise((resolve) => {
    const telemetryString = JSON.stringify(telemetry || {});
    console.log(`[PYTHON-RUNNER] Spawning python for run_agents.py... Query: "${query}"`);

    // Determine the Python command (try explicit Python 3.11 path first on Windows, then fallback)
    let pythonCmd = process.platform === 'win32'
      ? 'C:\\Users\\ASUS\\AppData\\Local\\Programs\\Python\\Python311\\python.exe'
      : 'python3';
    const args = [SCRIPT_PATH, '--query', query, '--telemetry', telemetryString];

    const child = spawn(pythonCmd, args);

    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    child.on('error', (err) => {
      console.error('[PYTHON-RUNNER] Failed to spawn python process:', err.message);
      // Generate standard fallback response to keep the app operational
      return resolve(getFallbackResponse(query, telemetry, `Spawn failed: ${err.message}`));
    });

    child.on('close', (code) => {
      if (code !== 0) {
        console.warn(`[PYTHON-RUNNER] Python script exited with code ${code}. Stderr: ${stderrData.trim()}`);
        return resolve(getFallbackResponse(query, telemetry, stderrData.trim() || `Exit code ${code}`));
      }

      try {
        const parsed = JSON.parse(stdoutData.trim());
        if (parsed.success === false) {
          console.warn('[PYTHON-RUNNER] Python script returned success=false:', parsed.error);
          return resolve(getFallbackResponse(query, telemetry, parsed.error));
        }
        console.log('[PYTHON-RUNNER] Python script completed successfully.');
        resolve(parsed);
      } catch (err) {
        console.error('[PYTHON-RUNNER] Failed to parse stdout JSON:', err.message, '\nRaw stdout:', stdoutData);
        resolve(getFallbackResponse(query, telemetry, `JSON Parse error: ${err.message}`));
      }
    });
  });
};

/**
 * Generates rule-based fallback response if the Python pipeline or Ollama fails.
 */
function getFallbackResponse(query, telemetry, reason) {
  console.log(`[PYTHON-RUNNER-FALLBACK] Utilizing fallback telemetry analysis (Reason: ${reason})`);

  return {
    success: true,
    query,
    retrieved_sources: ['Fallback System Catalog'],
    retrieval_results: 'Agent response unavailable.',
    telemetry_risk: 'Fallback mode activated.',
    sensor_evidence: 'Fallback mode activated.',
    historical_evidence: 'Agent response unavailable.',
    historical_incidents: 'Agent response unavailable.',
    rdso_guidance: 'Agent response unavailable.',
    root_cause: 'Fallback mode activated.',
    root_causes: 'Fallback mode activated.',
    mitigation: 'Keep Monitoring',
    mitigation_actions: 'Keep Monitoring',
    executive_summary: 'Agent response unavailable.',
    risk_level: 'Medium',
    escalation_level: 'Medium',
    alerts: ['Keep Monitoring'],
    reasoning: 'Fallback mode activated.'
  };
}
