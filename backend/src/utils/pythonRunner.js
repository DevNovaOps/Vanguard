import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the Python run script
const SCRIPT_PATH = path.resolve(__dirname, '../../../ai/scripts/run_agents.py');

// Python process timeout: 120 seconds maximum
const PYTHON_TIMEOUT_MS = 300000;

/**
 * Execute the Vanguard 7-agent Python LangGraph pipeline.
 * @param {string} query - The inquiry/context query for retrieval.
 * @param {object} telemetry - Raw telemetry readings.
 * @returns {Promise<object>} The final 7-agent state output.
 */
export const runMultiAgentPipeline = (query, telemetry) => {
  return new Promise((resolve) => {
    const telemetryString = JSON.stringify(telemetry || {});
    console.log("PYTHON PAYLOAD:", telemetry);
    console.log(`[PYTHON-RUNNER] Spawning python for run_agents.py... Query: "${query}"`);
    console.time('[PYTHON-RUNNER] Total Python execution');

    // Determine the Python command (try explicit Python 3.11 path first on Windows, then fallback)
    let pythonCmd = process.platform === 'win32'
      ? 'C:\\Users\\ASUS\\AppData\\Local\\Programs\\Python\\Python311\\python.exe'
      : 'python3';
    const args = [SCRIPT_PATH, '--query', query, '--telemetry', telemetryString];

    const child = spawn(pythonCmd, args);

    let stdoutData = '';
    let stderrData = '';
    let resolved = false;

    // Timeout: kill the process if it takes longer than 120 seconds
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.timeEnd('[PYTHON-RUNNER] Total Python execution');
        console.warn(`[PYTHON-RUNNER] Python process timed out after ${PYTHON_TIMEOUT_MS / 1000} seconds. Killing...`);
        child.kill('SIGKILL');
        resolve(getFallbackResponse(query, telemetry, `Python process timed out after ${PYTHON_TIMEOUT_MS / 1000} seconds`));
      }
    }, PYTHON_TIMEOUT_MS);

    child.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    child.on('error', (err) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutId);
      console.timeEnd('[PYTHON-RUNNER] Total Python execution');
      console.error('[PYTHON-RUNNER] Failed to spawn python process:', err.message);
      // Generate standard fallback response to keep the app operational
      return resolve(getFallbackResponse(query, telemetry, `Spawn failed: ${err.message}`));
    });

    child.on('close', (code) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutId);
      console.timeEnd('[PYTHON-RUNNER] Total Python execution');

      try {
        const parsed = extractJsonFromStdout(stdoutData);
        if (parsed.success === false) {
          console.warn('[PYTHON-RUNNER] Python script returned success=false:', parsed.error);
          return resolve(getFallbackResponse(query, telemetry, parsed.error));
        }
        console.log('[PYTHON-RUNNER] Python script completed successfully.');
        resolve(parsed);
      } catch (err) {
        // JSON parsing failed — use exit code info for diagnostics
        if (code !== 0) {
          console.warn(`[PYTHON-RUNNER] Python script exited with code ${code}. Stderr: ${stderrData.trim()}`);
        }
        console.error('[PYTHON-RUNNER] Failed to parse stdout JSON:', err.message, '\nRaw stdout:', stdoutData);
        resolve(getFallbackResponse(query, telemetry, `JSON Parse error: ${err.message}`));
      }
    });
  });
};

/**
 * Extracts a valid JSON object matching the schema from the stdout buffer.
 * Utilizes a brace-matching parser that correctly handles strings, escapes,
 * and ignores non-JSON segments (like warnings or other logs).
 */
function extractJsonFromStdout(stdout) {
  let braceCount = 0;
  let inString = false;
  let escape = false;
  let firstBraceIdx = -1;

  for (let i = 0; i < stdout.length; i++) {
    const char = stdout[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') {
        if (braceCount === 0) {
          firstBraceIdx = i;
        }
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0 && firstBraceIdx !== -1) {
          const candidate = stdout.substring(firstBraceIdx, i + 1);
          try {
            const parsed = JSON.parse(candidate);
            if (parsed && typeof parsed === 'object' && ('success' in parsed || 'risk_level' in parsed)) {
              return parsed;
            }
          } catch (e) {
            // Ignore syntax errors in other brace blocks and continue scanning
          }
        }
      }
    }
  }

  // Fallback to searching backwards if brace matching failed to find the target object
  const startIdx = stdout.indexOf('{');
  const endIdx = stdout.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const candidate = stdout.substring(startIdx, endIdx + 1);
    try {
      return JSON.parse(candidate);
    } catch (e) {
      // Ignore
    }
  }

  throw new Error('No valid JSON object matching schema found in stdout');
}

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
