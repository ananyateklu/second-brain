/**
 * Authentication helpers for k6 performance tests.
 */

import http from 'k6/http';
import { check, fail } from 'k6';

const TEST_EMAIL = __ENV.PERF_TEST_EMAIL || 'perf-test@example.com';
const TEST_PASSWORD = __ENV.PERF_TEST_PASSWORD || 'PerfTestPassword123!';

/**
 * Get an authentication token for API requests.
 * Attempts login, falls back to registration if user doesn't exist.
 */
export function getAuthToken(baseUrl) {
  const loginPayload = JSON.stringify({
    identifier: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  const loginRes = http.post(`${baseUrl}/api/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body);
    console.log('Login successful');
    return body.token;
  }

  // Try to register if login failed
  console.log('Login failed, attempting registration...');

  const registerPayload = JSON.stringify({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    displayName: 'Performance Test User',
  });

  const registerRes = http.post(`${baseUrl}/api/auth/register`, registerPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (registerRes.status === 200 || registerRes.status === 201) {
    const body = JSON.parse(registerRes.body);
    console.log('Registration successful');
    return body.token;
  }

  // If registration also failed (user exists but wrong password), try login again
  const retryLoginRes = http.post(`${baseUrl}/api/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (retryLoginRes.status === 200) {
    const body = JSON.parse(retryLoginRes.body);
    console.log('Retry login successful');
    return body.token;
  }

  fail(`Unable to authenticate: Login status ${loginRes.status}, Register status ${registerRes.status}`);
}

/**
 * Create an authenticated HTTP headers object.
 */
export function getAuthHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}
