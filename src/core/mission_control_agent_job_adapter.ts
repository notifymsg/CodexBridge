import {
  MissionWorkflowLoader,
  createMissionAttemptPromptContract,
  createMissionWorkpadStatusView,
  renderMissionAttemptPromptContract,
  type LoadedMissionWorkflow,
  type Mission,
  type MissionAttempt,
  type MissionAttemptStatus,
  type MissionStatus,
} from '../../packages/mission-control/src/index.js';
import type {
  AgentJob,
  AgentJobAttemptHistoryEntry,
  AgentJobStatus,
} from '../types/core.js';

const workflowLoader = new MissionWorkflowLoader();

export function loadMissionWorkflowForAgentJob(job: AgentJob):
  | { workflow: LoadedMissionWorkflow; error: null }
  | { workflow: null; error: Error } {
  const result = workflowLoader.tryLoad({
    explicitPath: job.missionWorkflowPath ?? undefined,
    cwd: job.cwd,
  });
  if (result.workflow) {
    return result;
  }
  return {
    workflow: null,
    error: result.error,
  };
}

export function buildMissionControlledAgentExecutionPrompt(job: AgentJob, params: {
  attempt: number;
  previousVerificationSummary: string | null;
  previousVerificationIssues: string[];
  previousResultPreview: string | null;
  workflow: LoadedMissionWorkflow;
  locale: string | null;
}): string {
  const mission = createMissionFromAgentJob(job, {
    workflow: params.workflow,
    latestBlocker: params.previousVerificationSummary,
    notes: buildPromptNotes(params.previousVerificationIssues, params.previousResultPreview),
  });
  const attempt = createSyntheticAttempt(job, params.attempt, 'running');
  const contract = createMissionAttemptPromptContract({
    mission,
    attempt,
    workflow: params.workflow,
  });
  const localePrefix = normalizeLocalePrefix(params.locale);
  return [
    localePrefix,
    '',
    renderMissionAttemptPromptContract(contract),
  ].join('\n').trim();
}

export function createAgentJobStatusView(job: AgentJob, workflow: LoadedMissionWorkflow | null) {
  const mission = createMissionFromAgentJob(job, {
    workflow,
    latestBlocker: job.missionWorkpadLatestBlocker,
  });
  return createMissionWorkpadStatusView({
    mission,
    attempts: job.missionAttemptHistory.map((entry) => createSyntheticAttemptFromHistory(job, entry)),
    workflow,
  });
}

