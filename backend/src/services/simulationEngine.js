import complianceService from './complianceService.js';
import incidentService from './incidentService.js';
import RailwayNode from '../models/RailwayNode.js';

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

    // Step 1 & 2: Simulate Temperature Spike (135°C exceeds rule limit of 120°C)
    // This will create a compliance violation
    const violations = await complianceService.evaluateReading({
      nodeId: node._id,
      sensorType: 'Temperature',
      value: 135
    });

    // Step 3 & 4: Calculate Risk Score (87) and Create Incident
    // We call createIncident directly which resolves duplication by updating any existing open incident
    const incident = await incidentService.createIncident({
      nodeId: node._id,
      riskScore: 87,
      title: `Simulated Critical Incident: ${node.nodeName}`,
      description: `Simulated Failure Cascade: Rail temperature spike (135°C) caused compliance violation of API617-TEMP. Node risk score elevated to 87/100.`,
      source: 'Simulation',
      status: 'Open'
    }, req);

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
