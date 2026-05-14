fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', parts: [{ text: 'Hello' }] }],
    systemInstruction: 'You are helpful.',
    stream: false
  })
}).then(r => r.json()).then(console.log).catch(console.error);
