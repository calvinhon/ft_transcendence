#!/bin/bash

# Test 2FA (Two-Factor Authentication) with TOTP
# Tests TOTP-based two-factor authentication implementation

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"

# Service URLs
AUTH_URL="${AUTH_URL:-http://localhost:3001}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Test user credentials
TEST_USER="2fa_test_user_$$"
TEST_EMAIL="2fa_test_$$@example.com"
TEST_PASSWORD="SecurePass123!"
TEST_TOKEN=""
TEST_USER_ID=""

print_test() {
    echo -e "${BLUE}Running Test $1: $2${NC}"
}

pass() {
    echo -e "${GREEN}[PASS]${NC} Test $1: $2"
    PASSED=$((PASSED + 1))
}

fail() {
    echo -e "${RED}[FAIL]${NC} Test $1: $2"
    echo "  Reason: $3"
    FAILED=$((FAILED + 1))
}

# Cleanup function
cleanup() {
    echo "Cleaning up test data..."
    # Note: In production, you'd want to delete the test user from database
}

trap cleanup EXIT

# Test 1: Auth Service Health Check
print_test 1 "Auth Service Health Check"
if curl -s "$AUTH_URL/health" > /dev/null 2>&1; then
    pass 1 "Auth Service Health Check"
else
    fail 1 "Auth Service Health Check" "Service not responding"
fi

