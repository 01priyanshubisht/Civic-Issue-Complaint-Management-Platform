#!/bin/bash
set -e

echo "=== 1. Registering Test User ==="
EMAIL="test_ai_user_$(date +%s)@example.com"
REG_RESPONSE=$(curl -s -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test AI User\", \"email\":\"$EMAIL\", \"password\":\"password123\"}")

TOKEN=$(echo $REG_RESPONSE | grep -o '"token":"[^"]*' | grep -o '[^"]*$')

if [ -z "$TOKEN" ]; then
    echo "Failed to get token: $REG_RESPONSE"
    exit 1
fi
echo "User registered successfully."

echo -e "\n=== 2. Creating New Complaint (Pothole) ==="
COMPLAINT_RESPONSE=$(curl -s -X POST http://localhost:5001/api/complaints \
  -H "Authorization: Bearer $TOKEN" \
  -F "title=Massive Pothole near Central Mall" \
  -F "description=There is a huge, deep pothole right in front of Central Mall. It's causing massive traffic jams and damaging vehicle suspensions." \
  -F "latitude=12.9716" \
  -F "longitude=77.5946" \
  -F "category=pothole")

echo $COMPLAINT_RESPONSE | python3 -m json.tool

echo -e "\n=== 3. Testing Duplicate Detection (Creating same complaint again) ==="
DUP_RESPONSE=$(curl -s -X POST http://localhost:5001/api/complaints \
  -H "Authorization: Bearer $TOKEN" \
  -F "title=Huge hole in road at Central Mall" \
  -F "description=A very large pothole has opened up by the mall entrance causing car damage." \
  -F "latitude=12.9716" \
  -F "longitude=77.5946" \
  -F "category=pothole")

echo $DUP_RESPONSE | python3 -m json.tool

