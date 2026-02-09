const http = require('http');

console.log('Testing verra-registration page fix...\n');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/id/dashboard/verra-registration',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Test)'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('\n✅ Page loaded successfully!');
      // Check if the page contains expected content
      if (data.includes('Verra Registration')) {
        console.log('✅ Page contains "Verra Registration" title');
      }
      if (data.includes('Total Projects')) {
        console.log('✅ Page contains "Total Projects" stat');
      }
      if (data.includes('Error fetching carbon projects')) {
        console.log('❌ Page still shows error message');
      } else {
        console.log('✅ No error message detected');
      }
    } else {
      console.log(`❌ Page returned status ${res.statusCode}`);
    }
    console.log('\nPage test completed.');
  });
});

req.on('error', (err) => {
  console.error(`❌ Request error: ${err.message}`);
  console.log('Make sure the dev server is running on port 3001');
  console.log('You can check with: curl -I http://localhost:3001/id/dashboard/verra-registration');
});

req.end();