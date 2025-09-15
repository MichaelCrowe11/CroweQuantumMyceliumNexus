-- QuantumMycelium Nexus Database Schema
-- Supabase PostgreSQL Schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    github_id BIGINT UNIQUE,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    avatar_url TEXT,
    provider VARCHAR(50) DEFAULT 'github',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    subscription_tier VARCHAR(50) DEFAULT 'free', -- free, pro, enterprise
    
    -- User preferences
    preferences JSONB DEFAULT '{
        "theme": "dark",
        "notifications": true,
        "public_profile": true,
        "default_circuit_visibility": "private"
    }'::jsonb
);

-- Quantum circuits table
CREATE TABLE circuits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    gates JSONB NOT NULL, -- Array of gate objects
    qubits INTEGER NOT NULL CHECK (qubits >= 1 AND qubits <= 50),
    public BOOLEAN DEFAULT FALSE,
    category VARCHAR(100) DEFAULT 'general', -- general, entanglement, algorithms, etc.
    tags TEXT[] DEFAULT '{}',
    
    -- Circuit metadata
    complexity_score FLOAT DEFAULT 0, -- Auto-calculated based on gates
    circuit_depth INTEGER DEFAULT 0, -- Auto-calculated
    gate_count INTEGER DEFAULT 0, -- Auto-calculated
    
    -- Usage statistics
    view_count INTEGER DEFAULT 0,
    fork_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Versioning
    version INTEGER DEFAULT 1,
    parent_circuit_id UUID REFERENCES circuits(id) ON DELETE SET NULL
);

-- Circuit likes/favorites
CREATE TABLE circuit_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    circuit_id UUID REFERENCES circuits(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, circuit_id)
);

-- Mycelium-EI programs table
CREATE TABLE mycelium_programs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    code TEXT NOT NULL,
    language_version VARCHAR(20) DEFAULT '1.0.0',
    public BOOLEAN DEFAULT FALSE,
    category VARCHAR(100) DEFAULT 'general',
    tags TEXT[] DEFAULT '{}',
    
    -- Program metadata
    network_count INTEGER DEFAULT 0,
    node_count INTEGER DEFAULT 0,
    quantum_function_count INTEGER DEFAULT 0,
    complexity VARCHAR(50) DEFAULT 'basic', -- basic, intermediate, advanced
    
    -- Usage statistics  
    view_count INTEGER DEFAULT 0,
    fork_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    
    -- Execution stats
    last_execution TIMESTAMPTZ,
    execution_count INTEGER DEFAULT 0,
    average_runtime FLOAT DEFAULT 0, -- milliseconds
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Versioning
    version INTEGER DEFAULT 1,
    parent_program_id UUID REFERENCES mycelium_programs(id) ON DELETE SET NULL
);

-- Program likes
CREATE TABLE program_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    program_id UUID REFERENCES mycelium_programs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, program_id)
);

-- Simulation sessions
CREATE TABLE simulation_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_type VARCHAR(50) NOT NULL, -- 'quantum_circuit', 'mycelium_network', 'hybrid'
    
    -- Input data
    input_data JSONB NOT NULL,
    
    -- Results
    results JSONB,
    status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed
    error_message TEXT,
    
    -- Performance metrics
    execution_time_ms INTEGER,
    memory_usage_mb FLOAT,
    quantum_operations_count INTEGER,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Session metadata
    client_info JSONB DEFAULT '{}'::jsonb -- browser, IP, etc.
);

-- User collections (for organizing circuits/programs)
CREATE TABLE collections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    public BOOLEAN DEFAULT FALSE,
    color VARCHAR(7) DEFAULT '#6366f1', -- hex color
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collection items (circuits or programs)
CREATE TABLE collection_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL, -- 'circuit' or 'program'
    item_id UUID NOT NULL, -- references circuits.id or mycelium_programs.id
    added_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure item exists in appropriate table (handled by application logic)
    UNIQUE(collection_id, item_type, item_id)
);

-- User activity/notifications
CREATE TABLE user_activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL, -- 'circuit_created', 'program_shared', etc.
    activity_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- For notification system
    read BOOLEAN DEFAULT FALSE,
    email_sent BOOLEAN DEFAULT FALSE
);

-- API usage tracking (for rate limiting and analytics)
CREATE TABLE api_usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_github_id ON users(github_id);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE INDEX idx_circuits_user_id ON circuits(user_id);
CREATE INDEX idx_circuits_public ON circuits(public);
CREATE INDEX idx_circuits_category ON circuits(category);
CREATE INDEX idx_circuits_created_at ON circuits(created_at);
CREATE INDEX idx_circuits_updated_at ON circuits(updated_at);
CREATE INDEX idx_circuits_tags ON circuits USING GIN(tags);

CREATE INDEX idx_mycelium_programs_user_id ON mycelium_programs(user_id);
CREATE INDEX idx_mycelium_programs_public ON mycelium_programs(public);
CREATE INDEX idx_mycelium_programs_category ON mycelium_programs(category);
CREATE INDEX idx_mycelium_programs_created_at ON mycelium_programs(created_at);
CREATE INDEX idx_mycelium_programs_tags ON mycelium_programs USING GIN(tags);

