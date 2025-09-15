// Social Sharing and Viral Features for QuantumMycelium Nexus
class SocialSharingManager {
    constructor() {
        this.baseUrl = window.location.origin;
        this.initializeSharing();
    }

    initializeSharing() {
        this.createShareButtons();
        this.setupShareModal();
        this.trackSharing();
    }

    // Generate shareable URLs
    generateShareUrl(type, data) {
        const params = new URLSearchParams({
            utm_source: 'social_share',
            utm_medium: type,
            utm_campaign: 'quantum_sharing',
            shared_content: data.contentType || 'general',
            ...data
        });

        return `${this.baseUrl}/${data.page || 'index.html'}?${params.toString()}`;
    }

    // Create dynamic share buttons
    createShareButtons(container = null) {
        if (!container) {
            container = document.createElement('div');
            container.className = 'social-share-buttons';
        }

        const shareData = this.getCurrentPageData();
        
        const buttons = [
            {
                platform: 'twitter',
                icon: '🐦',
                label: 'Share on Twitter',
                url: this.getTwitterShareUrl(shareData)
            },
            {
                platform: 'linkedin',
                icon: '💼',
                label: 'Share on LinkedIn', 
                url: this.getLinkedInShareUrl(shareData)
            },
            {
                platform: 'reddit',
                icon: '📡',
                label: 'Share on Reddit',
                url: this.getRedditShareUrl(shareData)
            },
            {
                platform: 'hackernews',
                icon: '🟠',
                label: 'Share on Hacker News',
                url: this.getHackerNewsShareUrl(shareData)
            },
            {
                platform: 'copy',
                icon: '🔗',
                label: 'Copy Link',
                action: () => this.copyToClipboard(shareData.url)
            }
        ];

        container.innerHTML = buttons.map(button => `
            <button class="share-btn share-${button.platform}" 
                    onclick="${button.action ? button.action.toString() + '()' : 'window.open(\'' + button.url + '\', \'_blank\')'}"
                    title="${button.label}">
                <span class="share-icon">${button.icon}</span>
                <span class="share-label">${button.label}</span>
            </button>
        `).join('');

        return container;
    }

    // Get current page data for sharing
    getCurrentPageData() {
        const title = document.title || 'QuantumMycelium Nexus';
        const description = document.querySelector('meta[name="description"]')?.content || 
                           'Revolutionary quantum-classical hybrid computing platform powered by Mycelium-EI';
        const url = this.generateShareUrl('direct', {
            page: window.location.pathname.split('/').pop() || 'index.html',
            contentType: this.detectContentType()
        });

        return { title, description, url };
    }

    // Detect content type for analytics
    detectContentType() {
        const path = window.location.pathname;
        if (path.includes('playground')) return 'playground';
        if (path.includes('quantum-demo')) return 'circuit_designer';
        if (path.includes('docs')) return 'documentation';
        if (path.includes('algorithms')) return 'algorithm_library';
        return 'general';
    }

