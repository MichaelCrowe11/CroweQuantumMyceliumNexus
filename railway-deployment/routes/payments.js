const express = require('express');
const { body, validationResult } = require('express-validator');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken } = require('./auth');
const crypto = require('crypto');
const router = express.Router();

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Coinbase Commerce Configuration
const COINBASE_COMMERCE_API_URL = 'https://api.commerce.coinbase.com';
const COINBASE_API_KEY = process.env.COINBASE_COMMERCE_API_KEY;
const COINBASE_WEBHOOK_SECRET = process.env.COINBASE_WEBHOOK_SECRET;

// Subscription Plans
const SUBSCRIPTION_PLANS = {
    free: {
        id: 'free',
        name: 'Free Tier',
        price: 0,
        currency: 'USD',
        features: [
            'Basic quantum circuit designer',
            'Limited Mycelium-EI programs (5/month)',
            'Community algorithm library access',
            'Basic documentation',
            'Public code sharing only'
        ],
        limits: {
            circuits_per_month: 50,
            programs_per_month: 5,
            qubits_max: 5,
            simulation_time_max: 60, // seconds
            api_calls_per_day: 100
        }
    },
    pro: {
        id: 'pro',
        name: 'Quantum Pro',
        price: 29,
        currency: 'USD',
        billing_period: 'monthly',
        features: [
            'Advanced quantum circuit designer',
            'Unlimited Mycelium-EI programs',
            'Premium algorithm library',
            'Priority support',
            'Private repositories',
            'Advanced analytics',
            'Export capabilities',
            'Collaboration tools'
        ],
        limits: {
            circuits_per_month: 1000,
            programs_per_month: -1, // unlimited
            qubits_max: 15,
            simulation_time_max: 300, // 5 minutes
            api_calls_per_day: 10000,
            storage_gb: 10
        }
    },
    enterprise: {
        id: 'enterprise',
        name: 'Quantum Enterprise',
        price: 199,
        currency: 'USD',
        billing_period: 'monthly',
        features: [
            'Everything in Pro',
            'Custom quantum algorithms',
            'Dedicated support team',
            'On-premises deployment options',
            'Custom integrations',
            'Advanced security features',
            'Team collaboration (up to 50 users)',
            'Custom branding',
            'SLA guarantees'
        ],
        limits: {
            circuits_per_month: -1, // unlimited
            programs_per_month: -1, // unlimited
            qubits_max: 50,
            simulation_time_max: 3600, // 1 hour
            api_calls_per_day: 100000,
            storage_gb: 100,
            team_members: 50
        }
    },
    lifetime: {
        id: 'lifetime',
        name: 'Quantum Lifetime',
        price: 999,
        currency: 'USD',
        billing_period: 'one_time',
        features: [
            'Lifetime access to all Pro features',
            'Forever updates and new algorithms',
            'Exclusive beta access',
            'Lifetime priority support',
            'Special community status',
            'Annual exclusive webinars',
            'Legacy protection guarantee'
        ],
        limits: {
            circuits_per_month: -1,
            programs_per_month: -1,
            qubits_max: 25,
            simulation_time_max: 600, // 10 minutes
            api_calls_per_day: 25000,
            storage_gb: 25
        }
    }
};

