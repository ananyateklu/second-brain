/**
 * Smoke test for Second Brain API.
 * Quick sanity check that core endpoints are responding.
 *
 * Run: k6 run -e BASE_URL=http://localhost:5001 smoke.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getAuthToken } from '../helpers/auth.js';

export const options = {
  vus: 10,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% errors
    checks: ['rate>0.99'],            // 99% of checks pass
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5001';

export function setup() {
  // Authenticate and get token
  const token = getAuthToken(BASE_URL);
  return { token };
}

export default function (data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };

  // Health check (no auth required)
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
  });

  // Get notes
  const notesRes = http.get(`${BASE_URL}/api/notes`, { headers });
  check(notesRes, {
    'notes status is 200': (r) => r.status === 200,
    'notes response is array': (r) => {
      try {
        return Array.isArray(JSON.parse(r.body));
      } catch {
        return false;
      }
    },
  });

  // Get conversations
  const convRes = http.get(`${BASE_URL}/api/chat/conversations`, { headers });
  check(convRes, {
    'conversations status is 200': (r) => r.status === 200,
  });

  // Get focus items
  const focusRes = http.get(`${BASE_URL}/api/focus/items`, { headers });
  check(focusRes, {
    'focus items status is 200 or 404': (r) => r.status === 200 || r.status === 404,
  });

  sleep(1);
}

export function teardown(data) {
  console.log('Smoke test completed');
}
