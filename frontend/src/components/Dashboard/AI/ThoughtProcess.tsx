import React from 'react';
import { ExecutionStep } from '../../../types/ai';
import { Settings2, Brain, Terminal, Database, CheckCircle, ChevronRight, LucideIcon } from 'lucide-react';
import { useTheme } from '../../../contexts/themeContextUtils';

// Simple utility function for class name concatenation
const cn = (...classes: (string | boolean | undefined)[]) => {
  return classes.filter(Boolean).join(' ');
};

// Step type to color mapping
const stepColors = {
  0: '#3B82F6', // Processing - Blue
  1: '#8B5CF6', // Thinking - Purple
  2: '#10B981', // Function Call - Green
  3: '#F59E0B', // Database Operation - Orange
  4: '#6366F1', // Result - Indigo
} as const;

// Step type to icon mapping
const stepIcons = {
  0: Terminal,
  1: Brain,
  2: Terminal,
  3: Database,
  4: CheckCircle,
} as const;

interface StepMetadata {
  // Common metadata
  messageId?: string;
  timestamp?: string;
  duration?: number;

  // Processing metadata
  modelId?: string;
  userId?: string;
  inputTokens?: number;
  maxContext?: number;

  // Thinking metadata
  thoughtProcess?: string;
  confidence?: number;
  alternatives?: string[];

  // Thinking sub-steps metadata
  promptAnalysis?: {
    prompt?: string;
    tokens?: number;
    complexity?: number;
  };
  parameterExtraction?: {
    extracted: Record<string, unknown>;
    confidence: number;
  };
  operationDetails?: {
    type: string;
    description: string;
    confidence: number;
  };
  validationResults?: {
    passed: boolean;
    checks: string[];
    issues?: string[];
  };

  // Function Call metadata
  functionName?: string;
  functionParameters?: Record<string, unknown>;
  expectedReturn?: string;

  // Database Operation metadata
  databaseOperation?: {
    type: string;
    table?: string;
    query?: string;
    parameters?: Record<string, unknown>;
  };

  // Result metadata
  success?: boolean;
  result?: string | number | boolean | object | null;
  error?: string;
  executionTime?: number;

  // Generic metadata
  rawResponse?: string;
  [key: string]: unknown;
}

interface ThoughtProcessProps {
  steps: ExecutionStep[];
  isComplete: boolean;
  themeColor?: string;
}

const renderStepIndicator = (
  isLast: boolean,
  isComplete: boolean,
  isSubStep: boolean,
  stepColor: string | undefined,
  Icon: LucideIcon | undefined
) => {
  // Ensure we have a valid color, fallback to gray if undefined
  const color = stepColor ?? '#6B7280';

  // Show loading spinner only if this is the last step and we're not complete
  if (isLast && !isComplete) {
    return <Settings2 className="w-4 h-4 animate-spin" style={{ color }} />;
  }

  // For sub-steps, show checkmark if complete, dot if not
  if (isSubStep) {
    // Show checkmark for completed sub-steps
    if (isComplete || !isLast) {
      return <CheckCircle className="w-3 h-3" style={{ color }} />;
    }
    // Show dot for incomplete sub-steps
    return <div className="w-1.5 h-1.5 rounded-full mt-1.5" style={{ backgroundColor: color }} />;
  }

  // For main steps, show the icon
  return Icon ? <Icon className="w-4 h-4" style={{ color }} /> : null;
};

const tryParseJson = (str: string): object | string => {
  try {
    const parsed = JSON.parse(str);
    return typeof parsed === 'object' ? parsed : str;
  } catch {
    return str;
  }
};

const formatResult = (result: unknown): string => {
  if (typeof result === 'string') {
    const parsed = tryParseJson(result);
    if (typeof parsed === 'object') {
      return JSON.stringify(parsed, null, 2);
    }
    return result;
  }
  return JSON.stringify(result, null, 2);
};

interface NoteData {
  Title: string;
  Tags: string;
  CreatedAt: string;
  [key: string]: unknown;
}

interface OperationResult {
  success: boolean;
  message: string;
  data?: NoteData;
}

