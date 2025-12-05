module.exports = {
  up: async (db) => {
    await db.exec(`
      ALTER TABLE insurance_customers ADD COLUMN notes TEXT DEFAULT '';
    `);
  },
  down: async (db) => {
    // SQLite doesn't support DROP COLUMN easily
  }
};
