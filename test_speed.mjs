const start = Date.now();
console.log('Sending request to http://localhost:3000/api/chat with prompt "hi AI"...');

fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'hi AI' })
})
  .then(async (res) => {
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`Status: ${res.status}, Time: ${elapsed}s`);
    const json = await res.json();
    console.log('Response:', JSON.stringify(json, null, 2));
  })
  .catch((err) => {
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    console.error(`Error after ${elapsed}s:`, err.message);
  });
