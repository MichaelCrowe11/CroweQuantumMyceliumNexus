-- Additional Payment-Related Tables for QuantumMycelium Nexus
-- Add these tables to the existing schema

-- Payment charges tracking
CREATE TABLE payment_charges (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    charge_id VARCHAR(255) UNIQUE NOT NULL, -- Coinbase Commerce charge ID
    plan_id VARCHAR(50) NOT NULL,
    billing_period VARCHAR(20) DEFAULT 'monthly', -- monthly, annual, one_time
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, failed, delayed, expired
    charge_data JSONB, -- Full charge data from Coinbase
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User subscriptions
CREATE TABLE user_subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    plan_id VARCHAR(50) NOT NULL, -- free, pro, enterprise, lifetime
    billing_period VARCHAR(20), -- monthly, annual, one_time
    status VARCHAR(50) DEFAULT 'active', -- active, expired, cancelled, suspended
    
    -- Subscription period
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    -- Payment tracking
    last_payment_at TIMESTAMPTZ,
    next_billing_at TIMESTAMPTZ,
    charge_id VARCHAR(255), -- Last successful charge ID
    
    -- Auto-renewal
    auto_renew BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_plan_id CHECK (plan_id IN ('free', 'pro', 'enterprise', 'lifetime')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'expired', 'cancelled', 'suspended')),
    CONSTRAINT valid_billing_period CHECK (billing_period IN ('monthly', 'annual', 'one_time') OR billing_period IS NULL)
);

-- User usage statistics (for rate limiting and billing)
CREATE TABLE user_usage_stats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Time period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    period_type VARCHAR(20) DEFAULT 'monthly', -- daily, weekly, monthly
    
    -- Usage metrics
    circuits_created INTEGER DEFAULT 0,
    programs_created INTEGER DEFAULT 0,
    simulations_run INTEGER DEFAULT 0,
    api_calls_total INTEGER DEFAULT 0,
    api_calls_today INTEGER DEFAULT 0,
    
    -- Resource usage
    simulation_time_used INTEGER DEFAULT 0, -- seconds
    simulation_time_total INTEGER DEFAULT 0, -- lifetime seconds
    storage_used_gb DECIMAL(10,3) DEFAULT 0,
    qubits_max_used INTEGER DEFAULT 0,
    
    -- Social metrics
    shares_created INTEGER DEFAULT 0,
    views_received INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint for user + period
    UNIQUE(user_id, period_start, period_type)
);

-- Payment transactions log
CREATE TABLE payment_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id),
    charge_id VARCHAR(255), -- Coinbase Commerce charge ID
    
    -- Transaction details
    transaction_type VARCHAR(50) NOT NULL, -- subscription, upgrade, downgrade, refund
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending',
    
    -- Payment method info
    payment_method VARCHAR(50), -- bitcoin, ethereum, litecoin, etc.
    blockchain_hash VARCHAR(255),
    confirmation_count INTEGER DEFAULT 0,
    
    -- Metadata
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription plan history (for tracking plan changes)
CREATE TABLE subscription_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id),
    
    -- Plan change details
    previous_plan_id VARCHAR(50),
    new_plan_id VARCHAR(50) NOT NULL,
    change_type VARCHAR(50) NOT NULL, -- upgrade, downgrade, new, cancel, renew
    change_reason VARCHAR(100), -- user_request, payment_failed, admin_action, etc.
    
    -- Financial impact
    prorated_amount DECIMAL(10,2),
    prorated_currency VARCHAR(10),
    
    -- Metadata
    notes TEXT,
    admin_user_id UUID, -- If changed by admin
    
    -- Timestamps
    effective_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promotional codes and discounts
