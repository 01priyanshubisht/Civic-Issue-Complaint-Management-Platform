#!/bin/bash
set -e

echo "=== Registering Test User ==="
EMAIL="test_upload_$(date +%s)@example.com"
REG_RESPONSE=$(curl -s -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test Upload User\", \"email\":\"$EMAIL\", \"password\":\"password123\"}")

TOKEN=$(echo $REG_RESPONSE | grep -o '"token":"[^"]*' | grep -o '[^"]*$')

if [ -z "$TOKEN" ]; then
    echo "Failed to get token: $REG_RESPONSE"
    exit 1
fi

echo "Token acquired."

# Create a dummy image
echo "dummy image content" > dummy.jpg

echo -e "\n=== Creating Complaint with Image ==="
curl -s -X POST http://localhost:5001/api/complaints \
  -H "Authorization: Bearer $TOKEN" \
  -F "title=Pothole near Central Mall" \
  -F "description=There is a huge pothole." \
  -F "latitude=12.9716" \
  -F "longitude=77.5946" \
  -F "category=pothole" \
  -F "image=@dummy.jpg" | python3 -m json.tool

