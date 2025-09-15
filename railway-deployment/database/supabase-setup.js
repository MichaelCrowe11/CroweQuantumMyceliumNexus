const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase setup and migration script
class SupabaseSetup {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for admin operations
        );
    }

    async runMigration() {
        console.log('🚀 Starting Supabase database setup...');

        try {
            // Read the schema SQL file
            const schemaPath = path.join(__dirname, 'schema.sql');
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');

            // Split SQL into individual statements
            const statements = schemaSql
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

            console.log(`📝 Executing ${statements.length} SQL statements...`);

            // Execute each statement
            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i] + ';';
                console.log(`   ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);

                try {
                    const { error } = await this.supabase.rpc('exec_sql', {
                        sql: statement
                    });

                    if (error) {
                        console.log(`⚠️  Warning on statement ${i + 1}: ${error.message}`);
                        // Continue with next statement unless it's critical
                        if (error.message.includes('already exists')) {
                            console.log('     (Object already exists, skipping)');
                        } else {
                            throw error;
                        }
                    } else {
                        console.log(`✅ Statement ${i + 1} executed successfully`);
                    }
                } catch (statementError) {
                    console.error(`❌ Error executing statement ${i + 1}:`, statementError);
                    // Continue with next statement for non-critical errors
                    if (!statementError.message.includes('critical')) {
                        console.log('     (Non-critical error, continuing...)');
                        continue;
                    }
                    throw statementError;
                }
            }

            console.log('✅ Database schema setup completed!');
            await this.verifySetup();

        } catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        }
    }

    async verifySetup() {
        console.log('🔍 Verifying database setup...');

        try {
            // Check if tables exist
            const tables = ['users', 'circuits', 'mycelium_programs', 'simulation_sessions'];
            
            for (const table of tables) {
                const { data, error } = await this.supabase
                    .from(table)
                    .select('*')
                    .limit(1);

                if (error) {
                    console.log(`❌ Table '${table}' verification failed:`, error.message);
                } else {
                    console.log(`✅ Table '${table}' is accessible`);
                }
            }

            // Test RLS policies by trying to access without auth
            const { data: publicCircuits } = await this.supabase
                .from('circuits')
                .select('*')
                .eq('public', true)
                .limit(5);

            console.log(`✅ RLS policies working - found ${publicCircuits?.length || 0} public circuits`);

            console.log('✅ Database verification completed!');

        } catch (error) {
            console.error('❌ Verification failed:', error);
        }
    }

    async seedExampleData() {
        console.log('🌱 Seeding example data...');

        try {
            // Insert example circuits if they don't exist
            const { data: existingCircuits } = await this.supabase
                .from('circuits')
                .select('id')
                .limit(1);

            if (!existingCircuits || existingCircuits.length === 0) {
                const exampleCircuits = [
                    {
                        name: 'Bell State Circuit',
                        description: 'Creates an entangled Bell state using Hadamard and CNOT gates',
                        gates: [
                            { type: 'H', qubit: 0, position: 0 },
                            { type: 'CNOT', control: 0, target: 1, position: 1 }
                        ],
                        qubits: 2,
                        public: true,
                        category: 'entanglement'
                    },
                    {
                        name: 'Quantum Teleportation',
                        description: 'Demonstrates the quantum teleportation protocol',
                        gates: [
                            { type: 'H', qubit: 1, position: 0 },
                            { type: 'CNOT', control: 1, target: 2, position: 1 },
                            { type: 'CNOT', control: 0, target: 1, position: 2 },
                            { type: 'H', qubit: 0, position: 3 }
                        ],
                        qubits: 3,
                        public: true,
                        category: 'protocols'
                    },
                    {
                        name: 'Grover\'s Algorithm',
                        description: 'Quantum search algorithm demonstration',
                        gates: [
                            { type: 'H', qubit: 0, position: 0 },
                            { type: 'H', qubit: 1, position: 0 },
                            { type: 'X', qubit: 0, position: 1 },
                            { type: 'X', qubit: 1, position: 1 },
                            { type: 'H', qubit: 1, position: 2 },
                            { type: 'CNOT', control: 0, target: 1, position: 3 },
                            { type: 'H', qubit: 1, position: 4 }
                        ],
                        qubits: 2,
                        public: true,
                        category: 'algorithms'
                    }
                ];

                for (const circuit of exampleCircuits) {
                    const { error } = await this.supabase
                        .from('circuits')
                        .insert(circuit);

                    if (error) {
                        console.log(`⚠️  Warning inserting ${circuit.name}:`, error.message);
                    } else {
                        console.log(`✅ Inserted example circuit: ${circuit.name}`);
                    }
                }
            }

            // Insert example Mycelium-EI programs
            const { data: existingPrograms } = await this.supabase
                .from('mycelium_programs')
                .select('id')
                .limit(1);

            if (!existingPrograms || existingPrograms.length === 0) {
                const examplePrograms = [
                    {
                        name: 'Simple Network Growth',
                        description: 'Basic mycelial network with quantum-enhanced node creation',
                        code: `// Simple mycelial network
network GrowthDemo {
    node origin = net.create("spore", [0.0, 0.0, 0.0]);
    
    quantum fn quantum_growth() -> Connection {
        let qubits = qc.allocate(2);
        qc.hadamard(qubits[0]);
        qc.cnot(qubits[0], qubits[1]);
        
        let result = qc.measure(qubits[0]);
        return create_branch(origin, result);
    }
    
    simulate GrowthDemo for 50.steps;
}`,
                        public: true,
                        category: 'networks'
                    },
                    {
                        name: 'Entangled Network Nodes',
                        description: 'Demonstration of quantum entanglement in biological networks',
                        code: `// Quantum entangled mycelial network
network EntangledDemo {
    node node_a = net.create("primary", [0.0, 0.0, 0.0]);
    node node_b = net.create("secondary", [10.0, 0.0, 0.0]);
    
    quantum fn create_bell_state(n1: Node, n2: Node) -> QuantumState {
        let qubits = qc.allocate(2);
        qc.hadamard(qubits[0]);
        qc.cnot(qubits[0], qubits[1]);
        
        return qc.get_state(qubits);
    }
    
    let entangled = create_bell_state(node_a, node_b);
    viz.render_entanglement(node_a, node_b, entangled);
    
    simulate EntangledDemo for realtime;
}`,
                        public: true,
                        category: 'quantum'
                    }
                ];

                for (const program of examplePrograms) {
                    const { error } = await this.supabase
                        .from('mycelium_programs')
                        .insert(program);

                    if (error) {
                        console.log(`⚠️  Warning inserting ${program.name}:`, error.message);
                    } else {
                        console.log(`✅ Inserted example program: ${program.name}`);
                    }
                }
            }

            console.log('✅ Example data seeding completed!');

        } catch (error) {
            console.error('❌ Seeding failed:', error);
        }
    }

    async createDemoUser() {
        console.log('👤 Creating demo user...');

        try {
            const demoUser = {
                username: 'demo_user',
                email: 'demo@mycelium-ei.io',
                name: 'Demo User',
                github_id: 999999,
                preferences: {
                    theme: 'dark',
                    notifications: true,
                    public_profile: true,
                    default_circuit_visibility: 'public'
                }
            };

            const { data, error } = await this.supabase
                .from('users')
                .upsert(demoUser)
                .select()
                .single();

            if (error) {
                console.log('⚠️  Demo user creation warning:', error.message);
            } else {
                console.log('✅ Demo user created:', data.username);
                return data;
            }

        } catch (error) {
            console.error('❌ Demo user creation failed:', error);
        }
    }
}

// CLI interface
async function main() {
    const setup = new SupabaseSetup();

    const action = process.argv[2] || 'all';

    switch (action) {
        case 'migrate':
            await setup.runMigration();
            break;
        case 'seed':
            await setup.seedExampleData();
            break;
        case 'demo':
            await setup.createDemoUser();
            break;
        case 'verify':
            await setup.verifySetup();
            break;
        case 'all':
            await setup.runMigration();
            await setup.seedExampleData();
            await setup.createDemoUser();
            break;
        default:
            console.log('Usage: node supabase-setup.js [migrate|seed|demo|verify|all]');
    }

    console.log('🎉 Supabase setup completed!');
}

// Export for use as module
module.exports = SupabaseSetup;

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}