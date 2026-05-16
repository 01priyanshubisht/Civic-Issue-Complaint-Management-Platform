#!/bin/bash
set -e

# Use the token from the previous script run (which is still running if we just grab a new token)
EMAIL="test_upload_2_$(date +%s)@example.com"
REG_RESPONSE=$(curl -s -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test Upload User\", \"email\":\"$EMAIL\", \"password\":\"password123\"}")

TOKEN=$(echo $REG_RESPONSE | grep -o '"token":"[^"]*' | grep -o '[^"]*$')

echo "dummy image content" > dummy.jpg

echo -e "\n=== Creating Unique Complaint with Image ==="
curl -s -X POST http://localhost:5001/api/complaints \
  -H "Authorization: Bearer $TOKEN" \
  -F "title=Unique issue with image" \
  -F "description=This is a completely unique issue so it doesn't trigger duplicate detection." \
  -F "latitude=22.9716" \
  -F "longitude=87.5946" \
  -F "category=waterlogging" \
  -F "image=@dummy.jpg"

