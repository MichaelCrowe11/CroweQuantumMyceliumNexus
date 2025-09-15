/**
 * Stripe Payment Integration for QuantumMycelium Nexus
 * Modern payment processing with subscriptions and one-time payments
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken } = require('./auth');

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_ANON_KEY || 'placeholder'
);

// Subscription Plans
const SUBSCRIPTION_PLANS = {
    free: {
        id: 'free',
        name: 'Quantum Free',
        price: 0,
        currency: 'usd',
        interval: null,
        features: [
            '5 quantum simulations/day',
            'Basic quantum circuits (up to 5 qubits)',
            'Community support',
            'Educational resources'
        ],
        limits: {
            simulations_per_day: 5,
            max_qubits: 5,
            hardware_access: false,
            api_calls_per_minute: 10
        }
    },
    pro_monthly: {
        id: 'pro_monthly',
        name: 'Quantum Pro Monthly',
        price: 2900, // $29.00 in cents
        currency: 'usd',
        interval: 'month',
        stripe_price_id: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
        features: [
            'Unlimited quantum simulations',
            'Advanced quantum circuits (up to 15 qubits)',
            'Quantum hardware access (IBM, AWS)',
            'All quantum algorithms',
            'Priority support',
            'Mycelium-EI language',
            'API access'
        ],
        limits: {
            simulations_per_day: -1, // unlimited
            max_qubits: 15,
            hardware_access: true,
            api_calls_per_minute: 100
        }
    },
    pro_annual: {
        id: 'pro_annual',
        name: 'Quantum Pro Annual',
        price: 29000, // $290.00 (2 months free)
        currency: 'usd',
        interval: 'year',
        stripe_price_id: process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
        features: [
            'All Pro Monthly features',
            '2 months free',
            'Advanced analytics',
            'Custom quantum circuits'
        ],
        limits: {
            simulations_per_day: -1,
            max_qubits: 15,
            hardware_access: true,
            api_calls_per_minute: 100
        }
    },
    enterprise: {
        id: 'enterprise',
        name: 'Quantum Enterprise',
        price: 19900, // $199.00
        currency: 'usd',
        interval: 'month',
        stripe_price_id: process.env.STRIPE_ENTERPRISE_PRICE_ID,
        features: [
            'All Pro features',
            'Large-scale quantum circuits (up to 30 qubits)',
            'Dedicated quantum resources',
            'Custom algorithm development',
            'White-label solutions',
            'Priority hardware queue',
            'Advanced team management',
            'SLA guarantee'
        ],
        limits: {
            simulations_per_day: -1,
            max_qubits: 30,
            hardware_access: true,
            priority_hardware: true,
            api_calls_per_minute: 500
        }
    }
};

/**
 * Get subscription plans
 */
router.get('/plans', (req, res) => {
    res.json({
        success: true,
        plans: Object.values(SUBSCRIPTION_PLANS),
        currencies: ['usd'],
        paymentMethods: ['card', 'crypto'] // Stripe + Coinbase
    });
});

/**
 * Create Stripe Checkout Session
 */
router.post('/create-checkout-session', authenticateToken, [
    body('plan_id').isIn(['pro_monthly', 'pro_annual', 'enterprise']),
    body('success_url').isURL(),
    body('cancel_url').isURL()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { plan_id, success_url, cancel_url } = req.body;
        const userId = req.user.userId;
        const plan = SUBSCRIPTION_PLANS[plan_id];

        if (!plan || !plan.stripe_price_id) {
            return res.status(400).json({ error: 'Invalid plan or Stripe not configured' });
        }

        // Get or create Stripe customer
        let customer = await getOrCreateStripeCustomer(userId);

        // Check for existing active subscription
        const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'active',
            limit: 1
        });

        if (subscriptions.data.length > 0) {
            return res.status(400).json({ 
                error: 'User already has active subscription',
                manageUrl: await createCustomerPortalSession(customer.id)
            });
        }

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            customer: customer.id,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: plan.stripe_price_id,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancel_url,
            metadata: {
                user_id: userId,
                plan_id: plan_id
            },
            subscription_data: {
                metadata: {
                    user_id: userId,
                    plan_id: plan_id
                }
            },
            allow_promotion_codes: true,
            billing_address_collection: 'auto',
            tax_id_collection: {
                enabled: true
            }
        });

        // Log checkout session
        await supabase.from('stripe_checkout_sessions').insert({
            session_id: session.id,
            user_id: userId,
            plan_id,
            status: 'created',
            created_at: new Date().toISOString()
        });

        res.json({
            success: true,
            checkout_url: session.url,
            session_id: session.id
        });

    } catch (error) {
        console.error('Stripe checkout session creation failed:', error);
        res.status(500).json({ 
            error: 'Failed to create checkout session',
            details: error.message 
        });
    }
});

