using System;

namespace SecondBrain.Api.Models
{
    public enum ExecutionStepType
    {
        // Main steps
        Processing,
        Thinking,
        FunctionCall,
        DatabaseOperation,
        Result,

        // Processing sub-steps
        ModelInitialization,
        ContextPreparation,
        InputValidation,
        TokenAnalysis,

        // Thinking sub-steps
        PromptAnalysis,
        ParameterExtraction,
        OperationSelection,
        ValidationCheck,

        // Function call sub-steps
        ArgumentParsing,
        ParameterValidation,
        FunctionPreparation,
        ExecutionPlan,

        // Database operation sub-steps
        ConnectionCheck,
        TransactionStart,
        QueryPreparation,
        ExecutionStatus,
        TransactionCommit,

        // Result sub-steps
        ResultProcessing,
        ResponseFormatting,
        PerformanceMetrics,
        CompletionStatus
    }
} 