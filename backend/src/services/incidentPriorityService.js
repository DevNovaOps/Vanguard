import MaxHeap from './maxHeap.js';
import Incident from '../models/Incident.js';
import { getIO } from '../config/socket.js';
import { logAudit } from '../utils/auditLogger.js';

// Global singleton instance of MaxHeap for priority queue
const priorityQueue = new MaxHeap();
let isInitialized = false;

/**
 * Ensures heap is populated with active incidents from DB.
 */
async function ensureInitialized() {
  if (!isInitialized) {
    await rebuildHeap();
  }
}

/**
 * Rebuild heap from active incidents in database.
 */
async function rebuildHeap(req = null) {
  // Active incidents are not Resolved and not Closed
  const activeIncidents = await Incident.find({
    status: { $in: ['Open', 'Investigating', 'Mitigating'] }
  }).populate('nodeId');

  // Map database format to heap items
  const items = activeIncidents.map(inc => {
    const obj = inc.toObject();
    return {
      ...obj,
      id: inc.incidentId,
      asset: inc.nodeId?.nodeCode || '',
      assetName: inc.nodeId?.nodeName || 'Unknown Asset'
    };
  });

  priorityQueue.buildHeap(items);
  isInitialized = true;

  // Audit Log
  try {
    await logAudit({
      req,
      module: 'Incident',
      action: 'Heap Rebuilt',
      description: `Rebuilt Max Heap priority queue with ${items.length} active incidents`,
      metadata: { totalActive: items.length }
    });
  } catch (err) {
    console.error('[AUDIT-ERROR] Failed to log Heap Rebuilt:', err.message);
  }

  // Emit Socket update
  broadcastUpdate();

  return priorityQueue.getAllPrioritized();
}

/**
 * Broadcast priority updates to all clients via Socket.IO
 */
function broadcastUpdate() {
  try {
    const io = getIO();
    const sorted = priorityQueue.getAllPrioritized().map((item, idx) => ({
      ...item,
      priorityRank: idx + 1
    }));
    io.emit('incident:priority:update', {
      totalIncidents: sorted.length,
      highestPriority: sorted[0] || null,
      queue: sorted
    });
    console.log(`[SOCKET] Emitted incident:priority:update with ${sorted.length} items`);
  } catch (error) {
    // Suppress errors during tests or server start before sockets initialize
    console.warn(`[SOCKET] Broadcast failed (Socket.IO might not be initialized): ${error.message}`);
  }
}

export const incidentPriorityService = {
  /**
   * Returns open incidents in priority order
   */
  async getPrioritizedQueue() {
    await ensureInitialized();
    const sorted = priorityQueue.getAllPrioritized();
    return sorted.map((item, idx) => ({
      ...item,
      priorityRank: idx + 1
    }));
  },

  /**
   * Triggers a heap rebuild and broadcasts real-time updates
   */
  async triggerRecalculation(req = null) {
    return await rebuildHeap(req);
  },

  /**
   * Get priority position of a single incident
   */
  async getIncidentPriorityRank(id) {
    await ensureInitialized();
    const sorted = priorityQueue.getAllPrioritized();
    const idx = sorted.findIndex(item => 
      item.incidentId === id || item._id?.toString() === id?.toString()
    );
    if (idx === -1) return null;
    return idx + 1;
  },

  /**
   * Compiles dashboard priority counters and identifies the top incident
   */
  async getPriorityDashboard() {
    await ensureInitialized();
    const queue = priorityQueue.getAllPrioritized();
    
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    queue.forEach(item => {
      const severity = item.severity?.toLowerCase();
      if (severity === 'critical') criticalCount++;
      else if (severity === 'high') highCount++;
      else if (severity === 'medium') mediumCount++;
      else lowCount++;
    });

    return {
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      topIncident: queue[0] || null
    };
  }
};

export default incidentPriorityService;