/**
 * Create one-time payment for quantum credits
 */
router.post('/buy-credits', authenticateToken, [
    body('amount').isInt({ min: 5, max: 1000 }),
    body('credits').isInt({ min: 10, max: 10000 }),
    body('success_url').isURL(),
    body('cancel_url').isURL()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { amount, credits, success_url, cancel_url } = req.body;
        const userId = req.user.userId;

        // Get or create Stripe customer
        let customer = await getOrCreateStripeCustomer(userId);

        // Create Stripe Checkout Session for one-time payment
        const session = await stripe.checkout.sessions.create({
            customer: customer.id,
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `${credits} Quantum Credits`,
                            description: `${credits} credits for quantum computations`,
                        },
                        unit_amount: amount * 100, // Convert to cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancel_url,
            metadata: {
                user_id: userId,
                credits: credits,
                type: 'credit_purchase'
            }
        });

        res.json({
            success: true,
            checkout_url: session.url,
            session_id: session.id,
            credits: credits,
            amount: amount
        });

    } catch (error) {
        console.error('Credit purchase failed:', error);
        res.status(500).json({ 
            error: 'Failed to create credit purchase',
            details: error.message 
        });
    }
});

/**
 * Stripe Webhook Handler
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object);
                break;
                
            case 'invoice.payment_succeeded':
                await handlePaymentSucceeded(event.data.object);
                break;
                
            case 'invoice.payment_failed':
                await handlePaymentFailed(event.data.object);
                break;
                
            case 'customer.subscription.created':
                await handleSubscriptionCreated(event.data.object);
                break;
                
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object);
                break;
                
            case 'customer.subscription.deleted':
                await handleSubscriptionCancelled(event.data.object);
                break;
                
            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook handler failed:', error);
        res.status(500).json({ error: 'Webhook handler failed' });
    }
});

/**
 * Get user's current subscription
 */
router.get('/subscription', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const { data: subscription } = await supabase
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (!subscription) {
            return res.json({
                success: true,
                subscription: SUBSCRIPTION_PLANS.free,
                status: 'free'
            });
        }

        // Get Stripe subscription details if applicable
        let stripeSubscription = null;
        if (subscription.stripe_subscription_id) {
            try {
                stripeSubscription = await stripe.subscriptions.retrieve(
                    subscription.stripe_subscription_id
                );
            } catch (error) {
                console.error('Failed to fetch Stripe subscription:', error);
            }
        }

        res.json({
            success: true,
            subscription: {
                ...SUBSCRIPTION_PLANS[subscription.plan_id],
                status: subscription.status,
                current_period_start: subscription.current_period_start,
                current_period_end: subscription.current_period_end,
                cancel_at_period_end: subscription.cancel_at_period_end,
                stripe_status: stripeSubscription?.status
            }
        });

    } catch (error) {
        console.error('Failed to get subscription:', error);
        res.status(500).json({ 
            error: 'Failed to get subscription details',
            details: error.message 
        });
    }
});

/**
 * Create customer portal session
 */
