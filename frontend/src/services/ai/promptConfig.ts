// promptConfig.ts
export const PROMPT_CONFIG = {
      title: {
            note: {
                  openai: `Generate a concise, descriptive title for this note. The title should:
    - Be clear and under 60 characters
    - Capture the main topic or purpose
    - Use natural language
    - Be specific but not verbose
    - Reflect any tags if provided
    
    Content:
    {content}
    
    Tags (if available):
    {context}
    
    Return only the title with no formatting:`,
                  anthropic: `Please provide a clear and concise title for the following note. The title should:
    - Be under 60 characters
    - Accurately reflect the content
    - Be specific and descriptive
    - Consider any tags provided
    
    Note Content:
    {content}
    
    Tags (if available):
    {context}
    
    Return only the title with no formatting:`,
                  gemini: `Please suggest a clear and concise title for the following note. The title should:
    - Be under 60 characters
    - Accurately reflect the content
    - Be specific and descriptive
    - Consider any tags provided
    
    Note Content:
    {content}
    
    Tags (if available):
    {context}
    
    Return only the title with no formatting:`,
                  ollama: `Generate a concise, descriptive title for this note. The title should:
    - Be clear and under 20 characters
    - Capture the main topic or purpose
    - Use natural language
    - Be specific but not verbose
    - Reflect any tags if provided
    
    Content:
    {content}
    
    Tags (if available):
    {context}
    
    Return only the title with no formatting:`,
                  grok: `Generate a concise, descriptive title for this note. The title should:
    - Be clear and under 60 characters
    - Capture the main topic or purpose
    - Use natural language
    - Be specific but not verbose
    - Reflect any tags if provided
    - Do not use markdown or formatting in your response
    
    Content:
    {content}
    
    Tags (if available):
    {context}
    
    Return only the title with no formatting or additional text:`
            },
            idea: {
                  openai: `Create a captivating, memorable title for this idea. The title should:
    - Be creative but clear, under 60 characters
    - Capture the innovative aspect
    - Be engaging and memorable
    - Reflect the potential impact
    - Consider any tags if provided
    
    Content:
    {content}
    
    Tags (if available):
    {context}
    
    Return only the title with no formatting:`,
                  anthropic: `Please suggest a creative and clear title for the following idea. The title should:
    - Be under 60 characters
    - Highlight the innovative aspect
    - Be engaging and memorable
    - Reflect the potential impact
    - Consider any tags provided
    
    Idea Description:
    {content}
    
    Tags (if available):
    {context}
    
    Return only the title with no formatting:`,
                  gemini: `Please suggest a creative and clear title for the following idea. The title should:
    - Be under 60 characters
    - Highlight the innovative aspect
    - Be engaging and memorable
    - Reflect the potential impact
    - Consider any tags provided
    
    Idea Description:
    {content}
    
    Tags (if available):
    {context}
    
    Return only the title with no formatting:`,
                  ollama: `Create a captivating, memorable title for this idea. The title should:
    - Be creative but clear, under 60 characters
    - Capture the innovative aspect
    - Be engaging and memorable
    - Reflect the potential impact
    - Consider any tags if provided
    
    Content:
    {content}
    
    Tags (if available):
    {context}
    
    Return only the title with no formatting:`,
                  grok: `Create a captivating, memorable title for this idea. The title should:
    - Be creative but clear, under 60 characters
    - Capture the innovative aspect
    - Be engaging and memorable
    - Reflect the potential impact
    - Consider any tags if provided
    - Do not use markdown or formatting in your response
    
    Content:
    {content}
    
    Tags (if available):
    {context}
    
    Return only the title with no formatting or additional text:`
            },
            task: {
                  openai: `Generate a clear, action-oriented title for this task. The title should:
    - Be specific and under 60 characters
    - Start with a verb when possible
    - Clearly state the objective
    - Include key context
    - Consider any tags if provided
    
    Content:
    {content}
    
    Tags (if available):
    {context}
    
    Return only the title with no formatting:`,
                  anthropic: `Please create an action-oriented title for the following task. The title should:
    - Start with a verb
    - Be under 60 characters
    - Clearly state the objective
    - Include key context
    - Consider any tags provided
    
    Task Details:
    {content}
    
    Tags (if available):
    {context}
    
    Return only the title with no formatting:`,
                  gemini: `Please create an action-oriented title for the following task. The title should:
    - Start with a verb
    - Be under 60 characters
    - Clearly state the objective
    - Include key context
    - Consider any tags provided
    
    Task Details:
    {content}
    
    Tags (if available):
    {context}
    
    Return only the title with no formatting:`,
                  ollama: `Generate a clear, action-oriented title for this task. The title should:
    - Be specific and under 60 characters
    - Start with a verb when possible
    - Clearly state the objective
    - Include key context
    - Consider any tags if provided
    
    Content:
    {content}
    
    Tags (if available):
    {context}
    
    Return only the title with no formatting:`,
                  grok: `Generate a clear, action-oriented title for this task. The title should:
    - Be specific and under 60 characters
    - Start with a verb when possible
    - Clearly state the objective
    - Include key context
    - Consider any tags if provided
    - Do not use markdown or formatting in your response
    
    Content:
    {content}
    
    Tags (if available):
    {context}
    
    Return only the title with no formatting or additional text:`
            },
            reminder: {
                  openai: `Create a clear, time-relevant title for this reminder. The title should:
    - Be specific and under 60 characters
    - Include relevant timing context
    - Be action-oriented
    - Be immediately understandable
    - Consider any tags if provided
    
    Content:
    {content}
    
    Tags (if available):
    {context}
    
    Return only the title with no formatting:`,
                  anthropic: `Please provide a time-relevant title for the following reminder. The title should:
    - Be under 60 characters
    - Be action-oriented
    - Include relevant timing context
    - Be immediately understandable
    - Consider any tags provided
    
    Reminder Details:
    {content}
    
    Tags (if available):
    {context}
    
    Return only the title with no formatting:`,
                  gemini: `Please provide a time-relevant title for the following reminder. The title should:
    - Be under 60 characters
    - Be action-oriented
    - Include relevant timing context
    - Be immediately understandable
    - Consider any tags provided
    
    Reminder Details:
    {content}
    
    Tags (if available):
    {context}
    
    Return only the title with no formatting:`,
                  ollama: `Create a clear, time-relevant title for this reminder. The title should:
    - Be specific and under 60 characters
    - Include relevant timing context
    - Be action-oriented
    - Be immediately understandable
    - Consider any tags if provided
    
    Content:
    {content}
    
    Tags (if available):
    {context}
    
    Return only the title with no formatting:`,
                  grok: `Create a clear, time-relevant title for this reminder. The title should:
    - Be specific and under 60 characters
    - Include relevant timing context
    - Be action-oriented
    - Be immediately understandable
    - Consider any tags if provided
    - Do not use markdown or formatting in your response
    
    Content:
    {content}
    
    Tags (if available):
    {context}
    
    Return only the title with no formatting or additional text:`
            }
      },
      content: {
            note: {
                  openai: `Generate detailed, well-structured content for this note. The content should:
    - Expand on the title's topic
    - Be informative and clear
    - Include relevant details
    - Use proper formatting (headings, bullet points, etc.)
    - Follow a logical structure with intro, body, and conclusion
    - Incorporate any provided tags as themes
    - Create a well-rounded template that the user can easily customize
    
    Title: {title}
    
    Tags (if available): {context}
    
    Content:`,
                  anthropic: `Please provide a detailed and well-structured template for the following note. Your content should:
    - Expand thoroughly on the title's topic
    - Be informative and clear
    - Include section headings where appropriate
    - Use bullet points and lists when relevant
    - Follow a logical structure with intro, body, and conclusion
    - Incorporate any provided tags as themes
    - Create a comprehensive starting point that the user can easily customize
    
    Note Title: {title}
    
    Tags (if available): {context}
    
    Content:`,
                  gemini: `Please provide a detailed and well-structured template for the following note. Your content should:
    - Expand thoroughly on the title's topic
    - Be informative and clear
    - Include section headings where appropriate
    - Use bullet points and lists when relevant
    - Follow a logical structure with intro, body, and conclusion
    - Incorporate any provided tags as themes
    - Create a comprehensive starting point that the user can easily customize
    
    Note Title: {title}
    
    Tags (if available): {context}
    
    Content:`,
                  ollama: `Generate detailed, well-structured content for this note. The content should:
    - Expand on the title's topic
    - Be informative and clear
    - Include relevant details
    - Use proper formatting (headings, bullet points, etc.)
    - Follow a logical structure with intro, body, and conclusion
    - Incorporate any provided tags as themes
    - Create a well-rounded template that the user can easily customize
    
    Title: {title}
    
    Tags (if available): {context}
    
    Content:`,
                  grok: `Generate detailed, well-structured content for this note. The content should:
    - Expand on the title's topic
    - Be informative and clear
    - Include relevant details
    - Use proper formatting (headings, bullet points, etc.)
    - Follow a logical structure with intro, body, and conclusion
    - Incorporate any provided tags as themes
    - Create a well-rounded template that the user can easily customize
    
    Title: {title}
    
    Tags (if available): {context}
    
    Content:`
            },
            idea: {
                  openai: `Develop this idea with compelling content. The description should:
    - Explain the core concept clearly and thoroughly
    - Highlight potential benefits and impact
    - Address key considerations and challenges
    - Suggest possible next steps and implementation
    - Include resources needed if applicable
    - Incorporate any provided tags as themes or categories
    - Create a structured template to fully develop the idea
    
    Title: {title}
    
    Tags (if available): {context}
    
    Content:`,
                  anthropic: `Please elaborate on the following idea with a compelling description template. Your content should:
    - Explain the core concept clearly and thoroughly
    - Highlight potential benefits and impact
    - Address key considerations and challenges
    - Suggest possible next steps and implementation
    - Include resources needed if applicable
    - Incorporate any provided tags as themes or categories
    - Create a structured template to fully develop the idea
    
    Idea Title: {title}
    
    Tags (if available): {context}
    
    Content:`,
                  gemini: `Please elaborate on the following idea with a compelling description template. Your content should:
    - Explain the core concept clearly and thoroughly
    - Highlight potential benefits and impact
    - Address key considerations and challenges
    - Suggest possible next steps and implementation
    - Include resources needed if applicable
    - Incorporate any provided tags as themes or categories
    - Create a structured template to fully develop the idea
    
    Idea Title: {title}
    
    Tags (if available): {context}
    
    Content:`,
                  ollama: `Develop this idea with compelling content. The description should:
    - Explain the core concept clearly and thoroughly
    - Highlight potential benefits and impact
    - Address key considerations and challenges
    - Suggest possible next steps and implementation
    - Include resources needed if applicable
    - Incorporate any provided tags as themes or categories
    - Create a structured template to fully develop the idea
    
    Title: {title}
    
    Tags (if available): {context}
    
    Content:`,
                  grok: `Develop this idea with compelling content. The description should:
    - Explain the core concept clearly and thoroughly
    - Highlight potential benefits and impact
    - Address key considerations and challenges
    - Suggest possible next steps and implementation
    - Include resources needed if applicable
    - Incorporate any provided tags as themes or categories
    - Create a structured template to fully develop the idea
    
    Title: {title}
    
    Tags (if available): {context}
    
    Content:`
            },
            task: {
                  openai: `Create a clear task description template. The content should:
    - Detail the specific requirements and objectives
    - Include important steps in a logical sequence
    - Mention relevant dependencies and prerequisites
    - Set clear success criteria and deliverables
    - Include estimated time/effort if relevant
    - Add any deadlines or timeline considerations
    - Incorporate any provided tags as categories or priorities
    - Create an actionable task template ready for assignment
    
    Title: {title}
    
    Tags (if available): {context}
    
    Content:`,
                  anthropic: `Please provide a clear description template for the following task. Your content should:
    - Detail the specific requirements and objectives
    - Include important steps in a logical sequence
    - Mention relevant dependencies and prerequisites
    - Set clear success criteria and deliverables
    - Include estimated time/effort if relevant
    - Add any deadlines or timeline considerations
    - Incorporate any provided tags as categories or priorities
    - Create an actionable task template ready for assignment
    
    Task Title: {title}
    
    Tags (if available): {context}
    
    Content:`,
                  gemini: `Please provide a clear description template for the following task. Your content should:
    - Detail the specific requirements and objectives
    - Include important steps in a logical sequence
    - Mention relevant dependencies and prerequisites
    - Set clear success criteria and deliverables
    - Include estimated time/effort if relevant
    - Add any deadlines or timeline considerations
    - Incorporate any provided tags as categories or priorities
    - Create an actionable task template ready for assignment
    
    Task Title: {title}
    
    Tags (if available): {context}
    
    Content:`,
                  ollama: `Create a clear task description template. The content should:
    - Detail the specific requirements and objectives
    - Include important steps in a logical sequence
    - Mention relevant dependencies and prerequisites
    - Set clear success criteria and deliverables
    - Include estimated time/effort if relevant
    - Add any deadlines or timeline considerations
    - Incorporate any provided tags as categories or priorities
    - Create an actionable task template ready for assignment
    
    Title: {title}
    
    Tags (if available): {context}
    
    Content:`,
                  grok: `Create a clear task description template. The content should:
    - Detail the specific requirements and objectives
    - Include important steps in a logical sequence
    - Mention relevant dependencies and prerequisites
    - Set clear success criteria and deliverables
    - Include estimated time/effort if relevant
    - Add any deadlines or timeline considerations
    - Incorporate any provided tags as categories or priorities
    - Create an actionable task template ready for assignment
    
    Title: {title}
    
    Tags (if available): {context}
    
    Content:`
            },
            reminder: {
                  openai: `Write a helpful reminder description template. The content should:
    - Specify what needs to be done in clear terms
    - Include important details and context
    - Mention any prerequisites or required materials
    - Note any related deadlines and timing information
    - Include any follow-up actions needed
    - Mention who else may be involved (if applicable)
    - Incorporate any provided tags as categories or priorities
    - Create a complete reminder template with all necessary information
    
    Title: {title}
    
    Tags (if available): {context}
    
    Content:`,
                  anthropic: `Please provide a helpful description template for the following reminder. Your content should:
    - Specify what needs to be done in clear terms
    - Include important details and context
    - Mention any prerequisites or required materials
    - Note any related deadlines and timing information
    - Include any follow-up actions needed
    - Mention who else may be involved (if applicable)
    - Incorporate any provided tags as categories or priorities
    - Create a complete reminder template with all necessary information
    
    Reminder Title: {title}
    
    Tags (if available): {context}
    
    Content:`,
                  gemini: `Please provide a helpful description template for the following reminder. Your content should:
    - Specify what needs to be done in clear terms
    - Include important details and context
    - Mention any prerequisites or required materials
    - Note any related deadlines and timing information
    - Include any follow-up actions needed
    - Mention who else may be involved (if applicable)
    - Incorporate any provided tags as categories or priorities
    - Create a complete reminder template with all necessary information
    
    Reminder Title: {title}
    
    Tags (if available): {context}
    
    Content:`,
                  ollama: `Write a helpful reminder description template. The content should:
    - Specify what needs to be done in clear terms
    - Include important details and context
    - Mention any prerequisites or required materials
    - Note any related deadlines and timing information
    - Include any follow-up actions needed
    - Mention who else may be involved (if applicable)
    - Incorporate any provided tags as categories or priorities
    - Create a complete reminder template with all necessary information
    
    Title: {title}
    
    Tags (if available): {context}
    
    Content:`,
                  grok: `Write a helpful reminder description template. The content should:
    - Specify what needs to be done in clear terms
    - Include important details and context
    - Mention any prerequisites or required materials
    - Note any related deadlines and timing information
    - Include any follow-up actions needed
    - Mention who else may be involved (if applicable)
    - Incorporate any provided tags as categories or priorities
    - Create a complete reminder template with all necessary information
    
    Title: {title}
    
    Tags (if available): {context}
    
    Content:`
            }
      },
      tags: {
            note: {
                  openai: `Generate relevant tags for this note. The tags should:
    - Be concise and specific (1-3 words each)
    - Cover key themes and categories
    - Reflect the main topic, subtopics, and notable elements
    - Be useful for organization and future retrieval
    - Include 3-5 tags total
    - Consider both title and content when available
    - ALWAYS include any work item numbers (like #12345) from the title or content as separate tags
    
    Content to analyze:
    {titleSection}{contentSection}{currentTagsSection}
    
    IMPORTANT: Return ONLY the tags as a simple comma-separated list with no explanations, markdown, formatting, or additional text:`,
                  anthropic: `Please provide 3-5 relevant tags for the following note. The tags should:
    - Be concise and specific (1-3 words each)
    - Cover key themes and categories
    - Reflect the main topic, subtopics, and notable elements
    - Be useful for organization and future retrieval
    - Consider both title and content when available
    - ALWAYS include any work item numbers (like #12345) from the title or content as separate tags
    
    {titleSection}{contentSection}{currentTagsSection}
    
    IMPORTANT: Return ONLY the tags as a simple comma-separated list with no explanations, markdown, formatting, or additional text:`,
                  gemini: `Generate exactly 3-5 relevant tags for this note based on the title and content. Tags should be concise (1-3 words each).

    {titleSection}{contentSection}{currentTagsSection}
    
    IMPORTANT REQUIREMENTS:
    - ALWAYS include any work item numbers (like #12345) from the title or content as one of your tags
    - If you see a work item number in the format #12345, include it exactly as written
    
    IMPORTANT FORMATTING INSTRUCTIONS:
    - Return ONLY the tags themselves
    - Use a simple comma-separated format
    - No numbering, bullet points, or markdown formatting
    - No explanations or descriptions
    - No introductory text or conclusions
    
    Example correct response:
    patient reporting, local save, cloud sync, #12345
    
    Tags:`,
                  ollama: `Generate relevant tags for this note. The tags should:
    - Be concise and specific (1-3 words each)
    - Cover key themes and categories
    - Reflect the main topic, subtopics, and notable elements
    - Be useful for organization and future retrieval
    - Include 3-5 tags total
    - Consider both title and content when available
    - ALWAYS include any work item numbers (like #12345) from the title or content as separate tags
    
    Content to analyze:
    {titleSection}{contentSection}{currentTagsSection}
    
    IMPORTANT: Return ONLY the tags as a simple comma-separated list with no explanations, markdown, formatting, or additional text:`,
                  grok: `Generate relevant tags for this note. The tags should:
    - Be concise and specific (1-3 words each)
    - Cover key themes and categories
    - Reflect the main topic, subtopics, and notable elements
    - Be useful for organization and future retrieval
    - Include 3-5 tags total
    - Consider both title and content when available
    - ALWAYS include any work item numbers (like #12345) from the title or content as separate tags
    
    Content to analyze:
    {titleSection}{contentSection}{currentTagsSection}
    
    IMPORTANT: Return ONLY the tags as a simple comma-separated list with no explanations, markdown, formatting, or additional text:`
            },
            idea: {
                  openai: `Generate relevant tags for this idea. The tags should:
    - Be concise and specific (1-3 words each)
    - Cover key themes and innovation areas
    - Reflect the concept, potential applications, and impact
    - Be useful for organization and future retrieval
    - Include 3-5 tags total
    - Consider both title and content when available
    - ALWAYS include any work item numbers (like #12345) from the title or content as separate tags
    
    Content to analyze:
    {titleSection}{contentSection}{currentTagsSection}
    
    IMPORTANT: Return ONLY the tags as a simple comma-separated list with no explanations, markdown, formatting, or additional text:`,
                  anthropic: `Please provide 3-5 relevant tags for the following idea. The tags should:
    - Be concise and specific (1-3 words each)
    - Cover key themes and innovation areas
    - Reflect the concept, potential applications, and impact
    - Be useful for organization and future retrieval
    - Consider both title and content when available
    - ALWAYS include any work item numbers (like #12345) from the title or content as separate tags
    
    {titleSection}{contentSection}{currentTagsSection}
    
    IMPORTANT: Return ONLY the tags as a simple comma-separated list with no explanations, markdown, formatting, or additional text:`,
                  gemini: `Generate exactly 3-5 relevant tags for this idea based on the title and content. Tags should be concise (1-3 words each).

    {titleSection}{contentSection}{currentTagsSection}
    
    IMPORTANT REQUIREMENTS:
    - ALWAYS include any work item numbers (like #12345) from the title or content as one of your tags
    - If you see a work item number in the format #12345, include it exactly as written
    
    IMPORTANT FORMATTING INSTRUCTIONS:
    - Return ONLY the tags themselves
    - Use a simple comma-separated format
    - No numbering, bullet points, or markdown formatting
    - No explanations or descriptions
    - No introductory text or conclusions
    
    Example correct response:
    innovation, product design, automation, #12345
    
    Tags:`,
                  ollama: `Generate relevant tags for this idea. The tags should:
    - Be concise and specific (1-3 words each)
    - Cover key themes and innovation areas
    - Reflect the concept, potential applications, and impact
    - Be useful for organization and future retrieval
    - Include 3-5 tags total
    - Consider both title and content when available
    - ALWAYS include any work item numbers (like #12345) from the title or content as separate tags
    
    Content to analyze:
    {titleSection}{contentSection}{currentTagsSection}
    
    IMPORTANT: Return ONLY the tags as a simple comma-separated list with no explanations, markdown, formatting, or additional text:`,
                  grok: `Generate relevant tags for this idea. The tags should:
    - Be concise and specific (1-3 words each)
    - Cover key themes and innovation areas
    - Reflect the concept, potential applications, and impact
    - Be useful for organization and future retrieval
    - Include 3-5 tags total
    - Consider both title and content when available
    - ALWAYS include any work item numbers (like #12345) from the title or content as separate tags
    
    Content to analyze:
    {titleSection}{contentSection}{currentTagsSection}
    
    IMPORTANT: Return ONLY the tags as a simple comma-separated list with no explanations, markdown, formatting, or additional text:`
            },
            task: {
                  openai: `Generate relevant tags for this task. The tags should:
    - Be concise and specific (1-3 words each)
    - Cover the task's category, priority, and domain
    - Reflect project affiliations and relevant skills
    - Be useful for filtering and organization
    - Include 3-5 tags total
    - Consider both title and content when available
    - ALWAYS include any work item numbers (like #12345) from the title or content as separate tags
    
    Content to analyze:
    {titleSection}{contentSection}{currentTagsSection}
    
    IMPORTANT: Return ONLY the tags as a simple comma-separated list with no explanations, markdown, formatting, or additional text:`,
                  anthropic: `Please provide 3-5 relevant tags for the following task. The tags should:
    - Be concise and specific (1-3 words each)
    - Cover the task's category, priority, and domain
    - Reflect project affiliations and relevant skills
    - Be useful for filtering and organization
    - Consider both title and content when available
    - ALWAYS include any work item numbers (like #12345) from the title or content as separate tags
    
    {titleSection}{contentSection}{currentTagsSection}
    
    IMPORTANT: Return ONLY the tags as a simple comma-separated list with no explanations, markdown, formatting, or additional text:`,
                  gemini: `Generate exactly 3-5 relevant tags for this task based on the title and content. Tags should be concise (1-3 words each).

    {titleSection}{contentSection}{currentTagsSection}
    
    IMPORTANT REQUIREMENTS:
    - ALWAYS include any work item numbers (like #12345) from the title or content as one of your tags
    - If you see a work item number in the format #12345, include it exactly as written
    
    IMPORTANT FORMATTING INSTRUCTIONS:
    - Return ONLY the tags themselves
    - Use a simple comma-separated format
    - No numbering, bullet points, or markdown formatting
    - No explanations or descriptions
    - No introductory text or conclusions
    
    Example correct response:
    development, bug fix, high priority, #12345
    
    Tags:`,
                  ollama: `Generate relevant tags for this task. The tags should:
    - Be concise and specific (1-3 words each)
    - Cover the task's category, priority, and domain
    - Reflect project affiliations and relevant skills
    - Be useful for filtering and organization
    - Include 3-5 tags total
    - Consider both title and content when available
    - ALWAYS include any work item numbers (like #12345) from the title or content as separate tags
    
    Content to analyze:
    {titleSection}{contentSection}{currentTagsSection}
    
    IMPORTANT: Return ONLY the tags as a simple comma-separated list with no explanations, markdown, formatting, or additional text:`,
                  grok: `Generate relevant tags for this task. The tags should:
    - Be concise and specific (1-3 words each)
    - Cover the task's category, priority, and domain
    - Reflect project affiliations and relevant skills
    - Be useful for filtering and organization
    - Include 3-5 tags total
    - Consider both title and content when available
    - ALWAYS include any work item numbers (like #12345) from the title or content as separate tags
    
    Content to analyze:
    {titleSection}{contentSection}{currentTagsSection}
    
    IMPORTANT: Return ONLY the tags as a simple comma-separated list with no explanations, markdown, formatting, or additional text:`
            },
            reminder: {
                  openai: `Generate relevant tags for this reminder. The tags should:
    - Be concise and specific (1-3 words each)
    - Cover timeframe, frequency, and category
    - Reflect the importance, context, and related areas
    - Be useful for filtering and organization
    - Include 3-5 tags total
    - Consider both title and content when available
    - ALWAYS include any work item numbers (like #12345) from the title or content as separate tags
    
    Content to analyze:
    {titleSection}{contentSection}{currentTagsSection}
    
    IMPORTANT: Return ONLY the tags as a simple comma-separated list with no explanations, markdown, formatting, or additional text:`,
                  anthropic: `Please provide 3-5 relevant tags for the following reminder. The tags should:
    - Be concise and specific (1-3 words each)
    - Cover timeframe, frequency, and category
    - Reflect the importance, context, and related areas
    - Be useful for filtering and organization
    - Consider both title and content when available
    - ALWAYS include any work item numbers (like #12345) from the title or content as separate tags
    
    {titleSection}{contentSection}{currentTagsSection}
    
    IMPORTANT: Return ONLY the tags as a simple comma-separated list with no explanations, markdown, formatting, or additional text:`,
                  gemini: `Generate exactly 3-5 relevant tags for this reminder based on the title and content. Tags should be concise (1-3 words each).

    {titleSection}{contentSection}{currentTagsSection}
    
    IMPORTANT REQUIREMENTS:
    - ALWAYS include any work item numbers (like #12345) from the title or content as one of your tags
    - If you see a work item number in the format #12345, include it exactly as written
    
    IMPORTANT FORMATTING INSTRUCTIONS:
    - Return ONLY the tags themselves
    - Use a simple comma-separated format
    - No numbering, bullet points, or markdown formatting
    - No explanations or descriptions
    - No introductory text or conclusions
    
    Example correct response:
    meeting, weekly, project update, #12345
    
    Tags:`,
                  ollama: `Generate relevant tags for this reminder. The tags should:
    - Be concise and specific (1-3 words each)
    - Cover timeframe, frequency, and category
    - Reflect the importance, context, and related areas
    - Be useful for filtering and organization
    - Include 3-5 tags total
    - Consider both title and content when available
    - ALWAYS include any work item numbers (like #12345) from the title or content as separate tags
    
    Content to analyze:
    {titleSection}{contentSection}{currentTagsSection}
    
    IMPORTANT: Return ONLY the tags as a simple comma-separated list with no explanations, markdown, formatting, or additional text:`,
                  grok: `Generate relevant tags for this reminder. The tags should:
    - Be concise and specific (1-3 words each)
    - Cover timeframe, frequency, and category
    - Reflect the importance, context, and related areas
    - Be useful for filtering and organization
    - Include 3-5 tags total
    - Consider both title and content when available
    - ALWAYS include any work item numbers (like #12345) from the title or content as separate tags
    
    Content to analyze:
    {titleSection}{contentSection}{currentTagsSection}
    
    IMPORTANT: Return ONLY the tags as a simple comma-separated list with no explanations, markdown, formatting, or additional text:`
            }
      }
};
