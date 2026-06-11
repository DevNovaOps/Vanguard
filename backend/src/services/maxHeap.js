/**
 * Max Heap Priority Queue implementation for Vanguard ARC Incidents.
 * Prioritizes incidents dynamically based on primary key (riskScore) and secondary key (severityWeight).
 */

const SEVERITY_WEIGHTS = {
  'Critical': 100,
  'High': 75,
  'Medium': 50,
  'Low': 25
};

export class MaxHeap {
  constructor() {
    this.heap = [];
  }

  /**
   * Weight helper for severity ranking
   */
  getWeight(item) {
    const severity = item.severity || 'Low';
    return SEVERITY_WEIGHTS[severity] || 25;
  }

  /**
   * Compares two items. Returns > 0 if a has higher priority than b.
   */
  compare(a, b) {
    if (a.riskScore !== b.riskScore) {
      return a.riskScore - b.riskScore;
    }
    return this.getWeight(a) - this.getWeight(b);
  }

  /**
   * Returns parent index
   */
  getParentIndex(i) { return Math.floor((i - 1) / 2); }

  /**
   * Returns left child index
   */
  getLeftChildIndex(i) { return 2 * i + 1; }

  /**
   * Returns right child index
   */
  getRightChildIndex(i) { return 2 * i + 2; }

  /**
   * Swap two items in heap
   */
  swap(i, j) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }

  /**
   * Peek at the highest priority item without removing it
   */
  peek() {
    return this.heap[0] || null;
  }

  /**
   * Insert new item into the heap
   */
  insert(item) {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  /**
   * Bubble up the node at index to its correct position
   */
  bubbleUp(index) {
    let curr = index;
    while (curr > 0) {
      const parent = this.getParentIndex(curr);
      if (this.compare(this.heap[curr], this.heap[parent]) > 0) {
        this.swap(curr, parent);
        curr = parent;
      } else {
        break;
      }
    }
  }

  /**
   * Extract and return the highest priority item
   */
  extractMax() {
    if (this.heap.length === 0) return null;
    const max = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.sinkDown(0);
    }
    return max;
  }

  /**
   * Sink down node at index to its correct position
   */
  sinkDown(index) {
    let curr = index;
    const size = this.heap.length;

    while (true) {
      let largest = curr;
      const left = this.getLeftChildIndex(curr);
      const right = this.getRightChildIndex(curr);

      if (left < size && this.compare(this.heap[left], this.heap[largest]) > 0) {
        largest = left;
      }

      if (right < size && this.compare(this.heap[right], this.heap[largest]) > 0) {
        largest = right;
      }

      if (largest !== curr) {
        this.swap(curr, largest);
        curr = largest;
      } else {
        break;
      }
    }
  }

  /**
   * Run heapify downward from index
   */
  heapify(index) {
    this.sinkDown(index);
  }

  /**
   * Build a heap from an array of items in O(N)
   */
  buildHeap(items) {
    this.heap = [...items];
    const startIdx = Math.floor(this.heap.length / 2) - 1;
    for (let i = startIdx; i >= 0; i--) {
      this.sinkDown(i);
    }
  }

  /**
   * Remove a specific item from the heap by incidentId or mongoose _id
   */
  remove(id) {
    const idx = this.heap.findIndex(item => 
      item.incidentId === id || item._id?.toString() === id?.toString()
    );
    if (idx === -1) return false;

    // Swap target index with last item, pop, and reheapify
    const last = this.heap.pop();
    if (idx < this.heap.length) {
      this.heap[idx] = last;
      // Re-heapify by checking both bubbleUp and sinkDown directions
      this.bubbleUp(idx);
      this.sinkDown(idx);
    }
    return true;
  }

  /**
   * Update the priority parameters of an incident
   */
  updatePriority(id, newRiskScore, newSeverity) {
    const idx = this.heap.findIndex(item => 
      item.incidentId === id || item._id?.toString() === id?.toString()
    );
    if (idx === -1) return false;

    this.heap[idx].riskScore = newRiskScore;
    if (newSeverity) {
      this.heap[idx].severity = newSeverity;
    }

    // Restore heap invariant
    this.bubbleUp(idx);
    this.sinkDown(idx);
    return true;
  }

  /**
   * Get all elements in sorted priority order
   */
  getAllPrioritized() {
    // Return a copy sorted by extracting max recursively to ensure true heap sorted order
    const originalHeap = [...this.heap];
    const sorted = [];
    while (this.heap.length > 0) {
      sorted.push(this.extractMax());
    }
    this.heap = originalHeap; // Restore
    return sorted;
  }
}

export default MaxHeap;
