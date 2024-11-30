import React from 'react';
import { ExecutionStep } from '../../../types/ai';
import { Settings2, Brain, Terminal, Database, CheckCircle, ChevronRight, ChevronDown } from 'lucide-react';

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

interface ThoughtProcessProps {
  steps: ExecutionStep[];
  isComplete: boolean;
  themeColor: string;
}

export function ThoughtProcess({ steps, isComplete, themeColor }: ThoughtProcessProps) {
  // Track collapsed state for each main step
  const [collapsedSteps, setCollapsedSteps] = React.useState<Record<string, boolean>>({});

  // Toggle collapse state for a step
  const toggleCollapse = (stepId: string) => {
    setCollapsedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

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

  const renderStep = (step: ExecutionStep, isSubStep: boolean = false, parentColor?: string) => {
    const isLast = steps[steps.length - 1] === step;
    const subSteps = step.isSubStep ? [] : groupedSteps.subStepMap.get(step.type);
    const stepColor = isSubStep ? parentColor : stepColors[step.type as keyof typeof stepColors] || themeColor;
    const Icon = !isSubStep ? stepIcons[step.type as keyof typeof stepIcons] : undefined;
    const isStepComplete = !isLast || isComplete;
    const stepId = `${step.type}-${step.timestamp}`;
    const hasSubSteps = subSteps && subSteps.length > 0;
    const isCollapsed = collapsedSteps[stepId];

    return (
      <div key={stepId} className="space-y-2">
        <div 
          className={cn(
            "flex items-start gap-2 p-2 rounded-lg transition-all duration-200",
            !isSubStep && "bg-white/50 dark:bg-gray-800/50 shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700",
            isSubStep && "ml-4 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/80"
          )}
          style={!isSubStep ? {
            borderLeft: `4px solid ${stepColor}`,
            borderLeftColor: stepColor,
            backgroundColor: `${stepColor}05`
          } : undefined}
        >
          {/* Collapse Toggle Button */}
          {hasSubSteps && (
            <button
              onClick={() => toggleCollapse(stepId)}
              className="mt-0.5 p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight className="w-3 h-3 text-gray-500" />
              ) : (
                <ChevronDown className="w-3 h-3 text-gray-500" />
              )}
            </button>
          )}

          {/* Step Icon */}
          <div className="mt-0.5 flex-shrink-0">
            {isLast && !isComplete ? (
              <Settings2 className="w-4 h-4 animate-spin" style={{ color: stepColor }} />
            ) : isSubStep ? (
              isStepComplete ? (
                <CheckCircle className="w-3 h-3" style={{ color: stepColor }} />
              ) : (
                <div 
                  className="w-1.5 h-1.5 rounded-full mt-1.5"
                  style={{ backgroundColor: stepColor }}
                />
              )
            ) : Icon && (
              <Icon className="w-4 h-4" style={{ color: stepColor }} />
            )}
          </div>

          {/* Step Content */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn(
                  "font-medium text-xs",
                  isSubStep ? "truncate text-gray-600 dark:text-gray-300" : "break-words"
                )}>
                  {step.content}
                </span>
                {step.duration && (
                  <span className="text-[10px] text-gray-500 flex-shrink-0">
                    {step.duration}ms
                  </span>
                )}
              </div>
              <span className="text-[10px] text-gray-500 flex-shrink-0">
                {new Date(step.timestamp).toLocaleTimeString()}
              </span>
            </div>

            {/* Metadata Display */}
            {step.metadata && Object.keys(step.metadata).length > 0 && (
              <pre className="text-[10px] bg-gray-50 dark:bg-gray-800 p-1.5 rounded-md overflow-x-auto">
                {JSON.stringify(step.metadata, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* Render Sub-steps */}
        {hasSubSteps && !isCollapsed && (
          <div 
            className="relative ml-6 space-y-1"
            style={{ 
              borderLeft: `2px dashed ${stepColor}40`,
              marginTop: '-0.5rem',
              paddingTop: '0.5rem'
            }}
          >
            {subSteps.map(subStep => (
              <div 
                key={`${subStep.type}-${subStep.timestamp}`}
                className="relative"
              >
                <div 
                  className="absolute -left-[17px] top-1/2 w-3 h-[2px]"
                  style={{ backgroundColor: `${stepColor}40` }}
                />
                {renderStep(subStep, true, stepColor)}
              </div>
            ))}
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