# Test 2: Register Test User
print_test 2 "Register Test User for 2FA"
REGISTER_RESPONSE=$(curl -s -c /tmp/2fa_cookies.txt -X POST "$AUTH_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$TEST_USER\",\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

if echo "$REGISTER_RESPONSE" | grep -q "success.*true"; then
    TEST_USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"userId":[0-9]*' | cut -d':' -f2)
    # Extract token from cookie file
    if [ -f /tmp/2fa_cookies.txt ]; then
        TEST_TOKEN=$(grep 'token' /tmp/2fa_cookies.txt | awk '{print $NF}')
    fi
    pass 2 "Register Test User for 2FA"
else
    fail 2 "Register Test User for 2FA" "Registration failed: $REGISTER_RESPONSE"
fi

# Test 3: 2FA Status (Should be disabled initially)
print_test 3 "2FA Status Check (Initially Disabled)"
STATUS_RESPONSE=$(curl -s -b /tmp/2fa_cookies.txt -X GET "$AUTH_URL/auth/2fa/status")

if echo "$STATUS_RESPONSE" | grep -q '"enabled":false'; then
    pass 3 "2FA Status Check (Initially Disabled)"
else
    fail 3 "2FA Status Check (Initially Disabled)" "Unexpected status: $STATUS_RESPONSE"
fi

# Test 4: Setup 2FA (Generate Secret)
print_test 4 "2FA Setup - Generate Secret and QR Code"
SETUP_RESPONSE=$(curl -s -b /tmp/2fa_cookies.txt -X POST "$AUTH_URL/auth/2fa/setup" \
    -H "Content-Type: application/json" \
    -d '{}')

if echo "$SETUP_RESPONSE" | grep -q '"secret"' && echo "$SETUP_RESPONSE" | grep -q '"qrCode"'; then
    SECRET=$(echo "$SETUP_RESPONSE" | grep -o '"secret":"[^"]*"' | cut -d'"' -f4)
    pass 4 "2FA Setup - Generate Secret and QR Code"
else
    fail 4 "2FA Setup - Generate Secret and QR Code" "Setup failed: $SETUP_RESPONSE"
fi

# Test 5: Check QR Code Format
print_test 5 "QR Code Data URL Format"
if echo "$SETUP_RESPONSE" | grep -q '"qrCode":"data:image/png;base64,'; then
    pass 5 "QR Code Data URL Format"
else
    fail 5 "QR Code Data URL Format" "QR code not in expected format"
fi

# Test 6: Check OTPAuth URL
print_test 6 "OTPAuth URL Format"
if echo "$SETUP_RESPONSE" | grep -q 'otpauth://totp/FT_Transcendence'; then
    pass 6 "OTPAuth URL Format"
else
    fail 6 "OTPAuth URL Format" "OTPAuth URL not in expected format"
fi

# Test 7: Generate TOTP Token (simulated)
print_test 7 "TOTP Token Generation"
# Note: In real tests, we'd use the secret to generate a valid TOTP token
# For this test, we'll check if the secret exists
if [ -n "$SECRET" ] && [ ${#SECRET} -ge 16 ]; then
    pass 7 "TOTP Token Generation"
else
    fail 7 "TOTP Token Generation" "Secret not generated properly"
fi

# Test 8: Verify with Invalid Token
print_test 8 "2FA Verification with Invalid Token"
VERIFY_INVALID=$(curl -s -b /tmp/2fa_cookies.txt -X POST "$AUTH_URL/auth/2fa/verify" \
    -H "Content-Type: application/json" \
    -d '{"token":"000000"}')

if echo "$VERIFY_INVALID" | grep -q -i "invalid\|error"; then
    pass 8 "2FA Verification with Invalid Token"
else
    fail 8 "2FA Verification with Invalid Token" "Should reject invalid token"
fi

# Test 9: 2FA Status After Setup (Still Disabled)
print_test 9 "2FA Status After Setup (Not Yet Enabled)"
STATUS_AFTER_SETUP=$(curl -s -b /tmp/2fa_cookies.txt -X GET "$AUTH_URL/auth/2fa/status")

if echo "$STATUS_AFTER_SETUP" | grep -q '"enabled":false' && \
   echo "$STATUS_AFTER_SETUP" | grep -q '"hasSecret":true'; then
    pass 9 "2FA Status After Setup (Not Yet Enabled)"
else
    fail 9 "2FA Status After Setup (Not Yet Enabled)" "Status mismatch: $STATUS_AFTER_SETUP"
fi

# Test 10: Unauthenticated 2FA Access
print_test 10 "Unauthenticated 2FA Access Blocked"
UNAUTH_RESPONSE=$(curl -s -X GET "$AUTH_URL/auth/2fa/status")

if echo "$UNAUTH_RESPONSE" | grep -q -i "not authenticated\|unauthorized\|error"; then
    pass 10 "Unauthenticated 2FA Access Blocked"
else
    fail 10 "Unauthenticated 2FA Access Blocked" "Should require authentication"
fi

# Test 11: 2FA Disable Endpoint Exists
print_test 11 "2FA Disable Endpoint"
DISABLE_RESPONSE=$(curl -s -b /tmp/2fa_cookies.txt -X POST "$AUTH_URL/auth/2fa/disable" \
    -H "Content-Type: application/json" \
    -d "{\"password\":\"$TEST_PASSWORD\"}")

if echo "$DISABLE_RESPONSE" | grep -q '"enabled":false\|disabled successfully'; then
    pass 11 "2FA Disable Endpoint"
else
    fail 11 "2FA Disable Endpoint" "Disable endpoint failed: $DISABLE_RESPONSE"
fi

# Test 12: 2FA Integration with Login Flow
print_test 12 "2FA Integration with Login Flow"
# Login without 2FA should work normally
LOGIN_RESPONSE=$(curl -s -X POST "$AUTH_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASSWORD\"}")

if echo "$LOGIN_RESPONSE" | grep -q '"success":true\|Login successful'; then
    pass 12 "2FA Integration with Login Flow"
else
    fail 12 "2FA Integration with Login Flow" "Login failed: $LOGIN_RESPONSE"
fi

# Summary
echo ""
echo "=== Test Summary ==="
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo "Total: $((PASSED + FAILED))"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ 2FA/TOTP (Passed all tests)${NC}"
    exit 0
else
    echo -e "${RED}✗ 2FA/TOTP (Some tests failed)${NC}"
    exit 1
fi
