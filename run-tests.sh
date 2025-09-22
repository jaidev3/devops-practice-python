#!/bin/bash

# k6 Load Testing Script Runner
# Make sure k6 is installed: brew install k6 (on macOS)

echo "🚀 Starting k6 Load Tests"
echo "=========================="

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "❌ k6 is not installed. Please install it first:"
    echo "   macOS: brew install k6"
    echo "   Linux: sudo apt-get install k6"
    echo "   Windows: choco install k6"
    exit 1
fi

# Check if service is running
echo "🔍 Checking if service is running on localhost:8000..."
if ! curl -s http://localhost:8000/health > /dev/null; then
    echo "❌ Service is not running on localhost:8000"
    echo "   Please start your service first:"
    echo "   docker-compose up -d"
    echo "   or"
    echo "   python main.py"
    exit 1
fi

echo "✅ Service is running"
echo ""

# Create results directory
mkdir -p test-results
cd test-results

# Run the load test
echo "🏃 Running k6 load test..."
k6 run --out json=results.json ../load-test.js

echo ""
echo "📊 Test Results:"
echo "- JSON results: test-results/results.json"
echo "- Summary report: test-results/load-test-results.json"
echo "- HTML report: test-results/load-test-report.html"
echo ""
echo "✅ Load testing completed!"