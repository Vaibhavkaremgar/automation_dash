const axios = require('axios');

const RAILWAY_URL = 'https://automationdash-production.up.railway.app';

async function testRailway() {
  console.log('\n🧪 Testing Railway Deployment\n');
  console.log(`Backend: ${RAILWAY_URL}\n`);

  // 1. Health Check
  console.log('1️⃣ Health Check...');
  try {
    const res = await axios.get(`${RAILWAY_URL}/`);
    console.log('   ✅ Server is running:', res.data.message);
  } catch (err) {
    console.log('   ❌ Server not responding:', err.message);
    return;
  }

  // 2. Debug Railway Check
  console.log('\n2️⃣ Configuration Check...');
  try {
    const res = await axios.get(`${RAILWAY_URL}/api/debug-railway/railway-check`);
    const data = res.data;
    
    console.log('   Environment:', data.environment);
    console.log('   Google Private Key:', data.hasGooglePrivateKey ? '✅ Present' : '❌ Missing');
    console.log('   Google Key Valid:', data.googlePrivateKeyValid ? '✅ Valid' : '❌ Invalid');
    console.log('   KMG Sheet ID:', data.hasKmgSheetId ? '✅ Set' : '❌ Missing');
    console.log('   Joban Sheet ID:', data.hasJobanSheetId ? '✅ Set' : '❌ Missing');
    console.log('   Total Customers:', data.totalCustomers);
    
    if (data.users) {
      console.log('\n   Users:');
      data.users.forEach(u => {
        console.log(`      - ${u.email}: ${u.status} ${u.hasSheetUrl ? '✅' : '❌ No Sheet URL'}`);
      });
    }
    
    if (data.renewalRemindersCols) {
      const hasCustomerId = data.renewalRemindersCols.includes('customer_id');
      console.log(`\n   renewal_reminders columns: ${hasCustomerId ? '✅' : '❌ Missing customer_id'}`);
      console.log(`      ${data.renewalRemindersCols.join(', ')}`);
    }
    
    if (data.dbError) {
      console.log('\n   ❌ Database Error:', data.dbError);
    }
  } catch (err) {
    console.log('   ❌ Config check failed:', err.response?.data || err.message);
  }

  // 3. Test Login
  console.log('\n3️⃣ Testing Login...');
  try {
    const res = await axios.post(`${RAILWAY_URL}/api/auth/login`, {
      email: 'kvreddy1809@gmail.com',
      password: 'kmg123'
    });
    console.log('   ✅ Login successful:', res.data.user.name);
    
    const token = res.data.token;
    
    // 4. Test Sync
    console.log('\n4️⃣ Testing Sync from Sheets...');
    try {
      const syncRes = await axios.post(
        `${RAILWAY_URL}/api/insurance/sync/from-sheet`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('   ✅ Sync successful:', syncRes.data);
    } catch (syncErr) {
      console.log('   ❌ Sync failed:', syncErr.response?.data || syncErr.message);
    }
    
  } catch (err) {
    console.log('   ❌ Login failed:', err.response?.data || err.message);
  }

  console.log('\n✅ Test completed!\n');
}

testRailway().catch(console.error);
