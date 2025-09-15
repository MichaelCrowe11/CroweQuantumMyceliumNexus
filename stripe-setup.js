/**
 * Stripe Quick Setup for Revenue Generation
 * Run this to test payments immediately after deployment
 */

// Frontend Stripe Integration
const STRIPE_CONFIG = {
    publishableKey: 'pk_test_51RkUYkQ6s74Bq3bWJjLqcqyEP4H5wy5j8oAR7k4c5MWUXfKOKGMx3PBFj0YvRxzFH5CzD7cG1HKSoRmZ6Yxg0Hsp00dDKWGfBV', // Your Stripe publishable key
    plans: {
        pro_monthly: {
            priceId: 'price_1QeDRpQ6s74Bq3bWp33kBvB0', // Pro plan price ID
            name: 'Quantum Pro Monthly',
            price: 29.00,
            currency: 'usd'
        },
        enterprise: {
            priceId: 'price_1QeDRpQ6s74Bq3bWEnterprise', // Enterprise price ID  
            name: 'Quantum Enterprise',
            price: 199.00,
            currency: 'usd'
        }
    }
};

// Stripe Checkout Integration
async function createCheckoutSession(planId) {
    try {
        const response = await fetch('/api/stripe/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                plan_id: planId,
                success_url: `${window.location.origin}/payment-success.html`,
                cancel_url: `${window.location.origin}/pricing.html`
            })
        });

        const session = await response.json();
        
        if (session.success) {
            // Redirect to Stripe Checkout
            window.location.href = session.checkout_url;
        } else {
            throw new Error(session.error || 'Checkout failed');
        }
    } catch (error) {
        console.error('Payment error:', error);
        alert('Payment failed. Please try again.');
    }
}

// Test Payment Function (for demo purposes)
async function testStripeIntegration() {
    console.log('🧪 Testing Stripe Integration...');
    
    // Test API connectivity
    try {
        const healthResponse = await fetch('/api/health');
        const health = await healthResponse.json();
        console.log('✅ API Health:', health);
        
        // Test Stripe plans endpoint
        const plansResponse = await fetch('/api/stripe/plans');
        const plans = await plansResponse.json();
        console.log('✅ Stripe Plans:', plans);
        
        console.log('🎉 Stripe integration is working!');
        return true;
    } catch (error) {
        console.error('❌ Stripe test failed:', error);
        return false;
    }
}

// Auto-run test when page loads
if (typeof window !== 'undefined') {
    window.testStripeIntegration = testStripeIntegration;
    window.createCheckoutSession = createCheckoutSession;
    
    // Test integration on page load
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(testStripeIntegration, 1000);
    });
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        STRIPE_CONFIG,
        testStripeIntegration,
        createCheckoutSession
    };
}