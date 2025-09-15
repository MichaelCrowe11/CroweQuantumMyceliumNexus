// Direct API Test Script
// Run with: node test-api-direct.js

const BASE_URL = 'https://quantum-mycelium-nexus-be4axazjt-michael-9927s-projects.vercel.app';

async function testAPIs() {
    console.log('🧪 Testing Live Deployment APIs...\n');
    console.log(`Base URL: ${BASE_URL}\n`);
    
    // Test 1: Frontend
    console.log('1️⃣ Testing Frontend...');
    try {
        const response = await fetch(BASE_URL);
        console.log(`   Status: ${response.status}`);
        if (response.status === 401) {
            console.log('   ⚠️  Frontend requires authentication (expected)\n');
        } else if (response.ok) {
            console.log('   ✅ Frontend accessible!\n');
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
    }
    
    // Test 2: API Health
    console.log('2️⃣ Testing API Health...');
    try {
        const response = await fetch(`${BASE_URL}/api/health`);
        console.log(`   Status: ${response.status}`);
        if (response.status === 401) {
            console.log('   ⚠️  API requires authentication\n');
        } else if (response.ok) {
            const data = await response.json();
            console.log(`   ✅ API Health: ${JSON.stringify(data)}\n`);
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
    }
    
    // Test 3: AI Tutor
    console.log('3️⃣ Testing AI Tutor...');
    try {
        const response = await fetch(`${BASE_URL}/api/ai/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: 'What is quantum superposition?',
                level: 'beginner'
            })
        });
        console.log(`   Status: ${response.status}`);
        if (response.status === 401) {
            console.log('   ⚠️  AI Tutor requires authentication\n');
        } else if (response.ok) {
            const data = await response.json();
            console.log(`   ✅ AI Response received!\n`);
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
    }
    
    // Test 4: Check server configuration
    console.log('4️⃣ Checking Server Configuration...');
    try {
        const response = await fetch(`${BASE_URL}/api`, {
            method: 'OPTIONS'
        });
        console.log(`   Status: ${response.status}`);
        const headers = [...response.headers.entries()];
        console.log('   Headers:', headers.map(h => `${h[0]}: ${h[1]}`).join(', '));
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
    }
    
    console.log('\n📊 Summary:');
    console.log('The deployment is live but protected by Vercel authentication.');
    console.log('To make it public, disable deployment protection in Vercel settings.');
    console.log('\nVisit: https://vercel.com/michael-9927s-projects/quantum-mycelium-nexus/settings/deployment-protection');
}

testAPIs();