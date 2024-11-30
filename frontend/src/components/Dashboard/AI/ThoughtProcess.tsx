import React from 'react';
import { ExecutionStep } from '../../../types/ai';
import { Settings2, Brain, Terminal, Database, CheckCircle, ChevronRight, LucideIcon } from 'lucide-react';

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
  themeColor: string;
}

const renderStepIndicator = (
  isLast: boolean,
  isComplete: boolean,
  isSubStep: boolean,
  stepColor: string | undefined,
  Icon: LucideIcon | undefined
) => {
  // Ensure we have a valid color, fallback to gray if undefined
  const color = stepColor || '#6B7280';
  
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

export function ThoughtProcess({ steps, isComplete, themeColor }: ThoughtProcessProps) {
  const [collapsedSteps, setCollapsedSteps] = React.useState<Record<string, boolean>>({});
  const collapsedStepsRef = React.useRef<Record<string, boolean>>({});
  const manuallyToggledSteps = React.useRef<Set<string>>(new Set());
  const lastStepRef = React.useRef<HTMLDivElement>(null);
  const previousStepsLengthRef = React.useRef(steps.length);

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

  // Toggle collapse state for a step
  const toggleCollapse = React.useCallback((stepId: string, event: React.MouseEvent) => {
    // Prevent event from bubbling up to prevent scroll handlers
    event.stopPropagation();
    
    // Mark this step as manually toggled
    manuallyToggledSteps.current.add(stepId);
    
    setCollapsedSteps(prev => {
      const newState = {
        ...prev,
        [stepId]: !prev[stepId]
      };
      collapsedStepsRef.current = newState;
      return newState;
    });
  }, []);

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

  const renderMetadata = (step: ExecutionStep) => {
    if (!step.metadata) return null;
    
    const metadata = step.metadata as StepMetadata;
    const isSubStep = step.isSubStep || false;
    const operationResult = metadata.result ? parseOperationResult(metadata.result as string) : null;

    switch (step.type) {
      case 0: // Processing (Main Step)
        if (!isSubStep) {
          return (
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
        }
        return null;

      case 1: // Thinking (Main Step)
        if (!isSubStep) {
          return (
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
        }
        return null;

      case 2: // Function Call (Main Step)
        if (!isSubStep) {
          return (
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
        }
        return null;

      case 3: // Database Operation (Main Step)
        if (!isSubStep) {
          return (
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
        }
        return null;

      case 14: // PromptAnalysis
        return metadata.promptAnalysis || metadata.messageId ? (
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
        ) : null;

      case 15: // ParameterExtraction
        return metadata.parameterExtraction || metadata.messageId ? (
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
        ) : null;

      case 16: // OperationSelection
        return metadata.operationDetails || metadata.messageId ? (
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
            {metadata.messageId && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Message ID:</span>
                <span className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  {metadata.messageId}
                </span>
              </div>
            )}
          </div>
        ) : null;

      case 17: // ValidationCheck
        return metadata.validationResults || metadata.messageId ? (
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
                    <div key={index} className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
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
        ) : null;

      case 18: // ArgumentParsing
      case 19: // ParameterValidation
      case 20: // FunctionPreparation
        return metadata.messageId ? (
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
          </div>
        ) : null;

      case 4: // Result (Main Step)
        if (!isSubStep) {
          const operationResult = parseOperationResult(metadata.result as string);
          return (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Status:</span>
                {operationResult.success ? (
                  <span className="text-green-600 dark:text-green-400">Success</span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">Failed</span>
                )}
              </div>
              {operationResult.message && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Message:</span>
                  <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                    {operationResult.message}
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
              {operationResult.data && (
                <div className="flex flex-col gap-1">
                  <span className="text-gray-500">Details:</span>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Title:</span>
                      <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                        {String(operationResult.data?.Title || '')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Tags:</span>
                      <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                        {String(operationResult.data?.Tags || '')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Created:</span>
                      <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                        {new Date(operationResult.data.CreatedAt as string).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        }
        return null;

      case 21: // ResultProcessing
        if (!operationResult) return null;
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Status:</span>
              {operationResult.success ? (
                <span className="text-green-600 dark:text-green-400">Success</span>
              ) : (
                <span className="text-red-600 dark:text-red-400">Failed</span>
              )}
            </div>
            {operationResult.message && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Message:</span>
                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  {operationResult.message}
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
        );

      case 22: // ResponseFormatting
        return metadata.messageId ? (
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
        ) : null;

      case 23: // PerformanceMetrics
        return metadata.messageId ? (
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
        ) : null;

      case 24: // CompletionStatus
        return metadata.messageId ? (
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
        ) : null;

      default:
        return (
          <pre className="bg-gray-50 dark:bg-gray-800 p-1.5 rounded-md overflow-x-auto">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        );
    }
  };

  const renderStep = (step: ExecutionStep, isSubStep: boolean = false, parentColor?: string) => {
    const isLast = steps[steps.length - 1] === step;
    const subSteps = step.isSubStep ? [] : groupedSteps.subStepMap.get(step.type);
    const stepColor = isSubStep ? parentColor : stepColors[step.type as keyof typeof stepColors] || themeColor;
    const Icon = !isSubStep ? stepIcons[step.type as keyof typeof stepIcons] : undefined;
    const stepId = `${step.type}-${step.timestamp}`;
    const hasSubSteps = subSteps && subSteps.length > 0;
    const isCollapsed = collapsedSteps[stepId];
    const isLoading = isLast && !isComplete && !isSubStep;

    return (
      <div 
        key={stepId} 
        className="space-y-2 animate-fade-in"
        ref={isLast ? lastStepRef : undefined}
      >
        <div 
          className={cn(
            "flex items-start gap-2 p-2 rounded-lg transition-all duration-300",
            !isSubStep && "bg-white/50 dark:bg-gray-800/50 shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700",
            isSubStep && "ml-4 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/80",
            isLoading && "animate-pulse-subtle"
          )}
          style={!isSubStep ? {
            borderLeft: `4px solid ${stepColor}`,
            borderLeftColor: stepColor,
            backgroundColor: `${stepColor}05`,
            transition: 'all 0.3s ease-in-out'
          } : undefined}
        >
          {/* Collapse Toggle Button */}
          {hasSubSteps && (
            <button
              onClick={(e) => toggleCollapse(stepId, e)}
              className="mt-0.5 p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors duration-200"
            >
              <div className="transition-transform duration-200" style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}>
                <ChevronRight className="w-3 h-3 text-gray-500" />
              </div>
            </button>
          )}

          {/* Step Icon */}
          <div className="mt-0.5 flex-shrink-0 transition-opacity duration-200">
            {renderStepIndicator(isLast, isComplete, isSubStep, stepColor, Icon)}
          </div>

          {/* Step Content */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn(
                  "font-medium text-xs transition-colors duration-200",
                  isSubStep ? "truncate text-gray-600 dark:text-gray-300" : "break-words",
                  isLoading && "animate-pulse"
                )}>
                  {step.content}
                </span>
                {step.duration && (
                  <span className="text-[10px] text-gray-500 flex-shrink-0 transition-opacity duration-200">
                    {step.duration}ms
                  </span>
                )}
              </div>
              <span className="text-[10px] text-gray-500 flex-shrink-0 transition-opacity duration-200">
                {new Date(step.timestamp).toLocaleTimeString()}
              </span>
            </div>

            {/* Metadata Display */}
            {step.metadata && Object.keys(step.metadata).length > 0 && (
              <div className="text-[10px] space-y-1 transition-all duration-300">
                {renderMetadata(step)}
              </div>
            )}
          </div>
        </div>

        {/* Render Sub-steps with stable height transition */}
        <div 
          className={cn(
            "overflow-hidden transition-all duration-300",
            isCollapsed ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100"
          )}
          style={{
            transitionProperty: 'max-height, opacity',
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {hasSubSteps && !isCollapsed && (
            <div 
              className="relative ml-6 space-y-1"
              style={{ 
                borderLeft: `2px dashed ${stepColor}40`,
                marginTop: '-0.5rem',
                paddingTop: '0.5rem',
                transition: 'all 0.3s ease-in-out'
              }}
            >
              {subSteps.map(subStep => (
                <div 
                  key={`${subStep.type}-${subStep.timestamp}`}
                  className="relative animate-slide-in"
                >
                  <div 
                    className="absolute -left-[17px] top-1/2 w-3 h-[2px] transition-all duration-300"
                    style={{ backgroundColor: `${stepColor}40` }}
                  />
                  {renderStep(subStep, true, stepColor)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {groupedSteps.mainSteps.map(step => renderStep(step))}
    </div>
  );
}