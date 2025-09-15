const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

/**
 * @swagger
 * /api/auth/session:
 *   post:
 *     summary: Create anonymous session
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deviceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Session created
 */
router.post('/session', async (req, res) => {
    try {
        const { deviceId } = req.body;
        
        // Create anonymous session token
        const sessionToken = jwt.sign(
            { 
                deviceId: deviceId || generateDeviceId(),
                anonymous: true,
                created: new Date().toISOString()
            },
            process.env.JWT_SECRET || 'dev-secret',
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            token: sessionToken,
            user: {
                anonymous: true,
                deviceId: deviceId,
                features: ['circuit_designer', 'basic_simulation']
            }
        });

    } catch (error) {
        console.error('Session creation error:', error);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

/**
 * @swagger
 * /api/auth/github:
 *   post:
 *     summary: Authenticate with GitHub
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 description: GitHub OAuth code
 *     responses:
 *       200:
 *         description: Authentication successful
 */
router.post('/github', async (req, res) => {
    try {
        const { code } = req.body;
        
        // Exchange code for GitHub access token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code
            })
        });

        const tokenData = await tokenResponse.json();
        
        if (tokenData.error) {
            return res.status(400).json({ error: tokenData.error_description });
        }

        // Get user info from GitHub
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `token ${tokenData.access_token}`
            }
        });

        const githubUser = await userResponse.json();

        // Create or update user in Supabase
        const { data: user, error } = await supabase
            .from('users')
            .upsert({
                github_id: githubUser.id,
                username: githubUser.login,
                email: githubUser.email,
                name: githubUser.name,
                avatar_url: githubUser.avatar_url,
                provider: 'github',
                last_login: new Date().toISOString()
            })
            .select()
            .single();

        if (error && error.code !== '23505') { // Ignore unique constraint violations
            console.error('User creation error:', error);
        }

        // Create JWT token
        const token = jwt.sign(
            { 
                userId: user?.id || githubUser.id,
                username: githubUser.login,
                provider: 'github'
            },
            process.env.JWT_SECRET || 'dev-secret',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user?.id || githubUser.id,
                username: githubUser.login,
                email: githubUser.email,
                name: githubUser.name,
                avatar: githubUser.avatar_url,
                provider: 'github',
                features: ['circuit_designer', 'advanced_simulation', 'circuit_sharing', 'cloud_save']
            }
        });

    } catch (error) {
        console.error('GitHub auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: Verify JWT token
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 */
router.get('/verify', authenticateToken, (req, res) => {
    res.json({
        success: true,
        user: req.user,
        valid: true
    });
});

// Middleware to authenticate JWT tokens
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'dev-secret', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

function generateDeviceId() {
    return 'dev_' + Math.random().toString(36).substring(2, 15);
}

module.exports = { router, authenticateToken };