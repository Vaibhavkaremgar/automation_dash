const { get, run, all } = require('../db/connection');
const walletService = require('./wallet');

class ToolsService {
  async getPricing() {
    const pricing = await all('SELECT * FROM tool_pricing WHERE is_active = 1', []);
    
    if (!pricing || pricing.length === 0) {
      return [
        { tool_name: 'vapi', price_per_unit_cents: 510, unit_type: 'minute', description: 'Voice calls (₹5 to provider + ₹0.10 margin)', is_active: 1 },
        { tool_name: 'elevenlabs', price_per_unit_cents: 30, unit_type: '1k_chars', description: '', is_active: 1 },
        { tool_name: 'n8n', price_per_unit_cents: 10, unit_type: 'execution', description: '', is_active: 1 },
      ];
    }
    return pricing;
  }
  
  async getPricingByTool(toolName) {
    const pricing = await get('SELECT * FROM tool_pricing WHERE tool_name = ? AND is_active = 1', [toolName]);
    return pricing;
  }
  
  async updatePricing(toolName, pricePerUnitCents, unitType, description) {
    await run(
      'UPDATE tool_pricing SET price_per_unit_cents = ?, unit_type = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE tool_name = ?',
      [pricePerUnitCents, unitType, description, toolName]
    );
    return this.getPricingByTool(toolName);
  }
  
  async computeCost(toolName, units) {
    const pricing = await this.getPricingByTool(toolName);
    if (!pricing) throw new Error(`Pricing not found for tool: ${toolName}`);
    
    let cost = 0;
    if (toolName === 'elevenlabs') {
      cost = Math.ceil(units / 1000) * pricing.price_per_unit_cents;
    } else {
      cost = units * pricing.price_per_unit_cents;
    }
    return Math.round(cost);
  }
  
  async logUsage(userId, toolName, units, metadata = null) {
    const costCents = await this.computeCost(toolName, units);
    
    if (!(await walletService.hasSufficientBalance(userId, costCents))) {
      throw new Error('Insufficient balance');
    }
    
    await walletService.deductFunds(userId, costCents, `${toolName} usage`);
    
    await run(
      'INSERT INTO tool_usage (user_id, tool_name, units_consumed, credits_used_cents, metadata) VALUES (?, ?, ?, ?, ?)',
      [userId, toolName, units, costCents, metadata ? JSON.stringify(metadata) : null]
    );
    
    const newBalance = await walletService.getBalance(userId);
    return { costCents, newBalance };
  }
  
  async getUsage(userId, fromDate = null, toDate = null) {
    let query = 'SELECT * FROM tool_usage WHERE user_id = ?';
    const params = [userId];
    
    if (fromDate) {
      query += ' AND created_at >= ?';
      params.push(fromDate);
    }
    if (toDate) {
      query += ' AND created_at <= ?';
      params.push(toDate);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const usage = await all(query, params);
    return usage;
  }
}

module.exports = new ToolsService();
