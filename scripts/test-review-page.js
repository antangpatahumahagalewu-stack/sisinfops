const http = require('http');
const https = require('https');

console.log('Testing review page...');
console.log('=====================');

function testPage() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: '/id/dashboard/finance/proyek/review',
      method: 'GET',
      headers: {
        'User-Agent': 'TestScript/1.0'
      },
      timeout: 10000
    };

    const req = http.request(options, (res) => {
      console.log(`Status Code: ${res.statusCode}`);
      console.log(`Status Message: ${res.statusMessage}`);
      console.log(`Content-Type: ${res.headers['content-type']}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk.toString();
      });
      
      res.on('end', () => {
        // Check for key indicators
        if (data.includes('PRG-KPS-KAP-02')) {
          console.log('✅ Program PRG-KPS-KAP-02 FOUND in the page!');
          const lines = data.split('\n');
          lines.forEach((line, i) => {
            if (line.includes('PRG-KPS-KAP-02')) {
              console.log(`Line ${i}: ${line.substring(0, 100)}...`);
            }
          });
        } else if (data.includes('Tidak ada program')) {
          console.log('⚠️  Page shows "Tidak ada program" message');
        } else if (data.includes('Program Approval Management')) {
          console.log('✅ Page loaded successfully (Program Approval Management found)');
          
          // Check for any program data
          if (data.includes('submitted_for_review') || data.includes('KAPASITAS')) {
            console.log('✅ Program data appears to be present');
          } else {
            console.log('⚠️  Program data not visible in HTML (might be loaded via JavaScript)');
          }
        } else if (data.includes('/id/login')) {
          console.log('❌ Redirected to login page - authentication required');
        } else {
          console.log('⚠️  Page loaded but content not as expected');
          console.log(`First 500 chars: ${data.substring(0, 500)}...`);
        }
        resolve(true);
      });
    });

    req.on('error', (err) => {
      console.error(`Request error: ${err.message}`);
      if (err.code === 'ECONNREFUSED') {
        console.log('❌ Server not running on port 3002');
      }
      resolve(false);
    });

    req.on('timeout', () => {
      console.error('Request timeout');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Run test
testPage().then((success) => {
  if (success) {
    console.log('\n=====================');
    console.log('Test completed');
  } else {
    console.log('\n=====================');
    console.log('Test failed');
  }
  process.exit(success ? 0 : 1);
});