// Coinbase Commerce API helper
async function coinbaseRequest(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'X-CC-Api-Key': COINBASE_API_KEY,
            'X-CC-Version': '2018-03-22'
        }
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(`${COINBASE_COMMERCE_API_URL}${endpoint}`, options);
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Coinbase API error: ${error.error?.message || 'Unknown error'}`);
    }

    return await response.json();
}

/**
 * @swagger
 * /api/payments/plans:
 *   get:
 *     summary: Get available subscription plans
 *     responses:
 *       200:
 *         description: List of subscription plans with features and pricing
 */
router.get('/plans', (req, res) => {
    try {
        const plans = Object.values(SUBSCRIPTION_PLANS).map(plan => ({
            ...plan,
            recommended: plan.id === 'pro'
        }));

        res.json({
            success: true,
            plans,
            currencies: ['USD', 'BTC', 'ETH', 'LTC', 'BCH', 'USDC']
        });
    } catch (error) {
        console.error('Plans fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch subscription plans' });
    }
});

/**
 * @swagger
 * /api/payments/create-charge:
 *   post:
 *     summary: Create a payment charge for subscription
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               plan_id:
 *                 type: string
 *                 enum: [pro, enterprise, lifetime]
 *               billing_period:
 *                 type: string
 *                 enum: [monthly, annual]
 *               currency:
 *                 type: string
 *                 default: USD
 *     responses:
 *       200:
 *         description: Payment charge created successfully
 */
router.post('/create-charge', authenticateToken, [
    body('plan_id').isIn(['pro', 'enterprise', 'lifetime']),
    body('billing_period').optional().isIn(['monthly', 'annual']),
    body('currency').optional().isString()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { plan_id, billing_period = 'monthly', currency = 'USD' } = req.body;
        const userId = req.user.userId;

        // Get plan details
        const plan = SUBSCRIPTION_PLANS[plan_id];
        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        // Calculate price (annual discount of 20%)
        let finalPrice = plan.price;
        if (billing_period === 'annual' && plan.billing_period === 'monthly') {
            finalPrice = Math.round(plan.price * 12 * 0.8); // 20% annual discount
        }

        // Create charge with Coinbase Commerce
        const chargeData = {
            name: `${plan.name} Subscription`,
            description: `${plan.name} subscription for QuantumMycelium Nexus - ${billing_period} billing`,
            pricing_type: 'fixed_price',
            local_price: {
                amount: finalPrice.toString(),
                currency: currency
            },
            metadata: {
                user_id: userId,
                plan_id: plan_id,
                billing_period: billing_period,
                platform: 'quantummycelium_nexus'
            },
            redirect_url: `${process.env.FRONTEND_URL}/payment-success`,
            cancel_url: `${process.env.FRONTEND_URL}/pricing`
        };

        const charge = await coinbaseRequest('/charges', 'POST', chargeData);

        // Store charge information in database
        const { error: dbError } = await supabase
            .from('payment_charges')
            .insert({
                user_id: userId,
                charge_id: charge.data.id,
                plan_id: plan_id,
                billing_period: billing_period,
                amount: finalPrice,
                currency: currency,
                status: 'pending',
                charge_data: charge.data,
                created_at: new Date().toISOString()
            });

        if (dbError) {
            console.error('Database error storing charge:', dbError);
            // Continue anyway, charge was created successfully
        }

        res.json({
            success: true,
            charge: {
                id: charge.data.id,
                hosted_url: charge.data.hosted_url,
                amount: finalPrice,
                currency: currency,
                plan: plan.name,
                billing_period: billing_period
            }
        });

    } catch (error) {
        console.error('Charge creation error:', error);
        res.status(500).json({ 
            error: 'Failed to create payment charge',
            details: error.message 
        });
    }
});

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Coinbase Commerce webhook endpoint
 *     description: Handles payment status updates from Coinbase Commerce
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const signature = req.headers['x-cc-webhook-signature'];
        const payload = req.body;

        // Verify webhook signature
        if (!verifyWebhookSignature(payload, signature)) {
            return res.status(401).json({ error: 'Invalid webhook signature' });
        }

        const event = JSON.parse(payload.toString());
        
        console.log('Received webhook event:', event.type, event.data?.id);

        switch (event.type) {
            case 'charge:confirmed':
                await handleChargeConfirmed(event.data);
                break;
            case 'charge:failed':
                await handleChargeFailed(event.data);
                break;
            case 'charge:delayed':
                await handleChargeDelayed(event.data);
                break;
            case 'charge:pending':
                await handleChargePending(event.data);
                break;
            case 'charge:resolved':
                await handleChargeResolved(event.data);
                break;
            default:
                console.log('Unhandled webhook event type:', event.type);
        }

        res.status(200).json({ success: true });

    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

/**
 * @swagger
 * /api/payments/subscription-status:
 *   get:
 *     summary: Get user's current subscription status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current subscription information
 */
router.get('/subscription-status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Get user's current subscription
        const { data: subscription, error } = await supabase
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

        if (error && error.code !== 'PGRST116') { // Not found is OK
            console.error('Subscription fetch error:', error);
            return res.status(500).json({ error: 'Failed to fetch subscription status' });
        }

        const currentPlan = subscription ? 
            SUBSCRIPTION_PLANS[subscription.plan_id] : 
            SUBSCRIPTION_PLANS.free;

        // Get usage statistics
        const { data: usage } = await supabase
            .from('user_usage_stats')
            .select('*')
            .eq('user_id', userId)
            .gte('period_start', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
            .single();

        res.json({
            success: true,
            subscription: {
                plan_id: subscription?.plan_id || 'free',
                plan_name: currentPlan.name,
                status: subscription?.status || 'free',
                expires_at: subscription?.expires_at,
                billing_period: subscription?.billing_period,
                features: currentPlan.features,
                limits: currentPlan.limits
            },
            usage: usage || {
                circuits_created: 0,
                programs_created: 0,
                api_calls_today: 0,
                simulation_time_used: 0,
                storage_used_gb: 0
            }
        });

    } catch (error) {
        console.error('Subscription status error:', error);
        res.status(500).json({ error: 'Failed to get subscription status' });
    }
});

/**
 * @swagger
 * /api/payments/usage:
 *   get:
 *     summary: Get detailed usage statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Detailed usage information
 */
router.get('/usage', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Get current month's usage
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const [
            { data: monthlyUsage },
            { data: dailyUsage },
            { data: totalUsage }
        ] = await Promise.all([
            // Monthly usage
            supabase
                .from('user_usage_stats')
                .select('*')
                .eq('user_id', userId)
                .gte('period_start', startOfMonth.toISOString())
                .single(),
            
            // Daily usage
            supabase
                .from('user_usage_stats')
                .select('*')
                .eq('user_id', userId)
                .gte('period_start', startOfDay.toISOString())
                .single(),
            
            // All-time usage
            supabase
                .from('user_usage_stats')
                .select('circuits_created, programs_created, api_calls_total, simulation_time_total')
                .eq('user_id', userId)
        ]);

        res.json({
            success: true,
            usage: {
                monthly: monthlyUsage || {
                    circuits_created: 0,
                    programs_created: 0,
                    api_calls_total: 0,
                    simulation_time_used: 0
                },
                daily: dailyUsage || {
                    circuits_created: 0,
                    programs_created: 0,
                    api_calls_today: 0,
                    simulation_time_used: 0
                },
                lifetime: {
                    circuits_created: totalUsage?.reduce((sum, stat) => sum + (stat.circuits_created || 0), 0) || 0,
                    programs_created: totalUsage?.reduce((sum, stat) => sum + (stat.programs_created || 0), 0) || 0,
                    api_calls_total: totalUsage?.reduce((sum, stat) => sum + (stat.api_calls_total || 0), 0) || 0,
                    simulation_time_total: totalUsage?.reduce((sum, stat) => sum + (stat.simulation_time_total || 0), 0) || 0
                }
            }
        });

    } catch (error) {
        console.error('Usage fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch usage statistics' });
    }
});

// Webhook signature verification
function verifyWebhookSignature(payload, signature) {
    if (!COINBASE_WEBHOOK_SECRET || !signature) {
        return false;
    }

    const expectedSignature = crypto
        .createHmac('sha256', COINBASE_WEBHOOK_SECRET)
        .update(payload)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
    );
}

// Webhook event handlers
async function handleChargeConfirmed(charge) {
    try {
        const userId = charge.metadata?.user_id;
        const planId = charge.metadata?.plan_id;
        const billingPeriod = charge.metadata?.billing_period || 'monthly';

        if (!userId || !planId) {
            console.error('Missing metadata in charge:', charge.id);
            return;
        }

        // Calculate subscription end date
        const now = new Date();
        const expiresAt = new Date(now);
        
        if (planId === 'lifetime') {
            expiresAt.setFullYear(now.getFullYear() + 100); // Essentially never expires
        } else if (billingPeriod === 'annual') {
            expiresAt.setFullYear(now.getFullYear() + 1);
        } else {
            expiresAt.setMonth(now.getMonth() + 1);
        }

        // Update or create subscription
        const { error: subError } = await supabase
            .from('user_subscriptions')
            .upsert({
                user_id: userId,
                plan_id: planId,
                billing_period: billingPeriod,
                status: 'active',
                starts_at: now.toISOString(),
                expires_at: expiresAt.toISOString(),
                last_payment_at: now.toISOString(),
                charge_id: charge.id,
                updated_at: now.toISOString()
            }, {
                onConflict: 'user_id'
            });

        // Update charge status
        const { error: chargeError } = await supabase
            .from('payment_charges')
            .update({
                status: 'confirmed',
                confirmed_at: now.toISOString()
            })
            .eq('charge_id', charge.id);

        // Update user tier in users table
        const { error: userError } = await supabase
            .from('users')
            .update({
                subscription_tier: planId,
                updated_at: now.toISOString()
            })
            .eq('id', userId);

        if (subError || chargeError || userError) {
            console.error('Database errors:', { subError, chargeError, userError });
        } else {
            console.log(`Successfully activated ${planId} subscription for user ${userId}`);
        }

    } catch (error) {
        console.error('Error handling charge confirmation:', error);
    }
}

async function handleChargeFailed(charge) {
    try {
        const { error } = await supabase
            .from('payment_charges')
            .update({
                status: 'failed',
                failed_at: new Date().toISOString()
            })
            .eq('charge_id', charge.id);

        if (error) {
            console.error('Error updating failed charge:', error);
        }

    } catch (error) {
        console.error('Error handling charge failure:', error);
    }
}

async function handleChargeDelayed(charge) {
    try {
        const { error } = await supabase
            .from('payment_charges')
            .update({
                status: 'delayed',
                updated_at: new Date().toISOString()
            })
            .eq('charge_id', charge.id);

        if (error) {
            console.error('Error updating delayed charge:', error);
        }

    } catch (error) {
        console.error('Error handling charge delay:', error);
    }
}

async function handleChargePending(charge) {
    try {
        const { error } = await supabase
            .from('payment_charges')
            .update({
                status: 'pending',
                updated_at: new Date().toISOString()
            })
            .eq('charge_id', charge.id);

        if (error) {
            console.error('Error updating pending charge:', error);
        }

    } catch (error) {
        console.error('Error handling charge pending:', error);
    }
}

async function handleChargeResolved(charge) {
    // Similar to confirmed but for resolved payments
    await handleChargeConfirmed(charge);
}

module.exports = router;