    // Platform-specific share URLs
    getTwitterShareUrl(data) {
        const text = `🧬 Just discovered QuantumMycelium Nexus - ${data.title}! Revolutionary quantum computing platform with biological network modeling. ${this.getHashtags()}`;
        return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(data.url)}`;
    }

    getLinkedInShareUrl(data) {
        return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(data.url)}&title=${encodeURIComponent(data.title)}&summary=${encodeURIComponent(data.description)}`;
    }

    getRedditShareUrl(data) {
        return `https://reddit.com/submit?url=${encodeURIComponent(data.url)}&title=${encodeURIComponent(data.title + ' - ' + data.description)}`;
    }

    getHackerNewsShareUrl(data) {
        return `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(data.url)}&t=${encodeURIComponent(data.title)}`;
    }

    getHashtags() {
        return '#QuantumComputing #BioNetworks #MyceliumEI #QuantumAlgorithms #TechInnovation';
    }

    // Copy to clipboard with enhanced UX
    async copyToClipboard(url) {
        try {
            await navigator.clipboard.writeText(url);
            this.showToast('Link copied to clipboard!', 'success');
            this.trackShare('copy_link');
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('Link copied!', 'success');
            this.trackShare('copy_link_fallback');
        }
    }

    // Create shareable code snippets
    createShareableCode(code, title, description) {
        const shareableData = {
            title: title || 'My Quantum Algorithm',
            description: description || 'Check out this quantum algorithm I created!',
            code: code,
            timestamp: new Date().toISOString(),
            platform: 'mycelium_nexus'
        };

        // Encode the data
        const encoded = btoa(JSON.stringify(shareableData));
        const shareUrl = `${this.baseUrl}/mycelium-playground.html?shared=${encoded}`;

        return {
            url: shareUrl,
            data: shareableData
        };
    }

    // Load shared code (for receiving end)
    loadSharedCode() {
        const urlParams = new URLSearchParams(window.location.search);
        const sharedData = urlParams.get('shared');
        
        if (sharedData) {
            try {
                const decoded = JSON.parse(atob(sharedData));
                return decoded;
            } catch (error) {
                console.error('Failed to decode shared data:', error);
                return null;
            }
        }
        return null;
    }

    // Setup share modal
    setupShareModal() {
        // Create modal HTML
        const modalHtml = `
            <div id="shareModal" class="share-modal" onclick="this.style.display='none'">
                <div class="share-modal-content" onclick="event.stopPropagation()">
                    <div class="share-modal-header">
                        <h3>Share This Amazing Discovery!</h3>
                        <button class="share-modal-close" onclick="document.getElementById('shareModal').style.display='none'">&times;</button>
                    </div>
                    <div class="share-modal-body">
                        <p>Help spread quantum computing knowledge by sharing QuantumMycelium Nexus:</p>
                        <div id="shareButtonsContainer"></div>
                        
                        <div class="share-stats">
                            <div class="stat-item">
                                <span class="stat-number" id="totalShares">0</span>
                                <span class="stat-label">Total Shares</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-number" id="weeklyViews">0</span>
                                <span class="stat-label">Weekly Views</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-number" id="communitySize">0</span>
                                <span class="stat-label">Community Members</span>
                            </div>
                        </div>

                        <div class="viral-features">
                            <h4>🚀 Viral Challenges</h4>
                            <div class="challenge-list">
                                <div class="challenge-item">
                                    <div class="challenge-title">Quantum Algorithm Challenge</div>
                                    <div class="challenge-desc">Share your best quantum algorithm implementation</div>
                                    <div class="challenge-reward">🏆 Featured on homepage</div>
                                </div>
                                <div class="challenge-item">
                                    <div class="challenge-title">Mycelium Network Contest</div>
                                    <div class="challenge-desc">Create the most innovative biological network model</div>
                                    <div class="challenge-reward">🎁 Beta access to new features</div>
                                </div>
                            </div>
                        </div>

                        <div class="referral-program">
                            <h4>📧 Invite Friends</h4>
                            <p>Share with friends and colleagues who might be interested in quantum computing:</p>
                            <div class="referral-input-group">
                                <input type="email" placeholder="friend@example.com" id="friendEmail">
                                <button onclick="socialSharingManager.sendInvite()" class="invite-btn">Send Invite</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Add styles
        this.addShareStyles();

        // Load share stats
        this.loadShareStats();
    }

    // Show share modal
    showShareModal() {
        const modal = document.getElementById('shareModal');
        const container = document.getElementById('shareButtonsContainer');
        
        // Create fresh share buttons
        this.createShareButtons(container);
        
        modal.style.display = 'flex';
        this.trackEvent('share_modal_opened');
    }

    // Send email invite
    async sendInvite() {
        const email = document.getElementById('friendEmail').value;
        if (!email || !this.isValidEmail(email)) {
            this.showToast('Please enter a valid email address', 'error');
            return;
        }

        try {
            // Create mailto link with pre-filled content
            const subject = encodeURIComponent('Check out QuantumMycelium Nexus!');
            const body = encodeURIComponent(`Hi there!

I thought you'd be interested in QuantumMycelium Nexus - a revolutionary quantum computing platform that combines quantum algorithms with biological network modeling.

Features include:
🧬 Mycelium-EI programming language
⚛️ Interactive quantum circuit designer
📚 Comprehensive algorithm library
🔬 Real-time network simulation

Check it out here: ${this.baseUrl}

Best regards!`);

            const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;
            window.location.href = mailtoUrl;

            this.showToast('Email invite prepared!', 'success');
            this.trackShare('email_invite');

            // Clear the input
            document.getElementById('friendEmail').value = '';

        } catch (error) {
            console.error('Failed to send invite:', error);
            this.showToast('Failed to prepare email invite', 'error');
        }
    }

    // Validate email format
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Load and display share statistics
    async loadShareStats() {
        try {
            // Mock data - in production would come from analytics API
            const stats = {
                totalShares: Math.floor(Math.random() * 10000) + 5000,
                weeklyViews: Math.floor(Math.random() * 50000) + 25000,
                communitySize: Math.floor(Math.random() * 5000) + 2500
            };

            // Animate numbers counting up
            this.animateCounter('totalShares', stats.totalShares);
            this.animateCounter('weeklyViews', stats.weeklyViews);
            this.animateCounter('communitySize', stats.communitySize);

        } catch (error) {
            console.error('Failed to load share stats:', error);
        }
    }

    // Animate counter numbers
    animateCounter(elementId, targetValue, duration = 2000) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const startValue = 0;
        const increment = targetValue / (duration / 16); // 60fps
        let currentValue = startValue;

        const timer = setInterval(() => {
            currentValue += increment;
            if (currentValue >= targetValue) {
                element.textContent = targetValue.toLocaleString();
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(currentValue).toLocaleString();
            }
        }, 16);
    }

    // Track sharing events
    trackShare(platform) {
        // Mock analytics tracking
        console.log(`Share tracked: ${platform}`);
        
        // In production, would send to analytics service
        this.trackEvent('content_shared', {
            platform: platform,
            page: window.location.pathname,
            timestamp: new Date().toISOString()
        });

        // Show success message
        this.showToast(`Shared to ${platform}!`, 'success');
    }

    // Generic event tracking
    trackEvent(eventName, properties = {}) {
        // Mock analytics - replace with actual service
        console.log('Event tracked:', { eventName, properties });
        
        // Could integrate with Google Analytics, Mixpanel, etc.
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, properties);
        }
    }

    // Show toast notifications
    showToast(message, type = 'info') {
        // Create toast if it doesn't exist
        let toast = document.getElementById('shareToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'shareToast';
            toast.className = 'share-toast';
            document.body.appendChild(toast);
        }

        toast.className = `share-toast share-toast-${type} share-toast-show`;
        toast.textContent = message;

        // Auto hide after 3 seconds
        setTimeout(() => {
            toast.classList.remove('share-toast-show');
        }, 3000);
    }

    // Add CSS styles for sharing components
    addShareStyles() {
        const styles = `
            .share-modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: 10000;
                align-items: center;
                justify-content: center;
                padding: 2rem;
            }

            .share-modal-content {
                background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
                border: 1px solid rgba(226, 232, 240, 0.2);
                border-radius: 15px;
                padding: 0;
                max-width: 600px;
                width: 100%;
                max-height: 80vh;
                overflow-y: auto;
                color: #e2e8f0;
            }

            .share-modal-header {
                padding: 1.5rem;
                border-bottom: 1px solid rgba(226, 232, 240, 0.1);
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: rgba(102, 126, 234, 0.1);
            }

            .share-modal-header h3 {
                margin: 0;
                color: #667eea;
                font-size: 1.3rem;
            }

            .share-modal-close {
                background: none;
                border: none;
                color: #a0aec0;
                font-size: 1.5rem;
                cursor: pointer;
                width: 2rem;
                height: 2rem;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .share-modal-close:hover {
                background: rgba(226, 232, 240, 0.1);
                color: #e2e8f0;
            }

            .share-modal-body {
                padding: 1.5rem;
            }

            .social-share-buttons {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 1rem;
                margin: 1.5rem 0;
            }

            .share-btn {
                background: rgba(226, 232, 240, 0.1);
                border: 1px solid rgba(226, 232, 240, 0.2);
                color: #e2e8f0;
                padding: 0.8rem 1rem;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                text-decoration: none;
                font-size: 0.9rem;
            }

            .share-btn:hover {
                background: rgba(102, 126, 234, 0.2);
                border-color: #667eea;
                transform: translateY(-2px);
            }

            .share-twitter:hover { background: rgba(29, 161, 242, 0.2); border-color: #1da1f2; }
            .share-linkedin:hover { background: rgba(10, 102, 194, 0.2); border-color: #0a66c2; }
            .share-reddit:hover { background: rgba(255, 69, 0, 0.2); border-color: #ff4500; }
            .share-hackernews:hover { background: rgba(255, 102, 0, 0.2); border-color: #ff6600; }

            .share-icon {
                font-size: 1.2rem;
            }

            .share-stats {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 1rem;
                margin: 2rem 0;
                padding: 1rem;
                background: rgba(26, 27, 38, 0.5);
                border-radius: 8px;
                border: 1px solid rgba(226, 232, 240, 0.1);
            }

            .stat-item {
                text-align: center;
            }

            .stat-number {
                display: block;
                font-size: 1.5rem;
                font-weight: 700;
                color: #667eea;
                margin-bottom: 0.2rem;
            }

            .stat-label {
                font-size: 0.8rem;
                color: #a0aec0;
            }

            .viral-features {
                margin: 2rem 0;
            }

            .viral-features h4 {
                color: #667eea;
                margin-bottom: 1rem;
                font-size: 1.1rem;
            }

            .challenge-list {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            .challenge-item {
                background: rgba(26, 27, 38, 0.5);
                padding: 1rem;
                border-radius: 8px;
                border: 1px solid rgba(226, 232, 240, 0.1);
            }

            .challenge-title {
                font-weight: 600;
                color: #7dcfff;
                margin-bottom: 0.3rem;
            }

            .challenge-desc {
                color: #a0aec0;
                font-size: 0.9rem;
                margin-bottom: 0.5rem;
            }

            .challenge-reward {
                color: #9ece6a;
                font-size: 0.8rem;
                font-weight: 600;
            }

            .referral-program h4 {
                color: #667eea;
                margin-bottom: 1rem;
                font-size: 1.1rem;
            }

            .referral-input-group {
                display: flex;
                gap: 0.5rem;
                margin-top: 1rem;
            }

            .referral-input-group input {
                flex: 1;
                background: rgba(26, 27, 38, 0.9);
                border: 1px solid rgba(226, 232, 240, 0.2);
                border-radius: 6px;
                padding: 0.6rem;
                color: #e2e8f0;
            }

            .referral-input-group input::placeholder {
                color: #565f89;
            }

            .invite-btn {
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                border: none;
                padding: 0.6rem 1rem;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.2s;
                white-space: nowrap;
            }

            .invite-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            }

            .share-toast {
                position: fixed;
                top: 2rem;
                right: 2rem;
                background: rgba(45, 55, 72, 0.95);
                color: #e2e8f0;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                border: 1px solid rgba(226, 232, 240, 0.2);
                font-weight: 600;
                z-index: 10001;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
            }

            .share-toast-show {
                opacity: 1;
                transform: translateX(0);
            }

            .share-toast-success {
                border-left: 4px solid #9ece6a;
            }

            .share-toast-error {
                border-left: 4px solid #f7768e;
            }

            .share-toast-info {
                border-left: 4px solid #7dcfff;
            }

            .floating-share-btn {
                position: fixed;
                bottom: 2rem;
                right: 2rem;
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                border: none;
                width: 3.5rem;
                height: 3.5rem;
                border-radius: 50%;
                font-size: 1.2rem;
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
                z-index: 1000;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .floating-share-btn:hover {
                transform: translateY(-3px);
                box-shadow: 0 6px 25px rgba(102, 126, 234, 0.4);
            }

            @media (max-width: 768px) {
                .share-stats {
                    grid-template-columns: 1fr;
                }
                
                .social-share-buttons {
                    grid-template-columns: 1fr;
                }
                
                .referral-input-group {
                    flex-direction: column;
                }
            }
        `;

        // Add styles to page
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    // Add floating share button
    addFloatingShareButton() {
        const floatingBtn = document.createElement('button');
        floatingBtn.className = 'floating-share-btn';
        floatingBtn.innerHTML = '🚀';
        floatingBtn.title = 'Share QuantumMycelium Nexus';
        floatingBtn.onclick = () => this.showShareModal();

        document.body.appendChild(floatingBtn);
    }

    // Generate shareable achievement badges
    generateAchievementBadge(achievement) {
        const badgeData = {
            achievement: achievement,
            user: 'Quantum Explorer',
            platform: 'QuantumMycelium Nexus',
            timestamp: new Date().toISOString()
        };

        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');

        // Draw badge background
        ctx.fillStyle = 'linear-gradient(135deg, #667eea, #764ba2)';
        ctx.fillRect(0, 0, 400, 200);

        // Add text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🏆 Achievement Unlocked!', 200, 50);
        ctx.fillText(achievement, 200, 100);
        ctx.font = '16px Arial';
        ctx.fillText('QuantumMycelium Nexus', 200, 150);

        return canvas.toDataURL();
    }
}

// Initialize social sharing manager
let socialSharingManager;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    socialSharingManager = new SocialSharingManager();
    
    // Add floating share button to all pages
    socialSharingManager.addFloatingShareButton();
    
    // Check for shared content on playground
    if (window.location.pathname.includes('playground')) {
        const sharedData = socialSharingManager.loadSharedCode();
        if (sharedData) {
            // Load shared code into playground
            console.log('Loading shared code:', sharedData);
            
            // Show notification about shared content
            socialSharingManager.showToast(`Loaded shared code: ${sharedData.title}`, 'success');
        }
    }
    
    // Check for UTM parameters and track viral referrals
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('utm_source') === 'social_share') {
        socialSharingManager.trackEvent('viral_referral', {
            source: urlParams.get('utm_medium'),
            content: urlParams.get('shared_content')
        });
    }
});

// Export for global access
window.socialSharingManager = socialSharingManager;