function createMissionFromAgentJob(
  job: AgentJob,
  options: {
    workflow: LoadedMissionWorkflow | null;
    latestBlocker?: string | null;
    notes?: string[];
  },
): Mission {
  const summary = job.missionWorkpadFinalResultSummary
    ?? job.lastResultPreview
    ?? null;
  return {
    id: job.id,
    source: mapPlatformToMissionSource(job.platform),
    sourceRef: job.id,
    platform: job.platform,
    externalScopeId: job.externalScopeId,
    title: job.title,
    goal: job.goal,
    expectedOutput: job.expectedOutput,
    acceptanceCriteria: [],
    plan: [...job.plan],
    status: mapAgentStatusToMissionStatus(job.status, job.running),
    priority: 'normal',
    riskLevel: job.riskLevel,
    cwd: job.cwd,
    workspacePath: null,
    workflowPath: options.workflow?.source.path ?? job.missionWorkflowPath ?? null,
    providerProfileId: job.providerProfileId,
    bridgeSessionId: job.bridgeSessionId,
    codexThreadId: null,
    activeAttemptId: null,
    attemptCount: job.attemptCount,
    maxAttempts: job.maxAttempts,
    maxTurns: 1,
    lastRunAt: job.lastRunAt,
    completedAt: job.completedAt,
    archivedAt: null,
    stoppedAt: job.status === 'stopped' ? job.updatedAt : null,
    lastResultPreview: job.lastResultPreview,
    resultText: job.resultText ?? null,
    resultArtifacts: [...(job.resultArtifacts ?? [])],
    lastError: job.lastError,
    statusReason: job.lastError ?? job.verificationSummary,
    pendingApproval: null,
    lease: null,
    workpad: {
      summary,
      latestPlan: [...job.plan],
      latestBlocker: options.latestBlocker ?? job.missionWorkpadLatestBlocker,
      latestVerifierSummary: job.missionWorkpadLatestVerifierSummary ?? job.verificationSummary,
      finalResultSummary: job.missionWorkpadFinalResultSummary,
      notes: [...(options.notes ?? [])],
      updatedAt: job.updatedAt,
    },
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

function createSyntheticAttempt(
  job: AgentJob,
  attemptIndex: number,
  status: 'running' | 'verifying' | 'repairing' | 'completed' | 'failed' | 'queued' | 'stopped',
): MissionAttempt {
  return {
    id: `${job.id}-attempt-${attemptIndex}`,
    missionId: job.id,
    index: attemptIndex,
    status,
    providerRunId: null,
    providerThreadId: null,
    promptDigest: null,
    verifierVerdict: null,
    verifierSummary: job.verificationSummary,
    missingAcceptanceCriteria: [],
    outputPreview: job.lastResultPreview,
    error: job.lastError,
    startedAt: job.lastRunAt,
    endedAt: job.completedAt,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

function createSyntheticAttemptFromHistory(job: AgentJob, entry: AgentJobAttemptHistoryEntry): MissionAttempt {
  return {
    id: `${job.id}-attempt-${entry.attempt}-${entry.recordedAt}`,
    missionId: job.id,
    index: entry.attempt,
    status: mapAgentStatusToMissionAttemptStatus(entry.status),
    providerRunId: null,
    providerThreadId: null,
    promptDigest: null,
    verifierVerdict: inferVerifierVerdict(entry.status, entry.verifierSummary),
    verifierSummary: entry.verifierSummary,
    missingAcceptanceCriteria: [],
    outputPreview: entry.outputPreview,
    error: entry.error,
    startedAt: entry.recordedAt,
    endedAt: entry.status === 'running' || entry.status === 'verifying' ? null : entry.recordedAt,
    createdAt: entry.recordedAt,
    updatedAt: entry.recordedAt,
  };
}

function mapPlatformToMissionSource(platform: string): Mission['source'] {
  if (platform === 'weixin' || platform === 'telegram') {
    return platform;
  }
  return 'manual';
}

function mapAgentStatusToMissionStatus(status: AgentJobStatus, running: boolean): MissionStatus {
  if (running && status !== 'stopped' && status !== 'completed' && status !== 'failed') {
    return status === 'planning' ? 'planning' : 'running';
  }
  return status;
}

function inferVerifierVerdict(
  status: AgentJobAttemptHistoryEntry['status'],
  verifierSummary: string | null,
): MissionAttempt['verifierVerdict'] {
  if (!verifierSummary) {
    return null;
  }
  if (status === 'completed') {
    return 'complete';
  }
  if (status === 'repairing' || status === 'verifying') {
    return 'repair';
  }
  if (status === 'waiting_user') {
    return 'waiting_user';
  }
  if (status === 'needs_human') {
    return 'needs_human';
  }
  if (status === 'handoff') {
    return 'handoff';
  }
  if (status === 'blocked') {
    return 'blocked';
  }
  if (status === 'failed') {
    return 'failed';
  }
  return null;
}

function buildPromptNotes(previousVerificationIssues: string[], previousResultPreview: string | null): string[] {
  const notes: string[] = [];
  for (const issue of previousVerificationIssues) {
    notes.push(`Previous verification issue: ${issue}`);
  }
  if (previousResultPreview) {
    notes.push(`Previous output preview: ${previousResultPreview}`);
  }
  return notes;
}

function normalizeLocalePrefix(locale: string | null): string {
  return locale === 'zh-CN'
    ? '你正在执行 CodexBridge 后台 Agent 任务。请用中文回复最终结果。\n最终回复必须包含：摘要、验证结果、产物或后续动作。'
    : 'You are executing a CodexBridge background Agent task. Reply with the final result in English.';
}

function mapAgentStatusToMissionAttemptStatus(status: AgentJobStatus): MissionAttemptStatus {
  switch (status) {
    case 'planning':
      return 'queued';
    case 'running':
    case 'verifying':
    case 'repairing':
    case 'waiting_user':
    case 'needs_human':
    case 'handoff':
    case 'blocked':
    case 'completed':
    case 'failed':
    case 'stopped':
    case 'queued':
      return status;
    default:
      return 'queued';
  }
}
