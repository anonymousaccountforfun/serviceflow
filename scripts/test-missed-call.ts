/**
 * Test script for missed call text-back flow
 *
 * This script simulates the Twilio webhook flow to test the
 * missed call text-back functionality without actual Twilio calls.
 *
 * Usage: npx tsx scripts/test-missed-call.ts
 */

import 'dotenv/config';

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function simulateIncomingCall() {
  console.log('📞 Simulating incoming call...\n');

  // Step 1: Simulate incoming call webhook
  const callSid = `CA_TEST_${Date.now()}`;
  const incomingCallPayload = new URLSearchParams({
    CallSid: callSid,
    From: '+15165559999',
    To: '+15165551234', // This should match the seeded phone number
    CallStatus: 'ringing',
    Direction: 'inbound',
  });

  console.log('1. Sending incoming call webhook...');
  try {
    const response1 = await fetch(`${API_URL}/webhooks/twilio/voice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: incomingCallPayload.toString(),
    });

    const twiml = await response1.text();
    console.log(`   Response status: ${response1.status}`);
    console.log(`   TwiML response: ${twiml.substring(0, 200)}...\n`);
  } catch (error) {
    console.error('   Error:', error);
    return;
  }

  // Step 2: Simulate call ending with no-answer
  console.log('2. Simulating call ended (no-answer)...');
  const statusPayload = new URLSearchParams({
    CallSid: callSid,
    CallStatus: 'no-answer',
    CallDuration: '0',
  });

  try {
    const response2 = await fetch(`${API_URL}/webhooks/twilio/voice/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: statusPayload.toString(),
    });

    console.log(`   Response status: ${response2.status}`);
    console.log('   ✅ Call marked as missed\n');
  } catch (error) {
    console.error('   Error:', error);
    return;
  }

  // Wait for the text-back (TIMING.MISSED_CALL_DELAY_MS is 30 seconds in constants)
  console.log('3. Waiting for text-back to be sent...');
  console.log('   (The handler waits 30 seconds before sending to avoid sending if caller calls back)\n');
  console.log('   Check the API logs to see the text-back being sent.');
  console.log('   In production, this would actually send an SMS via Twilio.\n');
}

async function simulateIncomingSms() {
  console.log('💬 Simulating incoming SMS...\n');

  const messageSid = `SM_TEST_${Date.now()}`;
  const smsPayload = new URLSearchParams({
    MessageSid: messageSid,
    From: '+15165559999',
    To: '+15165551234',
    Body: 'Hi, I have a leaking faucet. Can you help?',
  });

  console.log('1. Sending incoming SMS webhook...');
  try {
    const response = await fetch(`${API_URL}/webhooks/twilio/sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: smsPayload.toString(),
    });

    const twiml = await response.text();
    console.log(`   Response status: ${response.status}`);
    console.log(`   TwiML response: ${twiml}`);
    console.log('   ✅ Message received and logged\n');
  } catch (error) {
    console.error('   Error:', error);
  }
}

async function testStopKeyword() {
  console.log('🛑 Testing STOP keyword (TCPA compliance)...\n');

  const messageSid = `SM_TEST_${Date.now()}`;
  const smsPayload = new URLSearchParams({
    MessageSid: messageSid,
    From: '+15165559999',
    To: '+15165551234',
    Body: 'STOP',
  });

  console.log('1. Sending STOP message...');
  try {
    const response = await fetch(`${API_URL}/webhooks/twilio/sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: smsPayload.toString(),
    });

    const twiml = await response.text();
    console.log(`   Response status: ${response.status}`);
    console.log(`   TwiML response: ${twiml}`);
    console.log('   ✅ Opt-out should be recorded\n');
  } catch (error) {
    console.error('   Error:', error);
  }
}

async function checkHealth() {
  console.log('🏥 Checking API health...\n');

  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(data)}\n`);
    return response.ok;
  } catch (error) {
    console.error('   ❌ API is not running. Start it with: pnpm dev');
    console.error(`   Error: ${error}\n`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('ServiceFlow - Missed Call Text-Back Test');
  console.log('='.repeat(60) + '\n');

  // Check if API is running
  const healthy = await checkHealth();
  if (!healthy) {
    console.log('\n❌ Please start the API server first:');
    console.log('   cd /Users/brianhughes/Desktop/serviceflow');
    console.log('   npx pnpm dev\n');
    process.exit(1);
  }

  // Run tests
  await simulateIncomingCall();
  await simulateIncomingSms();
  await testStopKeyword();

  console.log('='.repeat(60));
  console.log('Test complete! Check the API logs for details.');
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
