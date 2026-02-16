// Script untuk test financial API endpoints
import fetch from 'node-fetch'

async function testFinancialApis() {
  const baseUrl = 'http://localhost:3000'
  
  console.log('🔍 Testing financial API endpoints...')
  
  const endpoints = [
    {
      name: 'Transactions API',
      url: `${baseUrl}/api/finance/transactions?limit=5`,
      method: 'GET'
    },
    {
      name: 'Budgets API',
      url: `${baseUrl}/api/finance/budgets?status=active&limit=5`,
      method: 'GET'
    },
    {
      name: 'Ledgers Balances API',
      url: `${baseUrl}/api/finance/ledgers/balances`,
      method: 'GET'
    }
  ]

  for (const endpoint of endpoints) {
    console.log(`\n📡 Testing: ${endpoint.name}`)
    console.log(`   URL: ${endpoint.url}`)
    console.log(`   Method: ${endpoint.method}`)
    
    try {
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
      
      console.log(`   Status: ${response.status} ${response.statusText}`)
      
      const responseText = await response.text()
      
      if (!response.ok) {
        console.log(`   ❌ Error Response: ${responseText.substring(0, 500)}`)
        
        // Try to parse as JSON for better error display
        try {
          const errorJson = JSON.parse(responseText)
          console.log(`   Error details: ${JSON.stringify(errorJson, null, 2)}`)
        } catch {
          // Not JSON, keep as text
        }
      } else {
        console.log(`   ✅ Success`)
        
        try {
          const data = JSON.parse(responseText)
          console.log(`   Response structure:`)
          
          if (data.data) {
            console.log(`     - Has 'data' array with ${Array.isArray(data.data) ? data.data.length : '?'} items`)
            
            if (Array.isArray(data.data) && data.data.length > 0) {
              const sample = data.data[0]
              console.log(`     - Sample item keys: ${Object.keys(sample).join(', ')}`)
              
              // Show specific fields for transactions
              if (endpoint.name === 'Transactions API') {
                const expected = ['id', 'transaction_date', 'transaction_number', 'jenis_transaksi', 'jumlah_idr']
                const missing = expected.filter(field => !sample.hasOwnProperty(field))
                if (missing.length > 0) {
                  console.log(`     ⚠️ Missing expected fields: ${missing.join(', ')}`)
                  console.log(`     📋 Actual fields: ${Object.keys(sample).join(', ')}`)
                }
              }
            }
          } else {
            console.log(`     - No 'data' field in response`)
            console.log(`     - Response keys: ${Object.keys(data).join(', ')}`)
          }
          
          if (data.error) {
            console.log(`     - Has error: ${data.error}`)
          }
        } catch (jsonError) {
          console.log(`     ⚠️ Response not valid JSON`)
          console.log(`     Response preview: ${responseText.substring(0, 200)}`)
        }
      }
    } catch (error) {
      console.log(`   ❌ Network error: ${error.message}`)
      console.log(`   Is dev server running? Try: npm run dev`)
    }
  }
  
  // Test database direct query for comparison
  console.log('\n🔍 Direct database query for comparison...')
  try {
    // We'll use the API but with simpler query to see raw data
    const simpleUrl = `${baseUrl}/api/finance/transactions?limit=1`
    const response = await fetch(simpleUrl)
    
    if (response.ok) {
      const data = await response.json()
      if (data.data && data.data.length > 0) {
        const item = data.data[0]
        console.log('📋 Actual transaction from API:')
        console.log(JSON.stringify(item, null, 2))
      }
    }
  } catch (error) {
    console.log(`   Direct query failed: ${error.message}`)
  }
}

// Run tests
testFinancialApis().then(() => {
  console.log('\n🎉 API testing completed')
  console.log('\n📋 DIAGNOSIS BASED ON TESTS:')
  console.log('1. If 500 error: Check server logs for detailed error')
  console.log('2. If 404: API endpoint not implemented')
  console.log('3. If schema mismatch: Update API or database')
  console.log('4. If network error: Ensure dev server is running')
  console.log('\n💡 TROUBLESHOOTING:')
  console.log('- Check server logs: tail -f logs/nextjs.log')
  console.log('- Test with curl: curl -v http://localhost:3000/api/finance/transactions')
  console.log('- Check API route.ts files for implementation')
}).catch(error => {
  console.error('❌ Test failed:', error)
})