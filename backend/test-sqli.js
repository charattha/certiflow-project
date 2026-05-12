const fs = require('fs');

async function testSqlInjection() {
  const url = 'http://localhost:3001/api/auth/login';

  const payloads = [
    // Standard SQLi Bypass
    { email: "' OR 1=1 --", password: "password" },
    // SQLi Admin Login attempt
    { email: "admin@certipaws.com' --", password: "password" },
    // SQLi Union Array Injection attempt via JSON payload
    { email: { $gt: "" }, password: "password" }
  ];

  const results = [];

  for (let i = 0; i < payloads.length; i++) {
    const payload = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloads[i])
    };

    const response = await fetch(url, payload);
    const data = await response.json();
    results.push({ attempt: i, payload: payloads[i], status: response.status, data });
  }
  
  fs.writeFileSync('sqli-results.json', JSON.stringify(results, null, 2));
}

testSqlInjection();
