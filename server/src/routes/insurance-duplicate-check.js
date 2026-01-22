// Duplicate Detection Helper - Priority: Name > DOB > G Code > PAN > Aadhar
function checkDuplicate(newCustomer, existingCustomers) {
  const similarities = existingCustomers.map(existing => {
    let matchCount = 0;
    const matches = [];
    
    // Priority 1: Name
    if (newCustomer.name && existing.name && newCustomer.name.toLowerCase().trim() === existing.name.toLowerCase().trim()) {
      matchCount++;
      matches.push('name');
    }
    
    // Priority 2: DOB
    if (newCustomer.dob && existing.dob && newCustomer.dob.trim() === existing.dob.trim()) {
      matchCount++;
      matches.push('dob');
    }
    
    // Priority 3: G Code
    if (newCustomer.g_code && existing.g_code && newCustomer.g_code.toLowerCase().trim() === existing.g_code.toLowerCase().trim()) {
      matchCount++;
      matches.push('g_code');
    }
    
    // Priority 4: PAN Number
    if (newCustomer.pancard && existing.pancard && newCustomer.pancard.toUpperCase().trim() === existing.pancard.toUpperCase().trim()) {
      matchCount++;
      matches.push('pancard');
    }
    
    // Priority 5: Aadhar
    if (newCustomer.aadhar_card && existing.aadhar_card && newCustomer.aadhar_card.trim() === existing.aadhar_card.trim()) {
      matchCount++;
      matches.push('aadhar_card');
    }
    
    return { customer: existing, matchCount, matches };
  });
  
  const potentialDuplicates = similarities.filter(s => s.matchCount > 0);
  
  if (potentialDuplicates.length > 0) {
    const bestMatch = potentialDuplicates.sort((a, b) => b.matchCount - a.matchCount)[0];
    const similarityPercent = (bestMatch.matchCount / 5) * 100;
    
    return {
      isDuplicate: true,
      similarityPercent: Math.round(similarityPercent),
      existing: bestMatch.customer,
      matchedFields: bestMatch.matches,
      matchCount: bestMatch.matchCount,
      totalFields: 5
    };
  }
  
  return { isDuplicate: false };
}

module.exports = { checkDuplicate };
