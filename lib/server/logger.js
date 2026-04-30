export function logRequest(method, url, headers, body) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📤 REQUEST: ${method} ${url}`);
  console.log(`${'='.repeat(60)}`);
  console.log('Headers:', JSON.stringify(headers, null, 2));
  if (body) {
    console.log('Body:', JSON.stringify(body, null, 2));
  }
}

export function logResponse(method, url, status, headers, data) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📥 RESPONSE: ${method} ${url} -> ${status}`);
  console.log(`${'='.repeat(60)}`);
  console.log('Headers:', JSON.stringify(headers, null, 2));
  if (data) {
    console.log('Data:', JSON.stringify(data, null, 2));
  }
}

export function logError(method, url, error) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`❌ ERROR: ${method} ${url}`);
  console.log(`${'='.repeat(60)}`);
  console.error(error);
}
