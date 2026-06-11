import complianceService from './complianceService.js';
import incidentService from './incidentService.js';
import RailwayNode from '../models/RailwayNode.js';
import auditService from './auditService.js';

export const simulationEngine = {
  /**
   * Triggers a failure cascade simulation:
   * Temperature Spike -> Compliance Violation -> Risk Score -> Incident Created
   */
  async triggerSimulation(req) {
    // Target 'BRC' (Vadodara Junction) or fallback to any node
    let node = await RailwayNode.findOne({ nodeCode: 'BRC' });
    if (!node) {
      node = await RailwayNode.findOne({});
    }

    if (!node) {
      throw new Error('No railway nodes found in the database. Run database seed first.');
    }

    console.log(`[SIMULATION] Starting failure cascade on node: ${node.nodeName}`);

    // Step 1: Simulation Started
    await auditService.logSimulationStart(req, node);

    // Step 2: Temperature Spike
    await auditService.logSimulationStep(req, {
      name: 'Temperature Spike',
      description: `Telemetry simulated temperature spike (135°C) on node ${node.nodeName} (safety limit 120°C)`,
      severity: 'Warning',
      nodeId: node._id
    });

    // Step 3 & 4: Simulate Temperature Spike (135°C exceeds rule limit of 120°C)
    // This will create a compliance violation
    const violations = await complianceService.evaluateReading({
      nodeId: node._id,
      sensorType: 'Temperature',
      value: 135
    });

    // Step 4: Risk Increased
    await auditService.logSimulationStep(req, {
      name: 'Risk Increased',
      description: `Risk score elevated to 87/100 (CRITICAL classification) for node ${node.nodeName}`,
      severity: 'Critical',
      nodeId: node._id
    });

    // Step 5: Incident Created
    const incident = await incidentService.createIncident({
      nodeId: node._id,
      riskScore: 87,
      title: `Simulated Critical Incident: ${node.nodeName}`,
      description: `Simulated Failure Cascade: Rail temperature spike (135°C) caused compliance violation of API617-TEMP. Node risk score elevated to 87/100.`,
      source: 'Simulation',
      status: 'Open'
    }, req);

    // Step 6: Agent Activated
    await auditService.logSimulationStep(req, {
      name: 'Agent Activated',
      description: `Autonomous agent activated. Evaluating telemetry and mitigation options...`,
      severity: 'Info',
      nodeId: node._id
    });

    // Step 7: Mitigation Executed
    await auditService.logSimulationStep(req, {
      name: 'Mitigation Executed',
      description: `AI Agent initiated emergency speed restriction (30 km/h) on section near node ${node.nodeName}`,
      severity: 'Info',
      nodeId: node._id
    });

    // Step 8: System Stabilized
    await auditService.logSimulationStep(req, {
      name: 'System Stabilized',
      description: `Telemetry readings returning to normal operating thresholds. All systems stable.`,
      severity: 'Info',
      nodeId: node._id
    });

    // Step 9: Simulation Completed
    await auditService.logSimulationComplete(req, node);

    return {
      node: {
        id: node._id,
        nodeCode: node.nodeCode,
        nodeName: node.nodeName
      },
      violationsCreatedCount: violations.length,
      incident
    };
  }
};

export default simulationEngine;
