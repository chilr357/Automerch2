import React from 'react';

type RoadmapPhase = {
  title: string;
  focus: string;
  tasks: string[];
};

const PHASES: RoadmapPhase[] = [
  {
    title: 'Phase 1 — SEO & Copy Automation',
    focus: 'Generate optimized listing content with OpenAI reinforced by EverBee/eRank keyword intelligence.',
    tasks: [
      'Introduce aiContentService for OpenAI-powered titles, descriptions, and tags.',
      'Feed long-tail keyword data from keywordResearchService into content generation.',
      'Cache and validate copy against Etsy guidelines before publishing.',
    ],
  },
  {
    title: 'Phase 2 — Etsy API Integration',
    focus: 'Publish AI-crafted listings through Etsy Open API v3 with full OAuth handling and status tracking.',
    tasks: [
      'Replace modal alert with etsyApiService create/update/publish flows.',
      'Synchronize inventory, pricing, and mockups generated in the app.',
      'Collect order data to support downstream analytics and automations.',
    ],
  },
  {
    title: 'Phase 3 — Social Scheduling Automation',
    focus: 'Distribute adfusion stills and video assets across Pinterest and additional social channels.',
    tasks: [
      'Extend ActionButtons with scheduling hooks powered by socialSchedulingService.',
      'Generate platform-ready captions and hashtags using AI prompts.',
      'Leverage optimal posting windows and monitor delivery success.',
    ],
  },
  {
    title: 'Phase 4 — Customer Service Automation',
    focus: 'Blend AI-first responses with human handoff rules to handle buyer inquiries promptly.',
    tasks: [
      'Implement customerServiceBot for templated, personalized replies.',
      'Surface SLA metrics and escalation triggers for outliers.',
      'Integrate order context so updates reflect real fulfillment data.',
    ],
  },
  {
    title: 'Phase 5 — Performance Analytics & Insights',
    focus: 'Unify listing, social, and support metrics into actionable 30-day playbooks.',
    tasks: [
      'Upgrade history tracking with analyticsService dashboards and forecasting.',
      'Capture social engagement, conversions, and ROI via analytics APIs.',
      'Trigger alerts and recommendations when KPIs drift from targets.',
    ],
  },
];

const CORE_SERVICES = [
  { name: 'aiContentService', detail: 'OpenAI-driven copywriting with quality scoring and caching.' },
  { name: 'keywordResearchService', detail: 'EverBee/eRank sourced keyword intelligence and competition analysis.' },
  { name: 'etsyApiService', detail: 'OAuth-authenticated listing, inventory, and order management.' },
  { name: 'socialSchedulingService', detail: 'Cross-platform content scheduling with caption and hashtag generation.' },
  { name: 'customerServiceBot', detail: 'AI-guided responses, SLA tracking, and escalation workflows.' },
  { name: 'analyticsService', detail: 'Centralized KPIs, forecasting, and performance reporting.' },
  { name: 'apiManager', detail: 'Unified rate limiting, error handling, and credential orchestration.' },
];

export const IntegrationRoadmap: React.FC = () => {
  return (
    <section className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">AI Integration Roadmap</h2>
          <p className="text-white/70 text-sm sm:text-base max-w-2xl mt-2">
            A phased plan that evolves AutoMerch from single-flow mockups into a full AI-powered Etsy growth platform.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 bg-indigo-500/30 text-indigo-100 text-xs font-semibold uppercase tracking-wide px-4 py-2 rounded-full border border-indigo-300/40">
          <span className="text-lg">🚀</span>
          Ready for implementation
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-black/30 border border-white/10 rounded-2xl p-5 space-y-4">
          <h3 className="text-lg font-semibold text-white">Core Service Modules</h3>
          <ul className="space-y-3 text-sm text-white/80">
            {CORE_SERVICES.map(service => (
              <li key={service.name} className="flex items-start gap-3">
                <span className="mt-1 text-indigo-300">•</span>
                <div>
                  <p className="font-semibold text-white">{service.name}</p>
                  <p className="text-white/70">{service.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-black/30 border border-white/10 rounded-2xl p-5 space-y-3">
          <h3 className="text-lg font-semibold text-white">Execution Principles</h3>
          <ul className="space-y-3 text-sm text-white/80">
            <li className="flex items-start gap-3">
              <span className="mt-1 text-indigo-300">•</span>
              <p>Modular TypeScript services with centralized API governance and rate limiting.</p>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 text-indigo-300">•</span>
              <p>Real-time data feedback loops to surface insights inside the existing React experience.</p>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 text-indigo-300">•</span>
              <p>Progressive rollout by phase to control cost, complexity, and testing scope.</p>
            </li>
          </ul>
        </div>
      </div>

      <div className="space-y-5">
        {PHASES.map(phase => (
          <div key={phase.title} className="bg-black/30 border border-white/10 rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h3 className="text-lg font-semibold text-white">{phase.title}</h3>
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-white/70 uppercase tracking-wide">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                In scope
              </span>
            </div>
            <p className="text-white/70 text-sm mt-3">{phase.focus}</p>
            <ul className="mt-4 space-y-2 text-sm text-white/80">
              {phase.tasks.map(task => (
                <li key={task} className="flex items-start gap-3">
                  <span className="mt-1 text-indigo-300">→</span>
                  <p>{task}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
};

export default IntegrationRoadmap;