router.post('/create-portal-session', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { return_url } = req.body;

        // Get Stripe customer
        const customer = await getOrCreateStripeCustomer(userId);

        // Create portal session
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customer.id,
            return_url: return_url || process.env.FRONTEND_URL
        });

        res.json({
            success: true,
            portal_url: portalSession.url
        });

    } catch (error) {
        console.error('Failed to create portal session:', error);
        res.status(500).json({ 
            error: 'Failed to create portal session',
            details: error.message 
        });
    }
});

/**
 * Cancel subscription
 */
router.post('/cancel-subscription', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { cancel_immediately = false } = req.body;

        const { data: subscription } = await supabase
            .from('user_subscriptions')
            .select('stripe_subscription_id')
            .eq('user_id', userId)
            .single();

        if (!subscription?.stripe_subscription_id) {
            return res.status(404).json({ error: 'No active subscription found' });
        }

        // Cancel in Stripe
        if (cancel_immediately) {
            await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
        } else {
            await stripe.subscriptions.update(subscription.stripe_subscription_id, {
                cancel_at_period_end: true
            });
        }

        res.json({
            success: true,
            message: cancel_immediately 
                ? 'Subscription cancelled immediately' 
                : 'Subscription will cancel at period end'
        });

    } catch (error) {
        console.error('Failed to cancel subscription:', error);
        res.status(500).json({ 
            error: 'Failed to cancel subscription',
            details: error.message 
        });
    }
});

// Helper Functions

async function getOrCreateStripeCustomer(userId) {
    // Check if customer already exists
    const { data: existing } = await supabase
        .from('stripe_customers')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single();

    if (existing) {
        return await stripe.customers.retrieve(existing.stripe_customer_id);
    }

    // Get user details
    const { data: user } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('id', userId)
        .single();

    // Create new Stripe customer
    const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name,
        metadata: {
            user_id: userId
        }
    });

    // Store customer ID
    await supabase.from('stripe_customers').insert({
        user_id: userId,
        stripe_customer_id: customer.id,
        created_at: new Date().toISOString()
    });

    return customer;
}

async function createCustomerPortalSession(customerId) {
    const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: process.env.FRONTEND_URL
    });
    return portalSession.url;
}

async function handleCheckoutCompleted(session) {
    const userId = session.metadata.user_id;
    
    if (session.metadata.type === 'credit_purchase') {
        // Handle credit purchase
        const credits = parseInt(session.metadata.credits);
        
        await supabase.from('user_credits').upsert({
            user_id: userId,
            credits: credits,
            purchased_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
        
    } else {
        // Handle subscription
        const planId = session.metadata.plan_id;
        const subscriptionId = session.subscription;
        
        // Get subscription details from Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        
        await supabase.from('user_subscriptions').upsert({
            user_id: userId,
            plan_id: planId,
            stripe_subscription_id: subscriptionId,
            status: 'active',
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            created_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
    }
    
    // Update checkout session status
    await supabase
        .from('stripe_checkout_sessions')
        .update({ status: 'completed' })
        .eq('session_id', session.id);
}

async function handlePaymentSucceeded(invoice) {
    const subscriptionId = invoice.subscription;
    if (!subscriptionId) return;
    
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata.user_id;
    
    await supabase
        .from('user_subscriptions')
        .update({
            status: 'active',
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
}

async function handlePaymentFailed(invoice) {
    const subscriptionId = invoice.subscription;
    if (!subscriptionId) return;
    
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata.user_id;
    
    await supabase
        .from('user_subscriptions')
        .update({
            status: 'past_due',
            updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
}

async function handleSubscriptionCreated(subscription) {
    const userId = subscription.metadata.user_id;
    const planId = subscription.metadata.plan_id;
    
    await supabase.from('user_subscriptions').upsert({
        user_id: userId,
        plan_id: planId,
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        created_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
}

async function handleSubscriptionUpdated(subscription) {
    const userId = subscription.metadata.user_id;
    
    await supabase
        .from('user_subscriptions')
        .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscription.id);
}

async function handleSubscriptionCancelled(subscription) {
    const userId = subscription.metadata.user_id;
    
    await supabase
        .from('user_subscriptions')
        .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscription.id);
}

module.exports = router;