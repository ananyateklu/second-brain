/**
 * Load test for Second Brain API.
 * Simulates normal user load over 5 minutes.
 *
 * Run: k6 run -e BASE_URL=http://localhost:5001 load.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { getAuthToken } from '../helpers/auth.js';
import { generateNote, generateConversation } from '../helpers/data.js';

// Custom metrics
const notesLatency = new Trend('notes_latency');
const chatLatency = new Trend('chat_latency');
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 20 },  // Ramp up to 20 users
    { duration: '3m', target: 50 },  // Stay at 50 users
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% under 1s
    http_req_failed: ['rate<0.02'],    // Less than 2% errors
    notes_latency: ['p(95)<500'],      // Notes endpoint under 500ms
    chat_latency: ['p(95)<800'],       // Chat endpoint under 800ms
    errors: ['rate<0.02'],             // Custom error rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5001';

export function setup() {
  const token = getAuthToken(BASE_URL);
  return { token };
}

export default function (data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };

  // Random operation selection
  const operation = Math.random();

  if (operation < 0.4) {
    // 40% - Browse notes
    browseNotes(headers);
  } else if (operation < 0.6) {
    // 20% - Create/update note
    writeNote(headers);
  } else if (operation < 0.8) {
    // 20% - Browse conversations
    browseConversations(headers);
  } else {
    // 20% - Check focus items
    checkFocus(headers);
  }

  sleep(Math.random() * 2 + 1); // 1-3 second think time
}

function browseNotes(headers) {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/api/notes`, { headers });
  notesLatency.add(Date.now() - start);

  const success = check(res, {
    'notes list success': (r) => r.status === 200,
  });

  if (!success) {
    errorRate.add(1);
  }

  // View a specific note if we have any
  if (res.status === 200) {
    try {
      const notes = JSON.parse(res.body);
      if (notes.length > 0) {
        const randomNote = notes[Math.floor(Math.random() * notes.length)];
        const detailRes = http.get(`${BASE_URL}/api/notes/${randomNote.id}`, { headers });
        check(detailRes, {
          'note detail success': (r) => r.status === 200,
        });
      }
    } catch (e) {
      console.error('Failed to parse notes response');
    }
  }
}

function writeNote(headers) {
  const note = generateNote();
  const start = Date.now();

  const res = http.post(
    `${BASE_URL}/api/notes`,
    JSON.stringify(note),
    { headers }
  );

  notesLatency.add(Date.now() - start);

  const success = check(res, {
    'create note success': (r) => r.status === 201 || r.status === 200,
  });

  if (!success) {
    errorRate.add(1);
    console.error(`Create note failed: ${res.status} ${res.body}`);
  }
}

function browseConversations(headers) {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/api/chat/conversations`, { headers });
  chatLatency.add(Date.now() - start);

  check(res, {
    'conversations list success': (r) => r.status === 200,
  });
}

function checkFocus(headers) {
  const res = http.get(`${BASE_URL}/api/focus/items`, { headers });
  check(res, {
    'focus items accessible': (r) => r.status === 200 || r.status === 404,
  });
}

export function teardown(data) {
  console.log('Load test completed');
}
