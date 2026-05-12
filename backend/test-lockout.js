async function testLockout() {
  const url = 'http://localhost:3001/api/auth/login';
  const payload = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'somchai@certipaws.com', password: 'wrongpassword' })
  };

  for (let i = 1; i <= 6; i++) {
    const response = await fetch(url, payload);
    const data = await response.json();
    console.log(`Attempt ${i}: Status ${response.status}`, data);
  }
}

testLockout();
