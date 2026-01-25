import * as CryptoJS from 'crypto-js';

// Encryption key - should be stored in environment variables in production
const ENCRYPTION_KEY = process.env.REDIS_ENCRYPTION_KEY || 'default-encryption-key-for-dev-only';

/**
 * Encrypt data using AES-256
 * @param data - Data to encrypt (will be stringified if not a string)
 * @returns Encrypted string
 */
export function encryptData(data: any): string {
  try {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(dataString, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('❌ Encryption failed:', error);
    // Return original data as string to prevent complete failure
    return JSON.stringify(data);
  }
}

/**
 * Decrypt data encrypted with encryptData
 * @param encryptedString - Encrypted string
 * @returns Decrypted data (parsed if JSON)
 */
export function decryptData<T = any>(encryptedString: string): T {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedString, ENCRYPTION_KEY);
    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
    
    // Try to parse as JSON, if fails return as string
    try {
      return JSON.parse(decryptedString) as T;
    } catch {
      return decryptedString as unknown as T;
    }
  } catch (error) {
    console.error('❌ Decryption failed:', error);
    // Return empty object to prevent crashes
    return {} as T;
  }
}

/**
 * Mask sensitive fields from data before caching
 * Removes or obfuscates personally identifiable information (PII)
 * @param data - Data object to sanitize
 * @returns Sanitized data
 */
export function maskSensitiveFields(data: any): any {
  if (!data) return data;
  
  // Create a deep copy to avoid mutating original
  const sanitized = JSON.parse(JSON.stringify(data));
  
  // Recursive function to traverse and mask sensitive fields
  function traverseAndMask(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => traverseAndMask(item));
    } else if (obj && typeof obj === 'object') {
      const result: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        // List of sensitive field patterns to mask
        const sensitivePatterns = [
          /password/i,
          /token/i,
          /secret/i,
          /key/i,
          /ktp/i,
          /nik/i,
          /identity/i,
          /bank/i,
          /account/i,
          /credit/i,
          /card/i,
          /phone/i,
          /email/i,
          /address/i,
          /coordinate/i,
          /gps/i,
          /latitude/i,
          /longitude/i,
          /signature/i,
          /pin/i,
          /ssn/i,
          /social_security/i
        ];
        
        const isSensitive = sensitivePatterns.some(pattern => pattern.test(key));
        
        if (isSensitive && value) {
          // Mask sensitive data
          if (typeof value === 'string' && value.length > 0) {
            // For strings, show first and last 2 chars with asterisks in middle
            if (value.length <= 4) {
              result[key] = '****';
            } else {
              const firstTwo = value.substring(0, 2);
              const lastTwo = value.substring(value.length - 2);
              const maskedLength = value.length - 4;
              result[key] = `${firstTwo}${'*'.repeat(maskedLength)}${lastTwo}`;
            }
          } else if (typeof value === 'number') {
            // For numbers, mask all but last 4 digits
            const numStr = value.toString();
            if (numStr.length <= 4) {
              result[key] = '****';
            } else {
              const lastFour = numStr.substring(numStr.length - 4);
              result[key] = `***${lastFour}`;
            }
          } else {
            // For other types, replace with [MASKED]
            result[key] = '[MASKED]';
          }
        } else {
          // Recursively process non-sensitive fields
          result[key] = traverseAndMask(value);
        }
      }
      
      return result;
    }
    
    return obj;
  }
  
  return traverseAndMask(sanitized);
}

/**
 * Generate cache key with consistent naming convention
 * @param domain - Domain (e.g., 'dashboard', 'user', 'ps')
 * @param entity - Entity type (e.g., 'carbon', 'stats', 'profile')
 * @param id - Identifier (optional)
 * @param version - Cache version (optional, defaults to 'v1')
 * @returns Formatted cache key
 */
export function generateCacheKey(
  domain: string,
  entity: string,
  id?: string | number,
  version: string = 'v1'
): string {
  const parts = [domain, entity];
  
  if (id !== undefined) {
    parts.push(id.toString());
  }
  
  parts.push(version);
  
  return parts.join(':');
}

/**
 * Generate hash from query parameters for cache key
 * @param params - Query parameters object
 * @returns MD5 hash string
 */
export function hashQueryParams(params: Record<string, any>): string {
  try {
    // Filter out undefined, null, empty string values
    const filteredParams: Record<string, any> = {};
    Object.keys(params).sort().forEach(key => {
      const value = params[key];
      if (value !== undefined && value !== null && value !== '') {
        filteredParams[key] = value;
      }
    });
    
    // If no valid parameters, return default hash
    if (Object.keys(filteredParams).length === 0) {
      return 'all';
    }
    
    const paramString = JSON.stringify(filteredParams);
    return CryptoJS.MD5(paramString).toString();
  } catch (error) {
    console.error('❌ Failed to hash query params:', error);
    return 'default';
  }
}

/**
 * Generate cache key for API endpoints with query parameters
 * @param endpoint - API endpoint path (e.g., 'carbon-projects', 'ps')
 * @param params - Query parameters object
 * @param version - Cache version (default: 'v1')
 * @returns Formatted cache key with query hash
 */
export function generateQueryCacheKey(
  endpoint: string,
  params: Record<string, any> = {},
  version: string = 'v1'
): string {
  const queryHash = hashQueryParams(params);
  return `api:${endpoint}:${queryHash}:${version}`;
}

/**
 * Check if data contains sensitive fields that should be encrypted
 * @param data - Data to check
 * @returns Boolean indicating if encryption is recommended
 */
export function shouldEncrypt(data: any): boolean {
  if (!data) return false;
  
  const sensitiveFieldPatterns = [
    /password/i,
    /token/i,
    /secret/i,
    /ktp/i,
    /nik/i,
    /bank_account/i,
    /credit_card/i,
    /phone_number/i,
    /email/i
  ];
  
  const dataString = JSON.stringify(data).toLowerCase();
  
  return sensitiveFieldPatterns.some(pattern => 
    pattern.test(dataString) || dataString.includes('coordinate')
  );
}