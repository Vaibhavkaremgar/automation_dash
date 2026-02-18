class SyncQueue {
  constructor() {
    this.queues = new Map(); // userId -> queue array
    this.processing = new Map(); // userId -> boolean
  }

  async enqueue(userId, syncFn) {
    if (!this.queues.has(userId)) {
      this.queues.set(userId, []);
      this.processing.set(userId, false);
    }

    const queue = this.queues.get(userId);
    queue.push(syncFn);

    // Start processing if not already processing
    if (!this.processing.get(userId)) {
      this.processQueue(userId);
    }

    return { queued: true, queueLength: queue.length };
  }

  async processQueue(userId) {
    if (this.processing.get(userId)) return;

    const queue = this.queues.get(userId);
    if (!queue || queue.length === 0) return;

    this.processing.set(userId, true);

    try {
      while (queue.length > 0) {
        const syncFn = queue.shift();
        try {
          await syncFn();
        } catch (error) {
          console.error(`Sync error for user ${userId}:`, error);
        }
      }
    } finally {
      this.processing.set(userId, false);
    }
  }

  getStatus(userId) {
    const queue = this.queues.get(userId) || [];
    const isProcessing = this.processing.get(userId) || false;
    return {
      isProcessing,
      queueLength: queue.length,
      status: isProcessing ? 'syncing' : queue.length > 0 ? 'queued' : 'idle'
    };
  }
}

module.exports = new SyncQueue();
