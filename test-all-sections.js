const axios = require('axios');

const URL = 'https://automationdash-production.up.railway.app';

async function testAllSections() {
  console.log('\n🧪 Testing All Dashboard Sections\n');

  // Login
  const loginRes = await axios.post(`${URL}/api/auth/login`, {
    email: 'jobanputra@gmail.com',
    password: 'joban123'
  });
  const token = loginRes.data.token;
  console.log('✅ Logged in as:', loginRes.data.user.name);

  const headers = { Authorization: `Bearer ${token}` };

  // Test each section
  const tests = [
    { name: 'Customers', url: '/api/insurance/customers' },
    { name: 'Analytics', url: '/api/insurance/analytics' },
    { name: 'Policy Analytics', url: '/api/policies/analytics' },
    { name: 'Renewal Stats', url: '/api/insurance/renewal-stats' },
    { name: 'Message Logs', url: '/api/insurance/message-logs' },
    { name: 'Reports', url: '/api/insurance/reports?vertical=all' },
    { name: 'Claims', url: '/api/insurance/claims' }
  ];

  console.log('\n📊 Testing Endpoints:\n');

  for (const test of tests) {
    try {
      const res = await axios.get(`${URL}${test.url}`, { headers });
      const dataLength = Array.isArray(res.data) ? res.data.length : 
                        res.data.customers?.length || 
                        Object.keys(res.data).length;
      console.log(`✅ ${test.name}: ${dataLength} items`);
    } catch (err) {
      console.log(`❌ ${test.name}: ${err.response?.data?.error || err.message}`);
    }
  }

  console.log('\n');
}

testAllSections().catch(console.error);
