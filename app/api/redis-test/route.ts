import { NextResponse } from "next/server"
import { cacheGet, cacheSet, cacheDelete, getCacheStats, clearAllCache } from "@/lib/redis/client"
import { generateQueryCacheKey, maskSensitiveFields } from "@/lib/redis/security"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const testType = searchParams.get("test") || "all"
    
    const results: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      redis_host: process.env.REDIS_HOST || 'localhost',
      redis_port: process.env.REDIS_PORT || '6379'
    }

    // Run tests based on type
    if (testType === 'all' || testType === 'basic') {
      results.basic_tests = await runBasicTests()
    }

    if (testType === 'all' || testType === 'performance') {
      results.performance_tests = await runPerformanceTests()
    }

    if (testType === 'all' || testType === 'security') {
      results.security_tests = await runSecurityTests()
    }

    if (testType === 'all' || testType === 'stats') {
      results.cache_stats = await getCacheStats()
    }

    return NextResponse.json({
      success: true,
      message: `Redis cache tests completed - ${testType}`,
      ...results
    })

  } catch (error) {
    console.error("Redis test error:", error)
    return NextResponse.json({
      success: false,
      error: "Test failed",
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function runBasicTests() {
  const tests: any[] = []
  const testKey = 'test:basic:' + Date.now()
  
  // Test 1: Set cache
  try {
    const testData = { message: "Hello Redis", timestamp: new Date().toISOString() }
    await cacheSet(testKey, testData, 60)
    tests.push({
      name: "cacheSet",
      status: "passed",
      message: "Successfully set cache"
    })
  } catch (error) {
    tests.push({
      name: "cacheSet",
      status: "failed",
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  // Test 2: Get cache
  try {
    type CacheTestResult = { message: string; timestamp: string } | { fallback: boolean };
    const cached = await cacheGet<CacheTestResult>(testKey, async () => ({ fallback: true }), 60);
    // Check if we got the cached data or fallback
    const isCacheHit = cached && 'message' in cached && cached.message === "Hello Redis";
    tests.push({
      name: "cacheGet - cache hit",
      status: isCacheHit ? "passed" : "failed",
      message: isCacheHit ? "Cache hit successful" : "Cache miss or wrong data"
    })
  } catch (error) {
    tests.push({
      name: "cacheGet",
      status: "failed",
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  // Test 3: Delete cache
  try {
    await cacheDelete(testKey)
    tests.push({
      name: "cacheDelete",
      status: "passed",
      message: "Successfully deleted cache"
    })
  } catch (error) {
    tests.push({
      name: "cacheDelete",
      status: "failed",
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  // Test 4: Verify deletion
  try {
    type CacheTestResult = { message: string; timestamp: string } | { fallback: boolean };
    const afterDelete = await cacheGet<CacheTestResult>(testKey, async () => ({ fallback: true }), 60);
    const isFallback = afterDelete && 'fallback' in afterDelete && afterDelete.fallback === true;
    tests.push({
      name: "cacheGet after delete",
      status: isFallback ? "passed" : "failed",
      message: isFallback ? "Cache miss as expected" : "Cache still exists"
    })
  } catch (error) {
    tests.push({
      name: "cacheGet after delete",
      status: "failed",
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  // Test 5: Query cache key generation
  try {
    const params = { kabupaten: "Gunung Mas", skema: "HKM", limit: 10 }
    const cacheKey = generateQueryCacheKey('ps-list', params)
    tests.push({
      name: "generateQueryCacheKey",
      status: cacheKey.startsWith('api:ps-list:') ? "passed" : "failed",
      message: `Generated key: ${cacheKey}`
    })
  } catch (error) {
    tests.push({
      name: "generateQueryCacheKey",
      status: "failed",
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  return tests
}

async function runPerformanceTests() {
  const tests: any[] = []
  const iterations = 10
  const keyPrefix = 'perf:' + Date.now()
  
  // Test 1: Sequential writes
  try {
    const startTime = Date.now()
    for (let i = 0; i < iterations; i++) {
      await cacheSet(`${keyPrefix}:${i}`, { iteration: i, data: "test" }, 10)
    }
    const writeTime = Date.now() - startTime
    const avgWriteTime = writeTime / iterations
    
    tests.push({
      name: "Sequential writes",
      status: "passed",
      message: `${iterations} writes in ${writeTime}ms (avg: ${avgWriteTime.toFixed(2)}ms)`,
      metrics: {
        iterations,
        total_time_ms: writeTime,
        avg_time_ms: avgWriteTime
      }
    })
  } catch (error) {
    tests.push({
      name: "Sequential writes",
      status: "failed",
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  // Test 2: Sequential reads (cache hits)
  try {
    const startTime = Date.now()
    for (let i = 0; i < iterations; i++) {
      await cacheGet(`${keyPrefix}:${i}`, async () => ({ fallback: true }), 10)
    }
    const readTime = Date.now() - startTime
    const avgReadTime = readTime / iterations
    
    tests.push({
      name: "Sequential reads (cache hits)",
      status: "passed",
      message: `${iterations} reads in ${readTime}ms (avg: ${avgReadTime.toFixed(2)}ms)`,
      metrics: {
        iterations,
        total_time_ms: readTime,
        avg_time_ms: avgReadTime
      }
    })
  } catch (error) {
    tests.push({
      name: "Sequential reads",
      status: "failed",
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  // Test 3: Concurrent reads (simulated with Promise.all)
  try {
    const promises = []
    for (let i = 0; i < iterations; i++) {
      promises.push(cacheGet(`${keyPrefix}:${i}`, async () => ({ fallback: true }), 10))
    }
    
    const startTime = Date.now()
    await Promise.all(promises)
    const concurrentTime = Date.now() - startTime
    
    tests.push({
      name: "Concurrent reads",
      status: "passed",
      message: `${iterations} concurrent reads in ${concurrentTime}ms`,
      metrics: {
        iterations,
        total_time_ms: concurrentTime
      }
    })
  } catch (error) {
    tests.push({
      name: "Concurrent reads",
      status: "failed",
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  // Cleanup
  try {
    await cacheDelete(`${keyPrefix}:*`)
    tests.push({
      name: "Cleanup performance keys",
      status: "passed",
      message: "Cleaned up test keys"
    })
  } catch (error) {
    tests.push({
      name: "Cleanup",
      status: "failed",
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  return tests
}

async function runSecurityTests() {
  const tests: any[] = []
  
  // Test 1: Field masking
  try {
    const sensitiveData = {
      name: "John Doe",
      ktp: "1234567890123456",
      phone: "081234567890",
      email: "john@example.com",
      address: "Jl. Test No. 123",
      coordinate: "-6.2088,106.8456",
      regular_field: "test"
    }
    
    const masked = maskSensitiveFields(sensitiveData)
    
    const ktpMasked = masked.ktp !== sensitiveData.ktp
    const phoneMasked = masked.phone !== sensitiveData.phone
    const emailMasked = masked.email !== sensitiveData.email
    const regularUnchanged = masked.regular_field === sensitiveData.regular_field
    
    tests.push({
      name: "Field masking",
      status: ktpMasked && phoneMasked && emailMasked && regularUnchanged ? "passed" : "failed",
      message: `KTP masked: ${ktpMasked}, Phone masked: ${phoneMasked}, Email masked: ${emailMasked}, Regular unchanged: ${regularUnchanged}`,
      original: {
        ktp: sensitiveData.ktp,
        phone: sensitiveData.phone,
        email: sensitiveData.email
      },
      masked: {
        ktp: masked.ktp,
        phone: masked.phone,
        email: masked.email
      }
    })
  } catch (error) {
    tests.push({
      name: "Field masking",
      status: "failed",
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  // Test 2: Cache key generation with same params produces same key
  try {
    const params1 = { kabupaten: "Gunung Mas", skema: "HKM", limit: 10 }
    const params2 = { skema: "HKM", limit: 10, kabupaten: "Gunung Mas" } // Different order
    const params3 = { kabupaten: "Gunung Mas", skema: "HKM", limit: 10, extra: undefined }
    
    const key1 = generateQueryCacheKey('test', params1)
    const key2 = generateQueryCacheKey('test', params2)
    const key3 = generateQueryCacheKey('test', params3)
    
    const same1and2 = key1 === key2
    const same1and3 = key1 === key3 // Should be same because undefined filtered out
    
    tests.push({
      name: "Cache key consistency",
      status: same1and2 && same1and3 ? "passed" : "failed",
      message: `Keys consistent across param orders: ${same1and2}, undefined filtered: ${same1and3}`,
      keys: {
        key1,
        key2,
        key3
      }
    })
  } catch (error) {
    tests.push({
      name: "Cache key consistency",
      status: "failed",
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  // Test 3: Empty params handling
  try {
    const emptyKey = generateQueryCacheKey('test', {})
    const undefinedKey = generateQueryCacheKey('test', { kabupaten: undefined, skema: null })
    
    tests.push({
      name: "Empty params handling",
      status: emptyKey.includes(':all:') && undefinedKey.includes(':all:') ? "passed" : "failed",
      message: `Empty params key: ${emptyKey}, Undefined params key: ${undefinedKey}`
    })
  } catch (error) {
    tests.push({
      name: "Empty params handling",
      status: "failed",
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  return tests
}

// POST method to clear cache (admin only)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const action = body.action || 'stats'
    
    if (action === 'clear') {
      await clearAllCache()
      return NextResponse.json({
        success: true,
        message: "Cache cleared successfully"
      })
    } else if (action === 'stats') {
      const stats = await getCacheStats()
      return NextResponse.json({
        success: true,
        stats
      })
    } else {
      return NextResponse.json({
        success: false,
        error: "Unknown action"
      }, { status: 400 })
    }
  } catch (error) {
    console.error("Cache admin action error:", error)
    return NextResponse.json({
      success: false,
      error: "Action failed",
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}