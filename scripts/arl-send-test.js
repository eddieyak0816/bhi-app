// Sends ARL's documented demo result (fake patient "Jane Doe") to our backend.
// Usage:
//   node scripts/arl-send-test.js <backend-url> <ARL_WEBHOOK_TOKEN> <test-account-public-id>
// Example:
//   node scripts/arl-send-test.js https://your-backend.onrender.com my-secret NHL-ABCD-1234
const fs = require('fs')
const path = require('path')

const [url, token, publicId] = process.argv.slice(2)
if (!url || !token || !publicId) {
  console.log('Usage: node scripts/arl-send-test.js <backend-url> <token> <test-account-public-id>')
  process.exit(1)
}

const body = JSON.parse(fs.readFileSync(path.join(__dirname, 'arl-demo-results.json'), 'utf8'))
body.patient_mrn = publicId

fetch(`${url.replace(/\/$/, '')}/api/arl/results`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
  body: JSON.stringify(body),
})
  .then(async r => console.log(r.status, JSON.stringify(await r.json(), null, 2)))
  .catch(e => console.error('Request failed:', e.message))
