const { getDatabase } = require('./src/db/connection');

function seedSampleData() {
  const db = getDatabase();
  
  // Get client user ID
  db.get("SELECT id FROM users WHERE role = 'client' LIMIT 1", [], (err, client) => {
    if (err) {
      console.error('Error finding client:', err);
      return;
    }
    
    if (!client) {
      console.log('No client found, creating one...');
      db.run(
        "INSERT INTO users (email, password_hash, name, role, status) VALUES (?, ?, ?, ?, ?)",
        ['client@example.com', '$2b$10$dummy', 'Test Client', 'client', 'active'],
        function(err) {
          if (err) {
            console.error('Error creating client:', err);
            return;
          }
          seedCandidates(this.lastID);
        }
      );
    } else {
      seedCandidates(client.id);
    }
  });
}

function seedCandidates(clientId) {
  const db = getDatabase();
  
  const sampleCandidates = [
    {
      name: 'John Smith',
      email: 'john.smith@email.com',
      mobile: '+1234567890',
      status: 'shortlisted',
      match_score: 85,
      matching_skills: 'JavaScript, React, Node.js',
      missing_skills: 'TypeScript',
      summary: 'Experienced full-stack developer with 5 years experience'
    },
    {
      name: 'Sarah Johnson',
      email: 'sarah.j@email.com',
      mobile: '+1234567891',
      status: 'shortlisted',
      match_score: 92,
      matching_skills: 'Python, Django, PostgreSQL',
      missing_skills: 'Docker',
      summary: 'Senior backend developer with strong database skills'
    },
    {
      name: 'Mike Wilson',
      email: 'mike.w@email.com',
      mobile: '+1234567892',
      status: 'rejected',
      match_score: 45,
      matching_skills: 'HTML, CSS',
      missing_skills: 'JavaScript, React, Backend',
      summary: 'Junior frontend developer, needs more experience'
    },
    {
      name: 'Emily Davis',
      email: 'emily.d@email.com',
      mobile: '+1234567893',
      status: 'pending',
      match_score: 78,
      matching_skills: 'Java, Spring Boot, MySQL',
      missing_skills: 'Microservices',
      summary: 'Java developer with enterprise experience'
    },
    {
      name: 'Alex Chen',
      email: 'alex.c@email.com',
      mobile: '+1234567894',
      status: 'shortlisted',
      match_score: 88,
      matching_skills: 'React, TypeScript, AWS',
      missing_skills: 'GraphQL',
      summary: 'Frontend specialist with cloud experience'
    }
  ];
  
  // Clear existing candidates for this client
  db.run("DELETE FROM candidates WHERE user_id = ?", [clientId], (err) => {
    if (err) {
      console.error('Error clearing candidates:', err);
      return;
    }
    
    // Insert sample candidates
    const stmt = db.prepare(`
      INSERT INTO candidates (
        user_id, name, email, mobile, status, match_score, 
        matching_skills, missing_skills, summary, 
        interview_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    sampleCandidates.forEach((candidate, index) => {
      const now = new Date().toISOString();
      const interviewDate = index < 2 ? new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000).toISOString() : null;
      
      stmt.run([
        clientId,
        candidate.name,
        candidate.email,
        candidate.mobile,
        candidate.status,
        candidate.match_score,
        candidate.matching_skills,
        candidate.missing_skills,
        candidate.summary,
        interviewDate,
        now,
        now
      ]);
    });
    
    stmt.finalize((err) => {
      if (err) {
        console.error('Error inserting candidates:', err);
      } else {
        console.log('✅ Sample candidate data seeded successfully!');
        console.log(`📊 Added ${sampleCandidates.length} candidates for client ID: ${clientId}`);
      }
      process.exit(0);
    });
  });
}

// Run the seeding
seedSampleData();