CREATE TABLE promo_codes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    
    -- Discount details
    discount_type VARCHAR(20) NOT NULL, -- percentage, fixed_amount, free_months
    discount_value DECIMAL(10,2) NOT NULL,
    discount_currency VARCHAR(10) DEFAULT 'USD',
    
    -- Applicable plans
    applicable_plans TEXT[] DEFAULT '{"pro","enterprise"}', -- Array of plan IDs
    
    -- Usage limits
    max_uses INTEGER, -- NULL for unlimited
    max_uses_per_user INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    
    -- Validity period
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promo code usage tracking
CREATE TABLE promo_code_usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    promo_code_id UUID REFERENCES promo_codes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    charge_id VARCHAR(255), -- Coinbase charge that used this code
    
    -- Usage details
    discount_applied DECIMAL(10,2) NOT NULL,
    original_amount DECIMAL(10,2) NOT NULL,
    final_amount DECIMAL(10,2) NOT NULL,
    
    -- Timestamps
    used_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(promo_code_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_payment_charges_user_id ON payment_charges(user_id);
CREATE INDEX idx_payment_charges_charge_id ON payment_charges(charge_id);
CREATE INDEX idx_payment_charges_status ON payment_charges(status);
CREATE INDEX idx_payment_charges_created_at ON payment_charges(created_at);

CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_plan_id ON user_subscriptions(plan_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_expires_at ON user_subscriptions(expires_at);

CREATE INDEX idx_user_usage_stats_user_id ON user_usage_stats(user_id);
CREATE INDEX idx_user_usage_stats_period ON user_usage_stats(period_start, period_type);
CREATE INDEX idx_user_usage_stats_created_at ON user_usage_stats(created_at);

CREATE INDEX idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_charge_id ON payment_transactions(charge_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);

CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_codes_active ON promo_codes(is_active);
CREATE INDEX idx_promo_codes_validity ON promo_codes(valid_from, valid_until);

-- Row Level Security (RLS) Policies for payment tables
ALTER TABLE payment_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Payment charges policies
CREATE POLICY "Users can view their own charges" ON payment_charges FOR SELECT USING (auth.uid() = user_id);

-- Subscription policies
CREATE POLICY "Users can view their own subscription" ON user_subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Usage stats policies
CREATE POLICY "Users can view their own usage stats" ON user_usage_stats FOR SELECT USING (auth.uid() = user_id);

-- Transaction policies
CREATE POLICY "Users can view their own transactions" ON payment_transactions FOR SELECT USING (auth.uid() = user_id);

-- Subscription history policies
CREATE POLICY "Users can view their own subscription history" ON subscription_history FOR SELECT USING (auth.uid() = user_id);

-- Functions for automatic updates
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_subscriptions_updated_at 
    BEFORE UPDATE ON user_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_subscription_updated_at();

CREATE TRIGGER update_payment_charges_updated_at 
    BEFORE UPDATE ON payment_charges 
    FOR EACH ROW EXECUTE FUNCTION update_subscription_updated_at();

CREATE TRIGGER update_user_usage_stats_updated_at 
    BEFORE UPDATE ON user_usage_stats 
    FOR EACH ROW EXECUTE FUNCTION update_subscription_updated_at();

-- Function to automatically update usage stats
CREATE OR REPLACE FUNCTION increment_usage_stat(
    p_user_id UUID,
    p_stat_type VARCHAR,
    p_increment INTEGER DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
    current_period_start TIMESTAMPTZ;
    current_period_end TIMESTAMPTZ;
BEGIN
    -- Calculate current monthly period
    current_period_start := DATE_TRUNC('month', NOW());
    current_period_end := current_period_start + INTERVAL '1 month';
    
    -- Insert or update usage stats
    INSERT INTO user_usage_stats (
        user_id, 
        period_start, 
        period_end, 
        period_type
    ) VALUES (
        p_user_id,
        current_period_start,
        current_period_end,
        'monthly'
    )
    ON CONFLICT (user_id, period_start, period_type) 
    DO NOTHING;
    
    -- Update specific stat
    CASE p_stat_type
        WHEN 'circuits_created' THEN
            UPDATE user_usage_stats 
            SET circuits_created = circuits_created + p_increment,
                updated_at = NOW()
            WHERE user_id = p_user_id 
            AND period_start = current_period_start 
            AND period_type = 'monthly';
            
        WHEN 'programs_created' THEN
            UPDATE user_usage_stats 
            SET programs_created = programs_created + p_increment,
                updated_at = NOW()
            WHERE user_id = p_user_id 
            AND period_start = current_period_start 
            AND period_type = 'monthly';
            
        WHEN 'api_calls' THEN
            UPDATE user_usage_stats 
            SET api_calls_total = api_calls_total + p_increment,
                api_calls_today = CASE 
                    WHEN DATE(updated_at) = CURRENT_DATE THEN api_calls_today + p_increment
                    ELSE p_increment
                END,
                updated_at = NOW()
            WHERE user_id = p_user_id 
            AND period_start = current_period_start 
            AND period_type = 'monthly';
            
        WHEN 'simulations_run' THEN
            UPDATE user_usage_stats 
            SET simulations_run = simulations_run + p_increment,
                updated_at = NOW()
            WHERE user_id = p_user_id 
            AND period_start = current_period_start 
            AND period_type = 'monthly';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Insert some sample promo codes
INSERT INTO promo_codes (code, description, discount_type, discount_value, applicable_plans, max_uses, valid_until) VALUES
    ('QUANTUM50', 'Launch Special - 50% off first month', 'percentage', 50.00, '{"pro","enterprise"}', 1000, NOW() + INTERVAL '3 months'),
    ('LIFETIME20', '20% off Lifetime Plan', 'percentage', 20.00, '{"lifetime"}', 500, NOW() + INTERVAL '6 months'),
    ('STUDENT', 'Student discount - $10 off', 'fixed_amount', 10.00, '{"pro"}', NULL, NOW() + INTERVAL '1 year'),
    ('FREEMONTH', 'Free month trial', 'free_months', 1.00, '{"pro"}', 2000, NOW() + INTERVAL '2 months');