const parseOperationResult = (result: string | undefined): OperationResult => {
  if (!result) return { success: false, message: 'No result available' };
  try {
    const parsed = JSON.parse(result);
    return {
      success: parsed.Success,
      message: parsed.Message,
      data: parsed.Data
    };
  } catch {
    return { success: false, message: 'Failed to parse result' };
  }
};

// Add this at the top of the file with other styles
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-10px); }
    to { opacity: 1; transform: translateX(0); }
  }

  @keyframes pulseSubtle {
    0% { opacity: 1; }
    50% { opacity: 0.7; }
    100% { opacity: 1; }
  }

  .animate-fade-in {
    animation: fadeIn 0.3s ease-out forwards;
  }

  .animate-slide-in {
    animation: slideIn 0.3s ease-out forwards;
  }

  .animate-pulse-subtle {
    animation: pulseSubtle 2s ease-in-out infinite;
  }
`;
document.head.appendChild(style);

export function ThoughtProcess({ steps, isComplete }: ThoughtProcessProps) {
  const [collapsedSteps, setCollapsedSteps] = React.useState<Record<string, boolean>>({});
  const collapsedStepsRef = React.useRef<Record<string, boolean>>({});
  const manuallyToggledSteps = React.useRef<Set<string>>(new Set());
  const lastStepRef = React.useRef<HTMLDivElement>(null);
  const previousStepsLengthRef = React.useRef(steps.length);
  const { theme } = useTheme();

  // Initialize collapsed states and handle auto-collapse
  React.useEffect(() => {
    const newCollapsedStates: Record<string, boolean> = { ...collapsedStepsRef.current };
    let hasChanges = false;

    // Group steps to check completion
    const mainStepsMap = new Map<number, ExecutionStep>();
    const subStepsMap = new Map<number, ExecutionStep[]>();

    steps.forEach(step => {
      if (!step.isSubStep) {
        mainStepsMap.set(step.type, step);
      } else if (step.parentStep !== undefined && step.parentStep !== null) {
        const subSteps = subStepsMap.get(step.parentStep) || [];
        subSteps.push(step);
        subStepsMap.set(step.parentStep, subSteps);
      }
    });

    // Process each main step
    mainStepsMap.forEach((mainStep) => {
      const stepId = `${mainStep.type}-${mainStep.timestamp}`;
      const subSteps = subStepsMap.get(mainStep.type) || [];
      const isLastStep = steps[steps.length - 1] === mainStep;

      if (!manuallyToggledSteps.current.has(stepId)) {
        // Check if the step and its sub-steps are loaded
        const isStepLoaded = Boolean(mainStep.metadata?.success || mainStep.metadata?.completed);
        const hasUnfinishedSubSteps = subSteps.length > 0 &&
          subSteps.some(subStep => {
            const isSubStepLast = steps[steps.length - 1] === subStep;
            return isSubStepLast && !subStep.metadata?.success && !subStep.metadata?.completed;
          });

        // A step is running if:
        // 1. The main step is not loaded and it's the current step, OR
        // 2. It has an unfinished sub-step that is currently being processed
        const isCurrentlyRunning = (!isStepLoaded && isLastStep) || hasUnfinishedSubSteps;

        // Keep expanded if:
        // 1. It's the last step and not complete, OR
        // 2. It's currently running (including sub-steps)
        const shouldBeCollapsed = !(isLastStep && !isComplete) && !isCurrentlyRunning;

        if (!(stepId in newCollapsedStates) || newCollapsedStates[stepId] !== shouldBeCollapsed) {
          newCollapsedStates[stepId] = shouldBeCollapsed;
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      collapsedStepsRef.current = newCollapsedStates;
      setCollapsedSteps(newCollapsedStates);
    }

    // Update the previous steps length reference
    previousStepsLengthRef.current = steps.length;
  }, [steps, isComplete]);

  // Auto-scroll to the latest step when new steps are added
  React.useEffect(() => {
    if (!isComplete && steps.length > 0) {
      setTimeout(() => {
        lastStepRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        });
      }, 100);
    }
  }, [steps.length, isComplete]);

  // Reset manual toggles when all steps complete
  React.useEffect(() => {
    if (isComplete) {
      manuallyToggledSteps.current.clear();
    }
  }, [isComplete]);

  // Group steps by their parent step
  const groupedSteps = React.useMemo(() => {
    const mainSteps: ExecutionStep[] = [];
    const subStepMap = new Map<number, ExecutionStep[]>();

    // First pass: collect all main steps
    steps.forEach(step => {
      if (!step.isSubStep) {
        mainSteps.push(step);
      }
    });

    // Second pass: organize sub-steps
    steps.forEach(step => {
      if (step.isSubStep && step.parentStep !== undefined && step.parentStep !== null) {
        const subSteps = subStepMap.get(step.parentStep) || [];
        subSteps.push(step);
        subStepMap.set(step.parentStep, subSteps);
      }
    });

    // Sort main steps by timestamp
    mainSteps.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Sort sub-steps by timestamp
    subStepMap.forEach(subSteps => {
      subSteps.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    });

    return { mainSteps, subStepMap };
  }, [steps]);

  const renderProcessingMetadata = (metadata: StepMetadata) => (
    <div className="space-y-1">
      {metadata.timestamp && (
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Time:</span>
          <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
            {new Date(metadata.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}
      {metadata.modelId && (
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Model:</span>
          <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
            {metadata.modelId}
          </span>
        </div>
      )}
      {metadata.duration && (
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Duration:</span>
          <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
            {metadata.duration}ms
          </span>
        </div>
      )}
    </div>
  );

  const renderThinkingMetadata = (metadata: StepMetadata) => (
    <div className="space-y-1">
      {metadata.modelId && (
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Model:</span>
          <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
            {metadata.modelId}
          </span>
        </div>
      )}
      {metadata.duration && (
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Duration:</span>
          <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
            {metadata.duration}ms
          </span>
        </div>
      )}
      {metadata.thoughtProcess && (
        <div className="flex flex-col gap-1">
          <span className="text-gray-500">Process:</span>
          <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">
            {metadata.thoughtProcess}
          </span>
        </div>
      )}
    </div>
  );

  const renderFunctionCallMetadata = (metadata: StepMetadata) => (
    <div className="space-y-1">
      {metadata.functionName && (
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Function:</span>
          <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
            {metadata.functionName}
          </span>
        </div>
      )}
      {metadata.functionParameters && Object.keys(metadata.functionParameters).length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-gray-500">Parameters:</span>
          <pre className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded overflow-x-auto">
            {JSON.stringify(metadata.functionParameters, null, 2)}
          </pre>
        </div>
      )}
      {metadata.duration && (
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Duration:</span>
          <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
            {metadata.duration}ms
          </span>
        </div>
      )}
    </div>
  );

  const renderDatabaseMetadata = (metadata: StepMetadata) => (
    <div className="space-y-1">
      {metadata.databaseOperation?.type && (
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Operation:</span>
          <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
            {metadata.databaseOperation.type.toUpperCase()}
          </span>
        </div>
      )}
      {metadata.databaseOperation?.table && (
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Table:</span>
          <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
            {metadata.databaseOperation.table}
          </span>
        </div>
      )}
      {metadata.databaseOperation?.query && (
        <div className="flex flex-col gap-1">
          <span className="text-gray-500">Query:</span>
          <pre className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded overflow-x-auto">
            {metadata.databaseOperation.query}
          </pre>
        </div>
      )}
      {metadata.duration && (
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Duration:</span>
          <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
            {metadata.duration}ms
          </span>
        </div>
      )}
    </div>
  );

  const renderResultMetadata = (metadata: StepMetadata) => {
    const result = metadata.result ? parseOperationResult(metadata.result as string) : null;
    if (!result) return null;

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Status:</span>
          {result.success ? (
            <span className="text-green-600 dark:text-green-400">Success</span>
          ) : (
            <span className="text-red-600 dark:text-red-400">Failed</span>
          )}
        </div>
        {result.message && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Message:</span>
            <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
              {result.message}
            </span>
          </div>
        )}
        {metadata.timestamp && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Time:</span>
            <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
              {new Date(metadata.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}
        {result.data && (
          <div className="flex flex-col gap-1">
            <span className="text-gray-500">Details:</span>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Title:</span>
                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  {String(result.data?.Title || '')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Tags:</span>
                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  {String(result.data?.Tags || '')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Created:</span>
                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  {new Date(result.data.CreatedAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPromptAnalysisMetadata = (metadata: StepMetadata) => (
    metadata.promptAnalysis || metadata.messageId ? (
      <div className="space-y-1">
        {metadata.promptAnalysis?.prompt && (
          <div className="flex flex-col gap-1">
            <span className="text-gray-500">Analyzed Prompt:</span>
            <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
              {metadata.promptAnalysis.prompt}
            </span>
          </div>
        )}
        {metadata.modelId && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Model:</span>
            <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
              {metadata.modelId}
            </span>
          </div>
        )}
        {metadata.messageId && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Message ID:</span>
            <span className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
              {metadata.messageId}
            </span>
          </div>
        )}
      </div>
    ) : null
  );

  const renderParameterExtractionMetadata = (metadata: StepMetadata) => (
    metadata.parameterExtraction || metadata.messageId ? (
      <div className="space-y-1">
        {metadata.parameterExtraction?.extracted && Object.keys(metadata.parameterExtraction.extracted).length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-gray-500">Extracted Parameters:</span>
            <pre className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded overflow-x-auto">
              {JSON.stringify(metadata.parameterExtraction.extracted, null, 2)}
            </pre>
          </div>
        )}
        {metadata.parameterExtraction?.confidence && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Confidence:</span>
            <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
              {(metadata.parameterExtraction.confidence * 100).toFixed(1)}%
            </span>
          </div>
        )}
        {metadata.messageId && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Message ID:</span>
            <span className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
              {metadata.messageId}
            </span>
          </div>
        )}
      </div>
    ) : null
  );

  const renderValidationCheckMetadata = (metadata: StepMetadata) => (
    metadata.validationResults || metadata.messageId ? (
      <div className="space-y-1">
        {metadata.validationResults?.passed !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Status:</span>
            {metadata.validationResults.passed ? (
              <span className="text-green-600 dark:text-green-400">Passed</span>
            ) : (
              <span className="text-red-600 dark:text-red-400">Failed</span>
            )}
          </div>
        )}
        {metadata.validationResults?.checks && metadata.validationResults.checks.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-gray-500">Checks:</span>
            <div className="space-y-0.5">
              {metadata.validationResults.checks.map((check, index) => (
                <div key={`${check}-${index}`} className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  {check}
                </div>
              ))}
            </div>
          </div>
        )}
        {metadata.messageId && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Message ID:</span>
            <span className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
              {metadata.messageId}
            </span>
          </div>
        )}
      </div>
    ) : null
  );

  const renderOperationSelectionMetadata = (metadata: StepMetadata) => (
    metadata.operationDetails || metadata.messageId ? (
      <div className="space-y-1">
        {metadata.operationDetails?.type && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Operation:</span>
            <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
              {metadata.operationDetails.type}
            </span>
          </div>
        )}
        {metadata.operationDetails?.description && (
          <div className="flex flex-col gap-1">
            <span className="text-gray-500">Description:</span>
            <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
              {metadata.operationDetails.description}
            </span>
          </div>
        )}
        {metadata.operationDetails?.confidence && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Confidence:</span>
            <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
              {(metadata.operationDetails.confidence * 100).toFixed(1)}%
            </span>
          </div>
        )}
        {metadata.messageId && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Message ID:</span>
            <span className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
              {metadata.messageId}
            </span>
          </div>
        )}
      </div>
    ) : null
  );

  const renderFunctionPreparationMetadata = (metadata: StepMetadata) => (
    metadata.messageId ? (
      <div className="space-y-1">
        {metadata.functionName && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Function:</span>
            <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
              {metadata.functionName}
            </span>
          </div>
        )}
        {metadata.functionParameters && Object.keys(metadata.functionParameters).length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-gray-500">Parameters:</span>
            <pre className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
              {JSON.stringify(metadata.functionParameters, null, 2)}
            </pre>
          </div>
        )}
        {metadata.messageId && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Message ID:</span>
            <span className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
              {metadata.messageId}
            </span>
          </div>
        )}
      </div>
    ) : null
  );

  const renderResultProcessingMetadata = (metadata: StepMetadata) => {
    const result = metadata.result ? parseOperationResult(metadata.result as string) : null;
    if (!result) return null;

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Status:</span>
          {result.success ? (
            <span className="text-green-600 dark:text-green-400">Success</span>
          ) : (
            <span className="text-red-600 dark:text-red-400">Failed</span>
          )}
        </div>
        {result.message && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Message:</span>
            <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
              {result.message}
            </span>
          </div>
        )}
        {result.data && (
          <div className="flex flex-col gap-1">
            <span className="text-gray-500">Details:</span>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Title:</span>
                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  {String(result.data?.Title || '')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Tags:</span>
                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  {String(result.data?.Tags || '')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Created:</span>
                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  {new Date(result.data.CreatedAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
        {metadata.messageId && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Message ID:</span>
            <span className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
              {metadata.messageId}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderResponseFormattingMetadata = (metadata: StepMetadata) => (
    metadata.messageId ? (
      <div className="space-y-1">
        {metadata.result && (
          <div className="flex flex-col gap-1">
            <span className="text-gray-500">Formatted Response:</span>
            <pre className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded overflow-x-auto">
              {formatResult(metadata.result)}
            </pre>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Message ID:</span>
          <span className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
            {metadata.messageId}
          </span>
        </div>
      </div>
    ) : null
  );

  const renderPerformanceMetricsMetadata = (metadata: StepMetadata) => (
    metadata.messageId ? (
      <div className="space-y-1">
        {metadata.duration && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Duration:</span>
            <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
              {metadata.duration}ms
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Message ID:</span>
          <span className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
            {metadata.messageId}
          </span>
        </div>
      </div>
    ) : null
  );

  const renderCompletionStatusMetadata = (metadata: StepMetadata) => (
    metadata.messageId ? (
      <div className="space-y-1">
        {metadata.success !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Status:</span>
            {metadata.success ? (
              <span className="text-green-600 dark:text-green-400">Success</span>
            ) : (
              <span className="text-red-600 dark:text-red-400">Failed</span>
            )}
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Message ID:</span>
          <span className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
            {metadata.messageId}
          </span>
        </div>
      </div>
    ) : null
  );

  // Define an extended step type that includes the optional properties
  type ExtendedExecutionStep = ExecutionStep & {
    label?: string;
    description?: string;
  };

  const renderMetadata = (step: ExecutionStep) => {
    if (!step.metadata) return null;

    const metadata = step.metadata as StepMetadata;
    const isSubStep = step.isSubStep || false;

    if (isSubStep && step.type === 0) return null;

    const metadataRenderers: Record<number, (metadata: StepMetadata) => React.ReactNode> = {
      0: renderProcessingMetadata,
      1: renderThinkingMetadata,
      2: renderFunctionCallMetadata,
      3: renderDatabaseMetadata,
      4: renderResultMetadata,
      14: renderPromptAnalysisMetadata,
      15: renderParameterExtractionMetadata,
      16: renderOperationSelectionMetadata,
      17: renderValidationCheckMetadata,
      18: renderFunctionPreparationMetadata,
      19: renderFunctionPreparationMetadata,
      20: renderFunctionPreparationMetadata,
      21: renderResultProcessingMetadata,
      22: renderResponseFormattingMetadata,
      23: renderPerformanceMetricsMetadata,
      24: renderCompletionStatusMetadata,
    };

    const renderer = metadataRenderers[step.type];
    if (renderer) {
      return renderer(metadata);
    }

    // Default fallback for unknown step types
    return (
      <pre className="bg-gray-50 dark:bg-gray-800 p-1.5 rounded-md overflow-x-auto">
        {JSON.stringify(metadata, null, 2)}
      </pre>
    );
  };

  // Function to get appropriate background color based on theme
  const getStepBackground = (isSubStep: boolean) => {
    if (theme === 'midnight') {
      return isSubStep
        ? 'bg-gray-900'
        : 'bg-gradient-to-r from-gray-900 to-gray-900/80';
    }

    return isSubStep
      ? 'bg-white dark:bg-gray-800 border-gray-200/50 dark:border-gray-700/30'
      : 'bg-white/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/30';
  };

  // Function to get appropriate text color based on theme
  const getTextColor = (isHeader: boolean = false) => {
    if (theme === 'midnight') {
      return isHeader ? 'text-gray-300' : 'text-gray-400';
    }

    return isHeader
      ? 'text-gray-700 dark:text-gray-300'
      : 'text-gray-600 dark:text-gray-400';
  };

  const renderStep = (step: ExecutionStep, isSubStep: boolean = false, parentColor?: string) => {
    const stepKey = `${step.type}-${step.timestamp}`;
    const isLastStep = steps[steps.length - 1] === step;
    const stepColor = step.isSubStep ? parentColor : stepColors[step.type as keyof typeof stepColors];
    const Icon = step.isSubStep ? undefined : stepIcons[step.type as keyof typeof stepIcons];
    const isCollapsed = !!collapsedSteps[stepKey];
    const extendedStep = step as ExtendedExecutionStep;

    const toggleCollapsed = () => {
      const newValue = !collapsedSteps[stepKey];
      setCollapsedSteps(prev => {
        const updated = { ...prev, [stepKey]: newValue };
        collapsedStepsRef.current = updated;
        return updated;
      });
      manuallyToggledSteps.current.add(stepKey);
    };

    // Find related sub-steps
    const subSteps = steps.filter(s =>
      s.isSubStep && s.parentStep === step.type && !step.isSubStep
    );

    return (
      <div
        key={stepKey}
        ref={isLastStep ? lastStepRef : undefined}
        className={cn(
          'mb-3 last:mb-0 animate-fade-in opacity-0',
          isSubStep ? 'ml-6' : ''
        )}
        style={{ animationDelay: '0.1s' }}
      >
        <div
          className={cn(
            'rounded-lg border p-3 shadow-sm backdrop-blur-sm transition-all',
            getStepBackground(isSubStep),
            isLastStep && !isComplete ? 'animate-pulse-subtle' : ''
          )}
        >
          {/* Step header */}
          <div className="flex items-start gap-2">
            <div className="shrink-0 mt-0.5">
              {renderStepIndicator(isLastStep, isComplete, isSubStep, stepColor, Icon)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className={`font-medium ${getTextColor(true)}`}>
                  {extendedStep.label || (isSubStep ? 'Sub-step' : 'Processing step')}
                </div>

                {(extendedStep.description || step.metadata) && (
                  <button
                    onClick={toggleCollapsed}
                    className={`rounded p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                      ${theme === 'midnight' ? 'hover:bg-gray-800' : ''}`}
                  >
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                      style={{ color: stepColor }}
                    />
                  </button>
                )}
              </div>

              {extendedStep.description && (
                <div className={`text-xs ${getTextColor()} mt-0.5`}>
                  {extendedStep.description}
                </div>
              )}
            </div>
          </div>

          {/* Collapsible metadata */}
          {step.metadata && !isCollapsed && (
            <div className={`mt-3 pt-3 ${theme === 'midnight' ? '' : 'border-t border-gray-200/50 dark:border-gray-700/30'} animate-slide-in`}>
              {renderMetadata(step)}
            </div>
          )}
        </div>

        {/* Render sub-steps if this is a main step */}
        {!step.isSubStep && subSteps.length > 0 && !isCollapsed && (
          <div className="mt-2">
            {subSteps.map(subStep => renderStep(subStep, true, stepColor))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {groupedSteps.mainSteps.map(step => renderStep(step))}
    </div>
  );
}