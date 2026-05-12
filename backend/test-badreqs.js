async function testBadRequests() {
  // Let's target the login endpoint but deliberately omit the 'email' payload to trigger Zod 400 Bad Request
  const url = 'http://localhost:3001/api/auth/login';
  const payload = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'nokey' }) // Invalid schema
  };

  for (let i = 1; i <= 22; i++) {
    const response = await fetch(url, payload);
    const data = await response.json();
    console.log(`Attempt ${i}: Status ${response.status}`, data);
  }
}

testBadRequests();
