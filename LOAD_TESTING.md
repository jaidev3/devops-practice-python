# k6 Load Testing Guide

This directory contains k6 load testing scripts for benchmarking the FastAPI service.

## Prerequisites

1. **Install k6**:
   ```bash
   # macOS
   brew install k6
   
   # Linux (Ubuntu/Debian)
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6
   
   # Windows
   choco install k6
   ```

2. **Start your service**:
   ```bash
   # Using Docker Compose
   docker-compose up -d
   
   # Or directly with Python
   python main.py
   ```

## Test Scenarios

The load test includes three scenarios:

### 1. Low Load Test
- **Users**: 10 concurrent users
- **Duration**: 30 seconds
- **Purpose**: Baseline performance measurement

### 2. Medium Load Test
- **Users**: 100 concurrent users
- **Duration**: 1 minute
- **Purpose**: Normal operational load simulation

### 3. Stress Test
- **Users**: Ramps from 0 to 1000+ users
- **Duration**: ~15 minutes total
- **Stages**:
  - 0 → 100 users (2 min)
  - 100 → 300 users (2 min)
  - 300 → 500 users (2 min)
  - 500 → 750 users (2 min)
  - 750 → 1000 users (2 min)
  - Stay at 1000 users (5 min)
  - 1000 → 0 users (2 min)

## Running Tests

### Quick Start
```bash
# Make the script executable
chmod +x run-tests.sh

# Run all tests
./run-tests.sh
```

### Manual Execution
```bash
# Run the complete test suite
k6 run load-test.js

# Run with custom output formats
k6 run --out json=results.json --out influxdb=http://localhost:8086/k6 load-test.js

# Run only specific scenario (modify the script to comment out other scenarios)
k6 run load-test.js
```

## Metrics Captured

### Core Metrics
- **Latency**: Response time percentiles (avg, p95, p99)
- **Throughput**: Requests per second
- **Error Rate**: Percentage of failed requests
- **Concurrent Users**: Virtual users (VUs) over time

### Custom Metrics
- `error_rate`: Custom error rate tracking
- `response_time`: Custom response time trend
- `request_count`: Total request counter

### Thresholds
- 95% of requests should complete under 500ms
- Error rate should be less than 5%
- All requests should complete under 2 seconds

## Output Files

After running tests, you'll find:

1. **load-test-results.json**: Detailed JSON results
2. **load-test-report.html**: Visual HTML report
3. **results.json**: Raw k6 JSON output (if using run-tests.sh)

## Interpreting Results

### Good Performance Indicators
- ✅ Error rate < 1%
- ✅ P95 response time < 200ms
- ✅ P99 response time < 500ms
- ✅ Throughput scales linearly with users (up to a point)

### Warning Signs
- ⚠️ Error rate 1-5%
- ⚠️ P95 response time 200-500ms
- ⚠️ Throughput plateaus early

### Critical Issues
- ❌ Error rate > 5%
- ❌ P95 response time > 500ms
- ❌ Service becomes unresponsive
- ❌ Memory/CPU usage spikes dramatically

## Customization

### Adding New Endpoints
Edit the `endpoints` array in `load-test.js`:

```javascript
const endpoints = [
  { path: '/health', weight: 50 },
  { path: '/api/users', weight: 30 },
  { path: '/api/data', weight: 20 },
];
```

### Modifying Test Scenarios
Adjust the `options.scenarios` object to change user counts, duration, or add new scenarios.

### Custom Metrics
Add new metrics by importing from k6/metrics and recording values in the main function.

## Troubleshooting

### Common Issues

1. **Service not responding**:
   - Verify service is running: `curl http://localhost:8000/health`
   - Check Docker containers: `docker-compose ps`

2. **High error rates**:
   - Check service logs: `docker-compose logs fastapi-app`
   - Monitor system resources: `htop` or `docker stats`

3. **k6 installation issues**:
   - Verify installation: `k6 version`
   - Check PATH configuration

### Performance Tuning Tips

1. **Increase file descriptor limits** (Linux/macOS):
   ```bash
   ulimit -n 65536
   ```

2. **Monitor system resources**:
   ```bash
   # CPU and memory usage
   htop
   
   # Docker container stats
   docker stats
   
   # Network connections
   netstat -an | grep :8000
   ```

3. **Optimize your service**:
   - Enable connection pooling
   - Add caching layers
   - Optimize database queries
   - Use async/await properly

## Integration with CI/CD

Add to your CI pipeline:

```yaml
# Example GitHub Actions
- name: Run Load Tests
  run: |
    docker-compose up -d
    sleep 10  # Wait for service to start
    k6 run --quiet load-test.js
    docker-compose down
```

## Next Steps

1. Set up monitoring (Prometheus + Grafana)
2. Add database load testing
3. Test different deployment configurations
4. Implement automated performance regression detection
5. Add chaos engineering tests