import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const responseTime = new Trend('response_time');
const requestCount = new Counter('request_count');

// Base URL - adjust if needed
const BASE_URL = 'http://localhost:8000';

// Test scenarios configuration
export const options = {
  scenarios: {
    // Scenario 1: Low load (10 users, 30s)
    low_load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '10s',
      tags: { test_type: 'low_load' },
    },
    
    // Scenario 2: Medium load (100 users, 1 min)
    medium_load: {
      executor: 'constant-vus',
      vus: 100,
      duration: '10s',
      startTime: '10s', // Start after low_load finishes
      tags: { test_type: 'medium_load' },
    },
    
    // Scenario 3: Stress test (500+ users, ramping up until failure)
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 },   // Ramp up to 100 users
        { duration: '10s', target: 300 },   // Ramp up to 300 users
        { duration: '10s', target: 500 },   // Ramp up to 500 users
        { duration: '10s', target: 750 },   // Ramp up to 750 users
        { duration: '10s', target: 1000 },  // Ramp up to 1000 users
        { duration: '1m', target: 4000 },  // Stay at 1000 users
        { duration: '10s', target: 0 },     // Ramp down
      ],
      startTime: '20s', // Start after medium_load finishes
      tags: { test_type: 'stress_test' },
    },
  },
  
  // Thresholds for pass/fail criteria
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.05'],   // Error rate should be less than 5%
    error_rate: ['rate<0.05'],
    response_time: ['p(95)<500'],
  },
};

// Test data for different endpoints
const endpoints = [
  { path: '/health', weight: 70 },
  // Add more endpoints here as your API grows
  // { path: '/api/users', weight: 20 },
  // { path: '/api/data', weight: 10 },
];

// Helper function to select endpoint based on weight
function selectEndpoint() {
  const random = Math.random() * 100;
  let cumulative = 0;
  
  for (const endpoint of endpoints) {
    cumulative += endpoint.weight;
    if (random <= cumulative) {
      return endpoint.path;
    }
  }
  
  return endpoints[0].path; // Fallback
}

// Main test function
export default function () {
  const endpoint = selectEndpoint();
  const url = `${BASE_URL}${endpoint}`;
  
  // Make HTTP request
  const response = http.get(url, {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'k6-load-test',
    },
    timeout: '30s',
  });
  
  // Record custom metrics
  requestCount.add(1);
  responseTime.add(response.timings.duration);
  errorRate.add(response.status !== 200);
  
  // Validate response
  const isSuccess = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
    'response time < 2000ms': (r) => r.timings.duration < 2000,
    'response has body': (r) => r.body && r.body.length > 0,
    'response is JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch (e) {
        return false;
      }
    },
  });
  
  // Log errors for debugging
  if (response.status !== 200) {
    console.error(`Request failed: ${response.status} - ${response.body}`);
  }
  
  // Simulate user think time (random between 1-3 seconds)
  sleep(Math.random() * 2 + 1);
}

// Setup function - runs once before all scenarios
export function setup() {
  console.log('Starting k6 load test...');
  console.log(`Target URL: ${BASE_URL}`);
  
  // Verify service is running
  const response = http.get(`${BASE_URL}/health`);
  if (response.status !== 200) {
    throw new Error(`Service not available: ${response.status}`);
  }
  
  console.log('Service health check passed');
  return { startTime: new Date().toISOString() };
}

// Teardown function - runs once after all scenarios
export function teardown(data) {
  console.log('Load test completed');
  console.log(`Test started at: ${data.startTime}`);
  console.log(`Test ended at: ${new Date().toISOString()}`);
}

// Handle summary - customize the end-of-test summary
export function handleSummary(data) {
  const summary = {
    'load-test-results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
  
  // Generate detailed HTML report
  summary['load-test-report.html'] = htmlReport(data);
  
  return summary;
}

// Helper function for text summary
function textSummary(data, options = {}) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;
  
  let summary = '\n' + indent + '📊 Load Test Summary\n';
  summary += indent + '==================\n\n';
  
  // Test scenarios summary
  for (const [scenarioName, scenarioData] of Object.entries(data.metrics.scenarios || {})) {
    summary += indent + `🎯 Scenario: ${scenarioName}\n`;
    summary += indent + `   Duration: ${scenarioData.values.duration || 'N/A'}\n`;
    summary += indent + `   VUs: ${scenarioData.values.vus || 'N/A'}\n\n`;
  }
  
  // Key metrics
  const metrics = data.metrics;
  summary += indent + '📈 Key Metrics:\n';
  summary += indent + `   Total Requests: ${metrics.http_reqs?.values?.count || 0}\n`;
  summary += indent + `   Failed Requests: ${metrics.http_req_failed?.values?.fails || 0}\n`;
  summary += indent + `   Error Rate: ${((metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%\n`;
  summary += indent + `   Avg Response Time: ${(metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms\n`;
  summary += indent + `   95th Percentile: ${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms\n`;
  summary += indent + `   Throughput: ${(metrics.http_reqs?.values?.rate || 0).toFixed(2)} req/s\n\n`;
  
  return summary;
}

// Helper function for HTML report
function htmlReport(data) {
  const metrics = data.metrics;
  const totalRequests = metrics.http_reqs?.values?.count || 0;
  const failedRequests = metrics.http_req_failed?.values?.fails || 0;
  const errorRate = ((metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2);
  const avgResponseTime = (metrics.http_req_duration?.values?.avg || 0).toFixed(2);
  const p95ResponseTime = (metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2);
  const throughput = (metrics.http_reqs?.values?.rate || 0).toFixed(2);
  
  return `
<!DOCTYPE html>
<html>
<head>
    <title>k6 Load Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .metric { margin: 10px 0; padding: 10px; border-left: 4px solid #007cba; }
        .success { border-left-color: #28a745; }
        .warning { border-left-color: #ffc107; }
        .error { border-left-color: #dc3545; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 k6 Load Test Report</h1>
        <p>Generated on: ${new Date().toISOString()}</p>
    </div>
    
    <h2>📊 Summary Metrics</h2>
    <div class="metric ${errorRate < 5 ? 'success' : 'error'}">
        <strong>Total Requests:</strong> ${totalRequests}
    </div>
    <div class="metric ${errorRate < 5 ? 'success' : 'error'}">
        <strong>Failed Requests:</strong> ${failedRequests}
    </div>
    <div class="metric ${errorRate < 5 ? 'success' : 'error'}">
        <strong>Error Rate:</strong> ${errorRate}%
    </div>
    <div class="metric ${avgResponseTime < 500 ? 'success' : 'warning'}">
        <strong>Average Response Time:</strong> ${avgResponseTime}ms
    </div>
    <div class="metric ${p95ResponseTime < 500 ? 'success' : 'warning'}">
        <strong>95th Percentile Response Time:</strong> ${p95ResponseTime}ms
    </div>
    <div class="metric success">
        <strong>Throughput:</strong> ${throughput} requests/second
    </div>
    
    <h2>📈 Detailed Metrics</h2>
    <table>
        <tr><th>Metric</th><th>Value</th></tr>
        ${Object.entries(metrics).map(([key, value]) => 
            `<tr><td>${key}</td><td>${JSON.stringify(value.values || value, null, 2)}</td></tr>`
        ).join('')}
    </table>
</body>
</html>`;
}