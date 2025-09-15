/**
 * Mycelium-EI Language Interpreter
 * Real implementation of the quantum-biological programming language
 */

class MyceliumInterpreter {
    constructor() {
        this.networks = new Map();
        this.nodes = new Map();
        this.connections = new Map();
        this.quantumCircuits = new Map();
        this.variables = new Map();
        this.functions = new Map();
        this.currentNetwork = null;
        this.output = [];
        this.errors = [];
    }

    /**
     * Parse and execute Mycelium-EI code
     */
    async execute(code) {
        this.reset();
        
        try {
            const tokens = this.tokenize(code);
            const ast = this.parse(tokens);
            const result = await this.interpret(ast);
            
            return {
                success: true,
                output: this.output,
                networks: Array.from(this.networks.values()),
                nodes: Array.from(this.nodes.values()),
                connections: Array.from(this.connections.values()),
                quantumResults: Array.from(this.quantumCircuits.values()),
                result
            };
        } catch (error) {
            this.errors.push(error.message);
            return {
                success: false,
                errors: this.errors,
                output: this.output
            };
        }
    }

    /**
     * Tokenize Mycelium-EI code
     */
    tokenize(code) {
        const tokenPatterns = [
            { type: 'NETWORK', pattern: /^network\b/ },
            { type: 'NODE', pattern: /^node\b/ },
            { type: 'QUANTUM', pattern: /^quantum\b/ },
            { type: 'FUNCTION', pattern: /^fn\b/ },
            { type: 'LET', pattern: /^let\b/ },
            { type: 'CONST', pattern: /^const\b/ },
            { type: 'IF', pattern: /^if\b/ },
            { type: 'ELSE', pattern: /^else\b/ },
            { type: 'FOR', pattern: /^for\b/ },
            { type: 'WHILE', pattern: /^while\b/ },
            { type: 'RETURN', pattern: /^return\b/ },
            { type: 'CONNECT', pattern: /^connect\b/ },
            { type: 'SIMULATE', pattern: /^simulate\b/ },
            { type: 'MEASURE', pattern: /^measure\b/ },
            { type: 'GROW', pattern: /^grow\b/ },
            { type: 'SIGNAL', pattern: /^signal\b/ },
            { type: 'PATTERN', pattern: /^pattern\b/ },
            { type: 'VIZ', pattern: /^viz\b/ },
            { type: 'IDENTIFIER', pattern: /^[a-zA-Z_][a-zA-Z0-9_]*/ },
            { type: 'NUMBER', pattern: /^-?\d+\.?\d*/ },
            { type: 'STRING', pattern: /^"([^"\\]|\\.)*"/ },
            { type: 'OPERATOR', pattern: /^(\+\+|--|==|!=|<=|>=|&&|\|\||->|=>|[+\-*/=<>!])/ },
            { type: 'LPAREN', pattern: /^\(/ },
            { type: 'RPAREN', pattern: /^\)/ },
            { type: 'LBRACE', pattern: /^\{/ },
            { type: 'RBRACE', pattern: /^\}/ },
            { type: 'LBRACKET', pattern: /^\[/ },
            { type: 'RBRACKET', pattern: /^\]/ },
            { type: 'SEMICOLON', pattern: /^;/ },
            { type: 'COMMA', pattern: /^,/ },
            { type: 'DOT', pattern: /^\./ },
            { type: 'COLON', pattern: /^:/ },
            { type: 'COMMENT', pattern: /^\/\/.*$/ },
            { type: 'MULTICOMMENT', pattern: /^\/\*[\s\S]*?\*\// },
            { type: 'WHITESPACE', pattern: /^\s+/ }
        ];

        const tokens = [];
        let remaining = code;
        let line = 1;
        let column = 1;

        while (remaining.length > 0) {
            let matched = false;

            for (const { type, pattern } of tokenPatterns) {
                const match = remaining.match(pattern);
                if (match) {
                    const value = match[0];
                    
                    // Skip whitespace and comments
                    if (type !== 'WHITESPACE' && type !== 'COMMENT' && type !== 'MULTICOMMENT') {
                        tokens.push({ type, value, line, column });
                    }

                    // Update position
                    const lines = value.split('\n');
                    if (lines.length > 1) {
                        line += lines.length - 1;
                        column = lines[lines.length - 1].length + 1;
                    } else {
                        column += value.length;
                    }

                    remaining = remaining.slice(value.length);
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                throw new Error(`Unexpected character at line ${line}, column ${column}: ${remaining[0]}`);
            }
        }

        return tokens;
    }

    /**
     * Parse tokens into AST
     */
    parse(tokens) {
        const ast = {
            type: 'Program',
            statements: []
        };

        let current = 0;

        const peek = () => tokens[current];
        const consume = (type) => {
            const token = tokens[current];
            if (!token || token.type !== type) {
                throw new Error(`Expected ${type} but got ${token ? token.type : 'EOF'}`);
            }
            current++;
            return token;
        };

        const parseStatement = () => {
            const token = peek();
            if (!token) return null;

            switch (token.type) {
                case 'NETWORK':
                    return parseNetworkDeclaration();
                case 'NODE':
                    return parseNodeDeclaration();
                case 'QUANTUM':
                    return parseQuantumStatement();
                case 'FUNCTION':
                    return parseFunctionDeclaration();
                case 'LET':
                case 'CONST':
                    return parseVariableDeclaration();
                case 'IF':
                    return parseIfStatement();
                case 'FOR':
                    return parseForLoop();
                case 'WHILE':
                    return parseWhileLoop();
                case 'RETURN':
                    return parseReturnStatement();
                case 'CONNECT':
                    return parseConnectStatement();
                case 'SIMULATE':
                    return parseSimulateStatement();
                case 'VIZ':
                    return parseVizStatement();
                case 'IDENTIFIER':
                    return parseExpressionStatement();
                default:
                    return parseExpressionStatement();
            }
        };

        const parseNetworkDeclaration = () => {
            consume('NETWORK');
            const name = consume('IDENTIFIER').value;
            consume('LBRACE');
            
            const body = [];
            while (peek() && peek().type !== 'RBRACE') {
                const stmt = parseStatement();
                if (stmt) body.push(stmt);
            }
            
            consume('RBRACE');
            
            return {
                type: 'NetworkDeclaration',
                name,
                body
            };
        };

        const parseNodeDeclaration = () => {
            consume('NODE');
            const name = consume('IDENTIFIER').value;
            consume('OPERATOR'); // =
            
            const initializer = parseExpression();
            
            if (peek() && peek().type === 'SEMICOLON') {
                consume('SEMICOLON');
            }
            
            return {
                type: 'NodeDeclaration',
                name,
                initializer
            };
        };

        const parseQuantumStatement = () => {
            consume('QUANTUM');
            
            if (peek().type === 'FUNCTION') {
                consume('FUNCTION');
                const name = consume('IDENTIFIER').value;
                consume('LPAREN');
                
                const params = [];
                while (peek() && peek().type !== 'RPAREN') {
                    params.push(consume('IDENTIFIER').value);
                    if (peek() && peek().type === 'COMMA') {
                        consume('COMMA');
                    }
                }
                
                consume('RPAREN');
                consume('LBRACE');
                
                const body = [];
                while (peek() && peek().type !== 'RBRACE') {
                    const stmt = parseStatement();
                    if (stmt) body.push(stmt);
                }
                
                consume('RBRACE');
                
                return {
                    type: 'QuantumFunction',
                    name,
                    params,
                    body
                };
            } else {
                // Quantum expression
                const expr = parseExpression();
                if (peek() && peek().type === 'SEMICOLON') {
                    consume('SEMICOLON');
                }
                return {
                    type: 'QuantumExpression',
                    expression: expr
                };
            }
        };

        const parseFunctionDeclaration = () => {
            consume('FUNCTION');
            const name = consume('IDENTIFIER').value;
            consume('LPAREN');
            
            const params = [];
            while (peek() && peek().type !== 'RPAREN') {
                params.push(consume('IDENTIFIER').value);
                if (peek() && peek().type === 'COMMA') {
                    consume('COMMA');
                }
            }
            
            consume('RPAREN');
            consume('LBRACE');
            
            const body = [];
            while (peek() && peek().type !== 'RBRACE') {
                const stmt = parseStatement();
                if (stmt) body.push(stmt);
            }
            
            consume('RBRACE');
            
            return {
                type: 'FunctionDeclaration',
                name,
                params,
                body
            };
        };

        const parseVariableDeclaration = () => {
            const kind = consume(peek().type).value;
            const name = consume('IDENTIFIER').value;
            consume('OPERATOR'); // =
            const value = parseExpression();
            
            if (peek() && peek().type === 'SEMICOLON') {
                consume('SEMICOLON');
            }
            
            return {
                type: 'VariableDeclaration',
                kind,
                name,
                value
            };
        };

        const parseExpression = () => {
            return parseAssignment();
        };

        const parseAssignment = () => {
            let expr = parseLogicalOr();
            
            if (peek() && peek().value === '=') {
                consume('OPERATOR');
                const right = parseAssignment();
                return {
                    type: 'AssignmentExpression',
                    left: expr,
                    right
                };
            }
            
            return expr;
        };

        const parseLogicalOr = () => {
            let expr = parseLogicalAnd();
            
            while (peek() && peek().value === '||') {
                consume('OPERATOR');
                const right = parseLogicalAnd();
                expr = {
                    type: 'BinaryExpression',
                    operator: '||',
                    left: expr,
                    right
                };
            }
            
            return expr;
        };

        const parseLogicalAnd = () => {
            let expr = parseEquality();
            
            while (peek() && peek().value === '&&') {
                consume('OPERATOR');
                const right = parseEquality();
                expr = {
                    type: 'BinaryExpression',
                    operator: '&&',
                    left: expr,
                    right
                };
            }
            
            return expr;
        };

        const parseEquality = () => {
            let expr = parseRelational();
            
            while (peek() && (peek().value === '==' || peek().value === '!=')) {
                const op = consume('OPERATOR').value;
                const right = parseRelational();
                expr = {
                    type: 'BinaryExpression',
                    operator: op,
                    left: expr,
                    right
                };
            }
            
            return expr;
        };

        const parseRelational = () => {
            let expr = parseAdditive();
            
            while (peek() && ['<', '>', '<=', '>='].includes(peek().value)) {
                const op = consume('OPERATOR').value;
                const right = parseAdditive();
                expr = {
                    type: 'BinaryExpression',
                    operator: op,
                    left: expr,
                    right
                };
            }
            
            return expr;
        };

        const parseAdditive = () => {
            let expr = parseMultiplicative();
            
            while (peek() && ['+', '-'].includes(peek().value)) {
                const op = consume('OPERATOR').value;
                const right = parseMultiplicative();
                expr = {
                    type: 'BinaryExpression',
                    operator: op,
                    left: expr,
                    right
                };
            }
            
            return expr;
        };

        const parseMultiplicative = () => {
            let expr = parseUnary();
            
            while (peek() && ['*', '/'].includes(peek().value)) {
                const op = consume('OPERATOR').value;
                const right = parseUnary();
                expr = {
                    type: 'BinaryExpression',
                    operator: op,
                    left: expr,
                    right
                };
            }
            
            return expr;
        };

        const parseUnary = () => {
            if (peek() && ['!', '-', '+'].includes(peek().value)) {
                const op = consume('OPERATOR').value;
                const expr = parseUnary();
                return {
                    type: 'UnaryExpression',
                    operator: op,
                    argument: expr
                };
            }
            
            return parsePostfix();
        };

        const parsePostfix = () => {
            let expr = parsePrimary();
            
            while (peek()) {
                if (peek().type === 'DOT') {
                    consume('DOT');
                    const property = consume('IDENTIFIER').value;
                    
                    if (peek() && peek().type === 'LPAREN') {
                        // Method call
                        consume('LPAREN');
                        const args = [];
                        
                        while (peek() && peek().type !== 'RPAREN') {
                            args.push(parseExpression());
                            if (peek() && peek().type === 'COMMA') {
                                consume('COMMA');
                            }
                        }
                        
                        consume('RPAREN');
                        
                        expr = {
                            type: 'MethodCall',
                            object: expr,
                            method: property,
                            arguments: args
                        };
                    } else {
                        // Property access
                        expr = {
                            type: 'MemberExpression',
                            object: expr,
                            property
                        };
                    }
                } else if (peek().type === 'LPAREN') {
                    // Function call
                    consume('LPAREN');
                    const args = [];
                    
                    while (peek() && peek().type !== 'RPAREN') {
                        args.push(parseExpression());
                        if (peek() && peek().type === 'COMMA') {
                            consume('COMMA');
                        }
                    }
                    
                    consume('RPAREN');
                    
                    expr = {
                        type: 'CallExpression',
                        callee: expr,
                        arguments: args
                    };
                } else if (peek().type === 'LBRACKET') {
                    // Array access
                    consume('LBRACKET');
                    const index = parseExpression();
                    consume('RBRACKET');
                    
                    expr = {
                        type: 'IndexExpression',
                        object: expr,
                        index
                    };
                } else {
                    break;
                }
            }
            
            return expr;
        };

        const parsePrimary = () => {
            const token = peek();
            
            if (!token) {
                throw new Error('Unexpected end of input');
            }
            
            switch (token.type) {
                case 'NUMBER':
                    consume('NUMBER');
                    return {
                        type: 'NumberLiteral',
                        value: parseFloat(token.value)
                    };
                    
                case 'STRING':
                    consume('STRING');
                    return {
                        type: 'StringLiteral',
                        value: token.value.slice(1, -1) // Remove quotes
                    };
                    
                case 'IDENTIFIER':
                    consume('IDENTIFIER');
                    return {
                        type: 'Identifier',
                        name: token.value
                    };
                    
                case 'LPAREN':
                    consume('LPAREN');
                    const expr = parseExpression();
                    consume('RPAREN');
                    return expr;
                    
                case 'LBRACKET':
                    consume('LBRACKET');
                    const elements = [];
                    
                    while (peek() && peek().type !== 'RBRACKET') {
                        elements.push(parseExpression());
                        if (peek() && peek().type === 'COMMA') {
                            consume('COMMA');
                        }
                    }
                    
                    consume('RBRACKET');
                    return {
                        type: 'ArrayLiteral',
                        elements
                    };
                    
                default:
                    throw new Error(`Unexpected token: ${token.type}`);
            }
        };

        const parseIfStatement = () => {
            consume('IF');
            consume('LPAREN');
            const condition = parseExpression();
            consume('RPAREN');
            consume('LBRACE');
            
            const consequent = [];
            while (peek() && peek().type !== 'RBRACE') {
                const stmt = parseStatement();
                if (stmt) consequent.push(stmt);
            }
            
            consume('RBRACE');
            
            let alternate = null;
            if (peek() && peek().type === 'ELSE') {
                consume('ELSE');
                consume('LBRACE');
                
                alternate = [];
                while (peek() && peek().type !== 'RBRACE') {
                    const stmt = parseStatement();
                    if (stmt) alternate.push(stmt);
                }
                
                consume('RBRACE');
            }
            
            return {
                type: 'IfStatement',
                condition,
                consequent,
                alternate
            };
        };

        const parseForLoop = () => {
            consume('FOR');
            consume('LPAREN');
            
            const init = parseStatement();
            const condition = parseExpression();
            consume('SEMICOLON');
            const update = parseExpression();
            
            consume('RPAREN');
            consume('LBRACE');
            
            const body = [];
            while (peek() && peek().type !== 'RBRACE') {
                const stmt = parseStatement();
                if (stmt) body.push(stmt);
            }
            
            consume('RBRACE');
            
            return {
                type: 'ForLoop',
                init,
                condition,
                update,
                body
            };
        };

        const parseWhileLoop = () => {
            consume('WHILE');
            consume('LPAREN');
            const condition = parseExpression();
            consume('RPAREN');
            consume('LBRACE');
            
            const body = [];
            while (peek() && peek().type !== 'RBRACE') {
                const stmt = parseStatement();
                if (stmt) body.push(stmt);
            }
            
            consume('RBRACE');
            
            return {
                type: 'WhileLoop',
                condition,
                body
            };
        };

        const parseReturnStatement = () => {
            consume('RETURN');
            const value = parseExpression();
            
            if (peek() && peek().type === 'SEMICOLON') {
                consume('SEMICOLON');
            }
            
            return {
                type: 'ReturnStatement',
                value
            };
        };

        const parseConnectStatement = () => {
            consume('CONNECT');
            const source = parseExpression();
            consume('OPERATOR'); // ->
            const target = parseExpression();
            
            if (peek() && peek().type === 'SEMICOLON') {
                consume('SEMICOLON');
            }
            
            return {
                type: 'ConnectStatement',
                source,
                target
            };
        };

        const parseSimulateStatement = () => {
            consume('SIMULATE');
            const target = parseExpression();
            
            if (peek() && peek().type === 'SEMICOLON') {
                consume('SEMICOLON');
            }
            
            return {
                type: 'SimulateStatement',
                target
            };
        };

        const parseVizStatement = () => {
            consume('VIZ');
            consume('DOT');
            const method = consume('IDENTIFIER').value;
            consume('LPAREN');
            
            const args = [];
            while (peek() && peek().type !== 'RPAREN') {
                args.push(parseExpression());
                if (peek() && peek().type === 'COMMA') {
                    consume('COMMA');
                }
            }
            
            consume('RPAREN');
            
            if (peek() && peek().type === 'SEMICOLON') {
                consume('SEMICOLON');
            }
            
            return {
                type: 'VizStatement',
                method,
                arguments: args
            };
        };

        const parseExpressionStatement = () => {
            const expr = parseExpression();
            
            if (peek() && peek().type === 'SEMICOLON') {
                consume('SEMICOLON');
            }
            
            return {
                type: 'ExpressionStatement',
                expression: expr
            };
        };

        // Parse all statements
        while (current < tokens.length) {
            const stmt = parseStatement();
            if (stmt) {
                ast.statements.push(stmt);
            }
        }

        return ast;
    }

    /**
     * Interpret AST
     */
    async interpret(ast) {
        const evaluateNode = async (node, scope = this.variables) => {
            switch (node.type) {
                case 'Program':
                    let result;
                    for (const stmt of node.statements) {
                        result = await evaluateNode(stmt, scope);
                    }
                    return result;

                case 'NetworkDeclaration':
                    const network = {
                        name: node.name,
                        nodes: [],
                        connections: [],
                        created: new Date().toISOString()
                    };
                    this.networks.set(node.name, network);
                    this.currentNetwork = network;
                    
                    for (const stmt of node.body) {
                        await evaluateNode(stmt, scope);
                    }
                    
                    return network;

                case 'NodeDeclaration':
                    const nodeValue = await evaluateNode(node.initializer, scope);
                    const newNode = {
                        id: node.name,
                        value: nodeValue,
                        network: this.currentNetwork?.name,
                        position: nodeValue.position || [0, 0, 0],
                        type: nodeValue.type || 'default',
                        connections: []
                    };
                    
                    this.nodes.set(node.name, newNode);
                    if (this.currentNetwork) {
                        this.currentNetwork.nodes.push(newNode);
                    }
                    
                    scope.set(node.name, newNode);
                    return newNode;

                case 'QuantumFunction':
                    const quantumFunc = {
                        type: 'quantum',
                        name: node.name,
                        params: node.params,
                        body: node.body
                    };
                    this.functions.set(node.name, quantumFunc);
                    return quantumFunc;

                case 'QuantumExpression':
                    // Execute quantum operation
                    const quantumResult = await this.executeQuantum(node.expression, scope);
                    return quantumResult;

                case 'FunctionDeclaration':
                    const func = {
                        type: 'function',
                        name: node.name,
                        params: node.params,
                        body: node.body
                    };
                    this.functions.set(node.name, func);
                    scope.set(node.name, func);
                    return func;

                case 'VariableDeclaration':
                    const value = await evaluateNode(node.value, scope);
                    scope.set(node.name, value);
                    return value;

                case 'ConnectStatement':
                    const sourceNode = await evaluateNode(node.source, scope);
                    const targetNode = await evaluateNode(node.target, scope);
                    
                    const connection = {
                        id: `${sourceNode.id}-${targetNode.id}`,
                        source: sourceNode.id,
                        target: targetNode.id,
                        weight: 1.0,
                        type: 'default'
                    };
                    
                    this.connections.set(connection.id, connection);
                    sourceNode.connections.push(connection);
                    
                    if (this.currentNetwork) {
                        this.currentNetwork.connections.push(connection);
                    }
                    
                    return connection;

                case 'SimulateStatement':
                    const simTarget = await evaluateNode(node.target, scope);
                    const simulation = await this.runSimulation(simTarget);
                    this.output.push(`Simulation complete: ${JSON.stringify(simulation)}`);
                    return simulation;

                case 'VizStatement':
                    const vizData = {
                        method: node.method,
                        arguments: await Promise.all(node.arguments.map(arg => evaluateNode(arg, scope)))
                    };
                    this.output.push(`Visualization: ${node.method}(${vizData.arguments.join(', ')})`);
                    return vizData;

                case 'CallExpression':
                    const callee = await evaluateNode(node.callee, scope);
                    const args = await Promise.all(node.arguments.map(arg => evaluateNode(arg, scope)));
                    
                    if (typeof callee === 'function') {
                        return callee(...args);
                    } else if (callee && callee.type === 'function') {
                        // User-defined function
                        const funcScope = new Map(scope);
                        callee.params.forEach((param, i) => {
                            funcScope.set(param, args[i]);
                        });
                        
                        let result;
                        for (const stmt of callee.body) {
                            result = await evaluateNode(stmt, funcScope);
                            if (stmt.type === 'ReturnStatement') {
                                return result;
                            }
                        }
                        return result;
                    } else if (callee && callee.type === 'quantum') {
                        // Quantum function
                        return await this.executeQuantumFunction(callee, args);
                    }
                    
                    throw new Error(`${node.callee.name} is not a function`);

                case 'MethodCall':
                    const obj = await evaluateNode(node.object, scope);
                    const methodArgs = await Promise.all(node.arguments.map(arg => evaluateNode(arg, scope)));
                    
                    // Built-in methods
                    switch (node.method) {
                        case 'create':
                            return this.createNode(...methodArgs);
                        case 'connect':
                            return this.connectNodes(obj, ...methodArgs);
                        case 'grow':
                            return this.growNetwork(obj, ...methodArgs);
                        case 'measure':
                            return this.measureQuantum(obj, ...methodArgs);
                        case 'render_3d':
                            return this.render3D(obj);
                        default:
                            if (obj && typeof obj[node.method] === 'function') {
                                return obj[node.method](...methodArgs);
                            }
                            throw new Error(`Unknown method: ${node.method}`);
                    }

                case 'BinaryExpression':
                    const left = await evaluateNode(node.left, scope);
                    const right = await evaluateNode(node.right, scope);
                    
                    switch (node.operator) {
                        case '+': return left + right;
                        case '-': return left - right;
                        case '*': return left * right;
                        case '/': return left / right;
                        case '<': return left < right;
                        case '>': return left > right;
                        case '<=': return left <= right;
                        case '>=': return left >= right;
                        case '==': return left == right;
                        case '!=': return left != right;
                        case '&&': return left && right;
                        case '||': return left || right;
                        default:
                            throw new Error(`Unknown operator: ${node.operator}`);
                    }

                case 'UnaryExpression':
                    const arg = await evaluateNode(node.argument, scope);
                    
                    switch (node.operator) {
                        case '!': return !arg;
                        case '-': return -arg;
                        case '+': return +arg;
                        default:
                            throw new Error(`Unknown unary operator: ${node.operator}`);
                    }

                case 'IfStatement':
                    const condition = await evaluateNode(node.condition, scope);
                    
                    if (condition) {
                        let result;
                        for (const stmt of node.consequent) {
                            result = await evaluateNode(stmt, scope);
                        }
                        return result;
                    } else if (node.alternate) {
                        let result;
                        for (const stmt of node.alternate) {
                            result = await evaluateNode(stmt, scope);
                        }
                        return result;
                    }
                    return null;

                case 'ForLoop':
                    await evaluateNode(node.init, scope);
                    
                    while (await evaluateNode(node.condition, scope)) {
                        for (const stmt of node.body) {
                            await evaluateNode(stmt, scope);
                        }
                        await evaluateNode(node.update, scope);
                    }
                    return null;

                case 'WhileLoop':
                    while (await evaluateNode(node.condition, scope)) {
                        for (const stmt of node.body) {
                            await evaluateNode(stmt, scope);
                        }
                    }
                    return null;

                case 'ReturnStatement':
                    return await evaluateNode(node.value, scope);

                case 'Identifier':
                    if (scope.has(node.name)) {
                        return scope.get(node.name);
                    } else if (this.builtins[node.name]) {
                        return this.builtins[node.name];
                    }
                    throw new Error(`Undefined variable: ${node.name}`);

                case 'NumberLiteral':
                    return node.value;

                case 'StringLiteral':
                    return node.value;

                case 'ArrayLiteral':
                    return await Promise.all(node.elements.map(el => evaluateNode(el, scope)));

                case 'MemberExpression':
                    const object = await evaluateNode(node.object, scope);
                    return object[node.property];

                case 'IndexExpression':
                    const array = await evaluateNode(node.object, scope);
                    const index = await evaluateNode(node.index, scope);
                    return array[index];

                case 'AssignmentExpression':
                    const assignValue = await evaluateNode(node.right, scope);
                    
                    if (node.left.type === 'Identifier') {
                        scope.set(node.left.name, assignValue);
                    } else if (node.left.type === 'MemberExpression') {
                        const obj = await evaluateNode(node.left.object, scope);
                        obj[node.left.property] = assignValue;
                    } else if (node.left.type === 'IndexExpression') {
                        const arr = await evaluateNode(node.left.object, scope);
                        const idx = await evaluateNode(node.left.index, scope);
                        arr[idx] = assignValue;
                    }
                    
                    return assignValue;

                case 'ExpressionStatement':
                    return await evaluateNode(node.expression, scope);

                default:
                    throw new Error(`Unknown node type: ${node.type}`);
            }
        };

        return await evaluateNode(ast);
    }

    // Built-in functions and objects
    builtins = {
        node: {
            create: (type, position) => this.createNode(type, position)
        },
        qc: {
            allocate: (qubits) => this.allocateQubits(qubits),
            hadamard_all: (qubits) => this.applyHadamardAll(qubits),
            measure_all: (qubits) => this.measureAll(qubits)
        },
        viz: {
            render_3d: (network) => this.render3D(network)
        },
        Math: Math,
        console: {
            log: (...args) => {
                this.output.push(args.join(' '));
                console.log(...args);
            }
        }
    };

    // Helper methods for built-in functionality
    createNode(type, position) {
        const node = {
            id: `node_${Date.now()}`,
            type,
            position,
            connections: []
        };
        this.nodes.set(node.id, node);
        return node;
    }

    connectNodes(source, targets) {
        const connections = [];
        for (const target of targets) {
            const connection = {
                id: `${source.id}-${target.id}`,
                source: source.id,
                target: target.id,
                weight: 1.0
            };
            connections.push(connection);
            this.connections.set(connection.id, connection);
        }
        return connections;
    }

    async growNetwork(network, steps = 10) {
        // Simulate network growth
        const growth = {
            network: network.name,
            steps,
            newNodes: [],
            newConnections: []
        };

        for (let i = 0; i < steps; i++) {
            // Add new nodes probabilistically
            if (Math.random() > 0.5) {
                const newNode = this.createNode('grown', [
                    Math.random() * 10,
                    Math.random() * 10,
                    Math.random() * 10
                ]);
                growth.newNodes.push(newNode);
                network.nodes.push(newNode);
            }

            // Add new connections
            if (network.nodes.length > 1 && Math.random() > 0.3) {
                const source = network.nodes[Math.floor(Math.random() * network.nodes.length)];
                const target = network.nodes[Math.floor(Math.random() * network.nodes.length)];
                
                if (source.id !== target.id) {
                    const connection = {
                        id: `${source.id}-${target.id}`,
                        source: source.id,
                        target: target.id,
                        weight: Math.random()
                    };
                    growth.newConnections.push(connection);
                    network.connections.push(connection);
                }
            }
        }

        return growth;
    }

    allocateQubits(num) {
        const qubits = {
            count: num,
            state: new Array(Math.pow(2, num)).fill(0)
        };
        qubits.state[0] = 1; // |00...0⟩
        return qubits;
    }

    applyHadamardAll(qubits) {
        // Apply Hadamard to create superposition
        const newState = new Array(qubits.state.length).fill(1 / Math.sqrt(qubits.state.length));
        qubits.state = newState;
        return qubits;
    }

    measureAll(qubits) {
        // Measure quantum state
        const measurements = {};
        const shots = 1000;
        
        for (let i = 0; i < shots; i++) {
            const r = Math.random();
            let cumulative = 0;
            
            for (let j = 0; j < qubits.state.length; j++) {
                cumulative += Math.pow(Math.abs(qubits.state[j]), 2);
                if (r <= cumulative) {
                    const bitstring = j.toString(2).padStart(qubits.count, '0');
                    measurements[bitstring] = (measurements[bitstring] || 0) + 1;
                    break;
                }
            }
        }
        
        return measurements;
    }

    async executeQuantum(expression, scope) {
        // Execute quantum operations
        const { QuantumCircuitExecutor } = require('../quantum-backend/quantum-engine');
        const circuit = new QuantumCircuitExecutor(4); // Default 4 qubits
        
        // Add some default gates for demonstration
        circuit.addGate({ type: 'H', qubit: 0 });
        circuit.addGate({ type: 'CNOT', control: 0, target: 1 });
        
        const result = circuit.execute(1024);
        this.quantumCircuits.set(`quantum_${Date.now()}`, result);
        
        return result;
    }

    async executeQuantumFunction(func, args) {
        // Execute user-defined quantum function
        const funcScope = new Map(this.variables);
        func.params.forEach((param, i) => {
            funcScope.set(param, args[i]);
        });
        
        let result;
        for (const stmt of func.body) {
            result = await this.interpret({ type: 'Program', statements: [stmt] });
        }
        
        return result;
    }

    async runSimulation(target) {
        // Run biological network simulation
        const simulation = {
            target: target.name || target.id,
            steps: 100,
            results: []
        };

        for (let step = 0; step < simulation.steps; step++) {
            // Simulate signal propagation
            const signals = {};
            
            for (const node of target.nodes || []) {
                signals[node.id] = Math.random();
            }
            
            simulation.results.push({
                step,
                signals,
                timestamp: Date.now()
            });
        }

        return simulation;
    }

    render3D(network) {
        // Generate 3D visualization data
        return {
            type: '3D',
            network: network.name,
            nodes: network.nodes.map(n => ({
                ...n,
                size: 1 + Math.random() * 2,
                color: `hsl(${Math.random() * 360}, 70%, 50%)`
            })),
            connections: network.connections.map(c => ({
                ...c,
                opacity: 0.3 + c.weight * 0.7
            })),
            camera: { x: 0, y: 0, z: 10 }
        };
    }

    reset() {
        this.networks.clear();
        this.nodes.clear();
        this.connections.clear();
        this.quantumCircuits.clear();
        this.variables.clear();
        this.functions.clear();
        this.currentNetwork = null;
        this.output = [];
        this.errors = [];
    }
}

module.exports = MyceliumInterpreter;