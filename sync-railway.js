const axios = require('axios');

const RAILWAY_URL = 'https://automationdash-production.up.railway.app';

async function syncRailway() {
  console.log('\n🔄 Syncing Railway from Google Sheets\n');

  // Login as Joban
  console.log('1️⃣ Logging in as Joban...');
  const loginRes = await axios.post(`${RAILWAY_URL}/api/auth/login`, {
    email: 'jobanputra@gmail.com',
    password: 'joban123'
  });
  console.log('   ✅ Logged in:', loginRes.data.user.name);
  
  const token = loginRes.data.token;

  // Check current customers
  console.log('\n2️⃣ Checking current customers...');
  const customersRes = await axios.get(`${RAILWAY_URL}/api/insurance/customers`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('   📊 Current customers:', customersRes.data.length);

  // Sync from sheets
  console.log('\n3️⃣ Syncing from Google Sheets...');
  const syncRes = await axios.post(
    `${RAILWAY_URL}/api/insurance/sync/from-sheet`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  console.log('   ✅ Sync result:', syncRes.data);

  // Check customers again
  console.log('\n4️⃣ Checking customers after sync...');
  const customersRes2 = await axios.get(`${RAILWAY_URL}/api/insurance/customers`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('   📊 Customers after sync:', customersRes2.data.length);

  if (customersRes2.data.length > 0) {
    console.log('\n✅ Success! Customers synced to Railway');
    console.log('\nSample customer:', customersRes2.data[0].name);
  } else {
    console.log('\n⚠️  No customers after sync. Check Railway logs for errors.');
  }

  console.log('\n');
}

syncRailway().catch(err => {
  console.error('❌ Error:', err.response?.data || err.message);
});
