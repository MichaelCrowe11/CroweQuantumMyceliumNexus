// Analytics and user tracking for QuantumMycelium Nexus
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
  custom_parameters?: Record<string, any>;
}

export class Analytics {
  private isEnabled: boolean;
  private userId: string | null = null;

  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'production' && 
                     !!process.env.REACT_APP_ANALYTICS_ID;
    
    if (this.isEnabled) {
      this.initializeGoogleAnalytics();
    }
  }

  private initializeGoogleAnalytics() {
    const analyticsId = process.env.REACT_APP_ANALYTICS_ID;
    if (!analyticsId) return;

    // Load Google Analytics script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${analyticsId}`;
    document.head.appendChild(script);

    // Initialize dataLayer and gtag
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(...args: any[]) {
      window.dataLayer!.push(arguments);
    };

    window.gtag('js', new Date());
    window.gtag('config', analyticsId, {
      send_page_view: true,
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
  }

  setUserId(userId: string) {
    this.userId = userId;
    if (this.isEnabled && window.gtag) {
      window.gtag('config', process.env.REACT_APP_ANALYTICS_ID, {
        user_id: userId
      });
    }
  }

  trackPageView(path: string, title?: string) {
    if (!this.isEnabled || !window.gtag) return;

    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: title,
      user_id: this.userId
    });
  }

  trackEvent(event: AnalyticsEvent) {
    if (!this.isEnabled || !window.gtag) return;

    window.gtag('event', event.action, {
      event_category: event.category,
      event_label: event.label,
      value: event.value,
      user_id: this.userId,
      ...event.custom_parameters
    });
  }

  // Quantum-specific event tracking
  trackQuantumCircuitCreated(circuitType: string, gateCount: number) {
    this.trackEvent({
      action: 'quantum_circuit_created',
      category: 'quantum_computing',
      label: circuitType,
      value: gateCount,
      custom_parameters: {
        circuit_type: circuitType,
        gate_count: gateCount
      }
    });
  }

  trackQuantumExecution(backend: string, executionTime: number, success: boolean) {
    this.trackEvent({
      action: 'quantum_execution',
      category: 'quantum_computing',
      label: backend,
      value: executionTime,
      custom_parameters: {
        backend,
        execution_time_ms: executionTime,
        success,
        quantum_backend: backend
      }
    });
  }

  trackMyceliumProgramRun(language: 'mycelium-ei', lineCount: number, executionTime: number) {
    this.trackEvent({
      action: 'program_execution',
      category: 'programming',
      label: language,
      value: executionTime,
      custom_parameters: {
        programming_language: language,
        line_count: lineCount,
        execution_time_ms: executionTime
      }
    });
  }

  trackVisualization(type: '2d' | '3d', nodeCount: number, renderTime: number) {
    this.trackEvent({
      action: 'visualization_rendered',
      category: 'visualization',
      label: type,
      value: renderTime,
      custom_parameters: {
        visualization_type: type,
        node_count: nodeCount,
        render_time_ms: renderTime
      }
    });
  }

  trackUserEngagement(action: string, element: string, duration?: number) {
    this.trackEvent({
      action: 'user_engagement',
      category: 'interaction',
      label: element,
      value: duration,
      custom_parameters: {
        engagement_action: action,
        element,
        duration_seconds: duration
      }
    });
  }

  trackError(errorType: string, errorMessage: string, location: string) {
    this.trackEvent({
      action: 'error_occurred',
      category: 'errors',
      label: errorType,
      custom_parameters: {
        error_type: errorType,
        error_message: errorMessage,
        error_location: location
      }
    });
  }

  trackPerformance(metric: string, value: number, category: string) {
    this.trackEvent({
      action: 'performance_metric',
      category: 'performance',
      label: metric,
      value: value,
      custom_parameters: {
        performance_metric: metric,
        performance_value: value,
        performance_category: category
      }
    });
  }

  // Feature usage tracking
  trackFeatureUsed(feature: string, context?: string) {
    this.trackEvent({
      action: 'feature_used',
      category: 'features',
      label: feature,
      custom_parameters: {
        feature_name: feature,
        feature_context: context
      }
    });
  }

  // Collaboration tracking
  trackCollaboration(action: 'share' | 'invite' | 'join', projectId: string) {
    this.trackEvent({
      action: 'collaboration',
      category: 'social',
      label: action,
      custom_parameters: {
        collaboration_action: action,
        project_id: projectId
      }
    });
  }

  // Learning and tutorials
  trackTutorial(action: 'started' | 'completed' | 'skipped', tutorialName: string) {
    this.trackEvent({
      action: 'tutorial_interaction',
      category: 'learning',
      label: tutorialName,
      custom_parameters: {
        tutorial_action: action,
        tutorial_name: tutorialName
      }
    });
  }

  // Export and sharing
  trackExport(format: string, contentType: string, size?: number) {
    this.trackEvent({
      action: 'content_exported',
      category: 'sharing',
      label: format,
      value: size,
      custom_parameters: {
        export_format: format,
        content_type: contentType,
        file_size_bytes: size
      }
    });
  }
}

// Global analytics instance
export const analytics = new Analytics();

// React hooks for analytics
export const useAnalytics = () => {
  return {
    trackPageView: analytics.trackPageView.bind(analytics),
    trackEvent: analytics.trackEvent.bind(analytics),
    trackQuantumCircuitCreated: analytics.trackQuantumCircuitCreated.bind(analytics),
    trackQuantumExecution: analytics.trackQuantumExecution.bind(analytics),
    trackMyceliumProgramRun: analytics.trackMyceliumProgramRun.bind(analytics),
    trackVisualization: analytics.trackVisualization.bind(analytics),
    trackUserEngagement: analytics.trackUserEngagement.bind(analytics),
    trackError: analytics.trackError.bind(analytics),
    trackPerformance: analytics.trackPerformance.bind(analytics),
    trackFeatureUsed: analytics.trackFeatureUsed.bind(analytics),
    trackCollaboration: analytics.trackCollaboration.bind(analytics),
    trackTutorial: analytics.trackTutorial.bind(analytics),
    trackExport: analytics.trackExport.bind(analytics),
    setUserId: analytics.setUserId.bind(analytics)
  };
};