# Performance Testing

Performance tests for Second Brain using [k6](https://k6.io/).

## Prerequisites

1. Install k6:
   ```bash
   # macOS
   brew install k6

   # Linux
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6

   # Windows
   choco install k6
   ```

2. Backend running on `http://localhost:5001`

3. Test user credentials (optional):
   ```bash
   export PERF_TEST_EMAIL="perf-test@example.com"
   export PERF_TEST_PASSWORD="PerfTestPassword123!"
   ```

## Running Tests

### Smoke Test (Quick Sanity Check)

```bash
k6 run -e BASE_URL=http://localhost:5001 k6/scripts/smoke.js
```

- 10 virtual users
- 1 minute duration
- Validates core endpoints respond

### Load Test (Normal Usage)

```bash
k6 run -e BASE_URL=http://localhost:5001 k6/scripts/load.js
```

- Ramps to 50 virtual users
- 5 minute duration
- Simulates realistic user behavior

### Custom Options

```bash
# Override VUs and duration
k6 run -e BASE_URL=http://localhost:5001 --vus 20 --duration 2m k6/scripts/smoke.js

# Output to JSON for analysis
k6 run -e BASE_URL=http://localhost:5001 --out json=results.json k6/scripts/load.js

# Run with web dashboard
k6 run -e BASE_URL=http://localhost:5001 --out web-dashboard k6/scripts/load.js
```

## Test Scripts

| Script | Purpose | VUs | Duration |
|--------|---------|-----|----------|
| `smoke.js` | Quick sanity check | 10 | 1 min |
| `load.js` | Normal load simulation | 20-50 | 5 min |

## Thresholds

See `config/thresholds.json` for target metrics:

| Metric | Smoke | Load | Stress |
|--------|-------|------|--------|
| p95 Response Time | < 500ms | < 1000ms | < 2000ms |
| Error Rate | < 1% | < 2% | < 5% |
| Notes p95 | < 300ms | < 500ms | < 1000ms |
| Chat p95 | < 500ms | < 800ms | < 1500ms |

## Results Interpretation

### Console Output

```
     ✓ health check status is 200
     ✓ notes status is 200
     ✓ notes response is array

     checks.........................: 99.50% ✓ 1990    ✗ 10
     data_received..................: 2.1 MB 35 kB/s
     data_sent......................: 156 kB 2.6 kB/s
     http_req_duration..............: avg=45ms min=12ms max=234ms p(95)=89ms
```

- **checks**: Percentage of assertions that passed
- **http_req_duration**: Request latency statistics
- **data_received/sent**: Network throughput

### Threshold Violations

If thresholds are violated, k6 exits with non-zero code:

```
ERRO[0061] thresholds on metrics 'http_req_duration' have been breached
```

## CI Integration

Performance tests can run on a schedule or manually:

```yaml
# .github/workflows/performance-tests.yml
on:
  schedule:
    - cron: '0 6 * * 1'  # Weekly Monday 6am
  workflow_dispatch:     # Manual trigger
```

## Writing New Tests

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { getAuthToken } from '../helpers/auth.js';

export const options = {
  vus: 10,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<500'],
  },
};

export function setup() {
  return { token: getAuthToken(__ENV.BASE_URL) };
}

export default function (data) {
  const headers = { Authorization: `Bearer ${data.token}` };

  const res = http.get(`${__ENV.BASE_URL}/api/your-endpoint`, { headers });

  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
```

## Best Practices

1. **Start with smoke tests** - Validate basics before load testing
2. **Realistic think time** - Use `sleep()` between requests
3. **Clean test data** - Use unique IDs to avoid conflicts
4. **Monitor resources** - Watch CPU/memory during tests
5. **Run from CI** - Consistent environment for comparison
