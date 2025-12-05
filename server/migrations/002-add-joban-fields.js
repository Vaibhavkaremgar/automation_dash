module.exports = {
  up: async (db) => {
    await db.exec(`
      ALTER TABLE insurance_customers ADD COLUMN last_year_premium REAL;
      ALTER TABLE insurance_customers ADD COLUMN cheque_hold TEXT;
      ALTER TABLE insurance_customers ADD COLUMN payment_date TEXT;
      ALTER TABLE insurance_customers ADD COLUMN cheque_no TEXT;
      ALTER TABLE insurance_customers ADD COLUMN cheque_bounce TEXT;
      ALTER TABLE insurance_customers ADD COLUMN owner_alert_sent TEXT;
      ALTER TABLE insurance_customers ADD COLUMN client_type TEXT DEFAULT 'kmg';
    `);
  },
  down: async (db) => {
    // SQLite doesn't support DROP COLUMN easily, would need table recreation
  }
};
