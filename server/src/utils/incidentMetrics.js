// Minimal incident tracking - no external dependencies
class IncidentMetrics {
  constructor() {
    this.autoHealCount = 0;
    this.true404Count = 0;
    this.lastReset = Date.now();
  }

  recordAutoHeal(oldId, newId, method) {
    this.autoHealCount++;
    console.warn(`[AUTO-HEAL] ${method} - Stale ID ${oldId} → Corrected ID ${newId} | Total: ${this.autoHealCount}`);
  }

  recordTrue404(id, userId, method) {
    this.true404Count++;
    console.error(`[TRUE-404] ${method} - ID ${id} not found for user ${userId} | Total: ${this.true404Count}`);
  }

  getStats() {
    const uptime = Math.floor((Date.now() - this.lastReset) / 1000);
    return {
      autoHealCount: this.autoHealCount,
      true404Count: this.true404Count,
      uptimeSeconds: uptime,
      autoHealRate: uptime > 0 ? (this.autoHealCount / uptime * 3600).toFixed(2) : 0
    };
  }

  reset() {
    this.autoHealCount = 0;
    this.true404Count = 0;
    this.lastReset = Date.now();
  }
}

module.exports = new IncidentMetrics();