CREATE INDEX idx_simulation_sessions_user_id ON simulation_sessions(user_id);
CREATE INDEX idx_simulation_sessions_status ON simulation_sessions(status);
CREATE INDEX idx_simulation_sessions_created_at ON simulation_sessions(created_at);

CREATE INDEX idx_collections_user_id ON collections(user_id);
CREATE INDEX idx_collection_items_collection_id ON collection_items(collection_id);
CREATE INDEX idx_collection_items_type_id ON collection_items(item_type, item_id);

CREATE INDEX idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX idx_user_activities_read ON user_activities(read);
CREATE INDEX idx_user_activities_created_at ON user_activities(created_at);

CREATE INDEX idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX idx_api_usage_endpoint ON api_usage(endpoint);
CREATE INDEX idx_api_usage_created_at ON api_usage(created_at);

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE circuits ENABLE ROW LEVEL SECURITY;
ALTER TABLE circuit_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mycelium_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- User policies
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Circuit policies
CREATE POLICY "Anyone can view public circuits" ON circuits FOR SELECT USING (public = true);
CREATE POLICY "Users can view their own circuits" ON circuits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create circuits" ON circuits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own circuits" ON circuits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own circuits" ON circuits FOR DELETE USING (auth.uid() = user_id);

-- Similar policies for mycelium_programs
CREATE POLICY "Anyone can view public programs" ON mycelium_programs FOR SELECT USING (public = true);
CREATE POLICY "Users can view their own programs" ON mycelium_programs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create programs" ON mycelium_programs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own programs" ON mycelium_programs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own programs" ON mycelium_programs FOR DELETE USING (auth.uid() = user_id);

-- Collection policies
CREATE POLICY "Anyone can view public collections" ON collections FOR SELECT USING (public = true);
CREATE POLICY "Users can view their own collections" ON collections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create collections" ON collections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own collections" ON collections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own collections" ON collections FOR DELETE USING (auth.uid() = user_id);

-- Functions for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_circuits_updated_at BEFORE UPDATE ON circuits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mycelium_programs_updated_at BEFORE UPDATE ON mycelium_programs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate circuit complexity
CREATE OR REPLACE FUNCTION calculate_circuit_metrics()
RETURNS TRIGGER AS $$
DECLARE
    gate_array JSONB;
    gate_obj JSONB;
    max_position INTEGER := 0;
BEGIN
    -- Calculate gate count
    NEW.gate_count = jsonb_array_length(NEW.gates);
    
    -- Calculate circuit depth (simplified)
    FOR gate_obj IN SELECT * FROM jsonb_array_elements(NEW.gates)
    LOOP
        IF (gate_obj->>'position')::INTEGER > max_position THEN
            max_position := (gate_obj->>'position')::INTEGER;
        END IF;
    END LOOP;
    
    NEW.circuit_depth = max_position + 1;
    
    -- Calculate complexity score (basic formula)
    NEW.complexity_score = NEW.gate_count * 0.5 + NEW.circuit_depth * 0.3 + NEW.qubits * 0.2;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_circuit_metrics_trigger 
    BEFORE INSERT OR UPDATE ON circuits 
    FOR EACH ROW EXECUTE FUNCTION calculate_circuit_metrics();

-- Insert sample data
INSERT INTO users (id, username, email, name, github_id) VALUES 
    ('00000000-0000-0000-0000-000000000001', 'quantum_alice', 'alice@example.com', 'Alice Quantum', 12345),
    ('00000000-0000-0000-0000-000000000002', 'mycelium_bob', 'bob@example.com', 'Bob Networks', 12346);

-- Insert example circuits
INSERT INTO circuits (user_id, name, description, gates, qubits, public, category) VALUES 
    (
        '00000000-0000-0000-0000-000000000001', 
        'Bell State Example', 
        'Creates a quantum entangled Bell state',
        '[
            {"type": "H", "qubit": 0, "position": 0},
            {"type": "CNOT", "control": 0, "target": 1, "position": 1}
        ]'::jsonb,
        2,
        true,
        'entanglement'
    ),
    (
        '00000000-0000-0000-0000-000000000002', 
        'Superposition Demo', 
        'Demonstrates quantum superposition',
        '[
            {"type": "H", "qubit": 0, "position": 0},
            {"type": "H", "qubit": 1, "position": 0},
            {"type": "H", "qubit": 2, "position": 0}
        ]'::jsonb,
        3,
        true,
        'superposition'
    );

-- Insert example Mycelium-EI programs
INSERT INTO mycelium_programs (user_id, name, description, code, public, category) VALUES
    (
        '00000000-0000-0000-0000-000000000001',
        'Basic Network Growth',
        'Simple mycelial network with quantum-enhanced growth',
        'network SimpleGrowth {
    node origin = net.create("spore", [0.0, 0.0, 0.0]);
    
    quantum fn predict_growth(current: Node) -> [Connection] {
        let qubits = qc.allocate(2);
        qc.hadamard(qubits[0]);
        qc.cnot(qubits[0], qubits[1]);
        
        let results = qc.measure_all(qubits);
        return generate_connections(current, results);
    }
    
    simulate SimpleGrowth for 10.steps;
}',
        true,
        'networks'
    );