const express = require('express');
const { getDatabase } = require('../db/connection');

const router = express.Router();
const db = getDatabase();

// Check for duplicate customer - Priority: Name > DOB > G Code > PAN > Aadhar
router.post('/customers/check-duplicate', (req, res) => {
  try {
    const { name, dob, g_code, pancard, aadhar_card } = req.body;
    
    db.all('SELECT * FROM insurance_customers WHERE user_id = ?', [req.user.id], (err, customers) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!customers || customers.length === 0) return res.json({ isDuplicate: false });
      
      const similarities = customers.map(existing => {
        let matchCount = 0;
        const matches = [];
        
        // Priority 1: Name
        if (name && existing.name && name.toLowerCase().trim() === existing.name.toLowerCase().trim()) {
          matchCount++;
          matches.push('name');
        }
        
        // Priority 2: DOB
        if (dob && existing.dob && dob.trim() === existing.dob.trim()) {
          matchCount++;
          matches.push('dob');
        }
        
        // Priority 3: G Code
        if (g_code && existing.g_code && g_code.toLowerCase().trim() === existing.g_code.toLowerCase().trim()) {
          matchCount++;
          matches.push('g_code');
        }
        
        // Priority 4: PAN Number
        if (pancard && existing.pancard && pancard.toUpperCase().trim() === existing.pancard.toUpperCase().trim()) {
          matchCount++;
          matches.push('pancard');
        }
        
        // Priority 5: Aadhar
        if (aadhar_card && existing.aadhar_card && aadhar_card.trim() === existing.aadhar_card.trim()) {
          matchCount++;
          matches.push('aadhar_card');
        }
        
        return { customer: existing, matchCount, matches };
      });
      
      const potentialDuplicates = similarities.filter(s => s.matchCount > 0);
      
      if (potentialDuplicates.length > 0) {
        const bestMatch = potentialDuplicates.sort((a, b) => b.matchCount - a.matchCount)[0];
        const similarityPercent = (bestMatch.matchCount / 5) * 100;
        
        res.json({
          isDuplicate: true,
          similarityPercent: Math.round(similarityPercent),
          existing: bestMatch.customer,
          matchedFields: bestMatch.matches,
          matchCount: bestMatch.matchCount,
          totalFields: 5
        });
      } else {
        res.json({ isDuplicate: false });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
