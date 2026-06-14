

async function run() {
  console.log('--- STARTING AUTH ENDPOINT VERIFICATION ---');
  const baseUrl = 'http://localhost:5000/api/auth';
  const testEmail = 'admin123@gmail.com';

  try {
    // 1. Verify email exists
    console.log('1. Testing POST /forgot-password...');
    const forgotRes = await fetch(`${baseUrl}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    const forgotData = await forgotRes.json();
    console.log('Response:', forgotData);

    // 2. Generate and send reset link
    console.log('\n2. Testing POST /send-reset-link...');
    const resetLinkRes = await fetch(`${baseUrl}/send-reset-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    const resetLinkData = await resetLinkRes.json();
    console.log('Response:', resetLinkData);

    // 3. Generate and send login OTP
    console.log('\n3. Testing POST /send-login-otp...');
    const otpRes = await fetch(`${baseUrl}/send-login-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    const otpData = await otpRes.json();
    console.log('Response:', otpData);

  } catch (err) {
    console.error('Error during endpoint test:', err);
  }
  process.exit(0);
}

run();
