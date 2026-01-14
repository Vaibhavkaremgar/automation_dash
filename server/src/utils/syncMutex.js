// Minimal sync mutex - prevents concurrent syncs per user
class SyncMutex {
  constructor() {
    this.locks = new Map(); // userId -> { locked: boolean, queue: [] }
  }

  async acquire(userId) {
    if (!this.locks.has(userId)) {
      this.locks.set(userId, { locked: false, queue: [] });
    }

    const lock = this.locks.get(userId);

    if (!lock.locked) {
      lock.locked = true;
      return () => this.release(userId);
    }

    // Wait in queue
    return new Promise((resolve) => {
      lock.queue.push(resolve);
    });
  }

  release(userId) {
    const lock = this.locks.get(userId);
    if (!lock) return;

    if (lock.queue.length > 0) {
      const next = lock.queue.shift();
      next(() => this.release(userId));
    } else {
      lock.locked = false;
    }
  }

  isLocked(userId) {
    const lock = this.locks.get(userId);
    return lock ? lock.locked : false;
  }
}

module.exports = new SyncMutex();
