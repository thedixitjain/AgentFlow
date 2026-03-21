type RouteDecision = {
  timestamp: string;
  taskType: string;
  agentType: string;
  hasDocument: boolean;
  reason: string;
};

type RetrievalEvent = {
  timestamp: string;
  query: string;
  documentId?: string;
  sourceCount: number;
  topScore: number;
  retrievalTimeMs: number;
  generationTimeMs: number;
};

type ProviderEvent = {
  timestamp: string;
  provider: string;
  model: string;
  tokensUsed: number;
  cost: number;
  durationSeconds: number;
  success: boolean;
  fallbackFrom?: string;
};

type EvalEvent = {
  timestamp: string;
  suite: string;
  averageScore: number;
  passedCases: number;
  totalCases: number;
};

class TelemetryService {
  private routeDecisions: RouteDecision[] = [];
  private retrievalEvents: RetrievalEvent[] = [];
  private providerEvents: ProviderEvent[] = [];
  private evalEvents: EvalEvent[] = [];
  private readonly maxEvents = 200;

  private pushEvent<T>(buffer: T[], event: T): void {
    buffer.push(event);
    if (buffer.length > this.maxEvents) {
      buffer.shift();
    }
  }

  recordRouteDecision(event: Omit<RouteDecision, 'timestamp'>): void {
    this.pushEvent(this.routeDecisions, {
      timestamp: new Date().toISOString(),
      ...event,
    });
  }

  recordRetrievalEvent(event: Omit<RetrievalEvent, 'timestamp'>): void {
    this.pushEvent(this.retrievalEvents, {
      timestamp: new Date().toISOString(),
      ...event,
    });
  }

  recordProviderEvent(event: Omit<ProviderEvent, 'timestamp'>): void {
    this.pushEvent(this.providerEvents, {
      timestamp: new Date().toISOString(),
      ...event,
    });
  }

  recordEvalEvent(event: Omit<EvalEvent, 'timestamp'>): void {
    this.pushEvent(this.evalEvents, {
      timestamp: new Date().toISOString(),
      ...event,
    });
  }

  getSummary() {
    const recentRetrievals = this.retrievalEvents.slice(-50);
    const recentProviders = this.providerEvents.slice(-50);
    const recentRoutes = this.routeDecisions.slice(-50);

    const avgTopScore = recentRetrievals.length > 0
      ? recentRetrievals.reduce((sum, event) => sum + event.topScore, 0) / recentRetrievals.length
      : 0;

    const avgRetrievalLatencyMs = recentRetrievals.length > 0
      ? recentRetrievals.reduce((sum, event) => sum + event.retrievalTimeMs, 0) / recentRetrievals.length
      : 0;

    const avgGenerationLatencyMs = recentRetrievals.length > 0
      ? recentRetrievals.reduce((sum, event) => sum + event.generationTimeMs, 0) / recentRetrievals.length
      : 0;

    const providerBreakdown = recentProviders.reduce<Record<string, number>>((acc, event) => {
      acc[event.provider] = (acc[event.provider] || 0) + 1;
      return acc;
    }, {});

    const routeBreakdown = recentRoutes.reduce<Record<string, number>>((acc, event) => {
      acc[event.agentType] = (acc[event.agentType] || 0) + 1;
      return acc;
    }, {});

    return {
      routes: {
        total: this.routeDecisions.length,
        recent: recentRoutes,
        breakdown: routeBreakdown,
      },
      retrieval: {
        total: this.retrievalEvents.length,
        averageTopScore: avgTopScore,
        averageRetrievalLatencyMs: avgRetrievalLatencyMs,
        averageGenerationLatencyMs: avgGenerationLatencyMs,
        recent: recentRetrievals,
      },
      providers: {
        total: this.providerEvents.length,
        breakdown: providerBreakdown,
        recent: recentProviders,
      },
      evals: {
        total: this.evalEvents.length,
        recent: this.evalEvents.slice(-20),
      },
    };
  }
}

export const telemetryService = new TelemetryService();
