// Script to disable Vercel deployment protection via API
// Run with: node disable-protection.js

const { execSync } = require('child_process');

async function disableProtection() {
    console.log('🔓 Attempting to disable Vercel deployment protection...\n');
    
    const PROJECT_ID = 'prj_XytpFGd4S0pDzDyiNsfvqfKC6Jbm';
    const commands = [
        // Try setting protection to none
        `vercel project add --name quantum-mycelium-nexus-public`,
        `vercel env add VERCEL_PROTECTION none production`,
        // Try setting security headers to allow all
        `vercel env add VERCEL_BYPASS_PROTECTION true production`,
    ];
    
    for (const command of commands) {
        try {
            console.log(`Trying: ${command}`);
            const result = execSync(command, { encoding: 'utf8' });
            console.log(`✅ Success: ${result}\n`);
        } catch (error) {
            console.log(`❌ Failed: ${error.message}\n`);
        }
    }
    
    console.log('📝 Manual steps required:');
    console.log('1. Go to: https://vercel.com/michael-9927s-projects/quantum-mycelium-nexus/settings/deployment-protection');
    console.log('2. Change "Vercel Authentication" to "None"');
    console.log('3. Click "Save"');
    console.log('\nAlternatively, redeploy to a new project without protection:');
    console.log('vercel --name quantum-mycelium-nexus-public --prod');
}

disableProtection();