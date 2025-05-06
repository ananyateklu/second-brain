// promptConfig.ts
export const PROMPT_CONFIG = {
      title: {
            note: {
                  openai: `Generate a concise, descriptive title for this note. The title should:
    - Be clear and under 60 characters
    - Capture the main topic or purpose
    - Use natural language
    - Be specific but not verbose
    
    Content:
    {content}
    
    Generated Title:`,
                  anthropic: `Please provide a clear and concise title for the following note. Ensure it is under 60 characters and accurately reflects the content.
    
    Note Content:
    {content}
    
    Title:`,
                  gemini: `Please suggest a clear and concise title for the following note. Ensure it is under 60 characters and accurately reflects the content.
    
    Note Content:
    {content}
    
    Title:`,
                  llama: `Generate a concise, descriptive title for this note. The title should:
    - Be clear and under 60 characters
    - Capture the main topic or purpose
    - Use natural language
    - Be specific but not verbose
    
    Content:
    {content}
    
    Generated Title:`,
                  grok: `Generate a concise, descriptive title for this note. The title should:
    - Be clear and under 60 characters
    - Capture the main topic or purpose
    - Use natural language
    - Be specific but not verbose
    
    Content:
    {content}
    
    Generated Title:`
            },
            idea: {
                  openai: `Create a captivating, memorable title for this idea. The title should:
    - Be creative but clear, under 60 characters
    - Capture the innovative aspect
    - Be engaging and memorable
    - Reflect the potential impact
    
    Content:
    {content}
    
    Generated Title:`,
                  anthropic: `Please suggest a creative and clear title for the following idea. The title should be under 60 characters and highlight the innovative aspect.
    
    Idea Description:
    {content}
    
    Title:`,
                  gemini: `Please suggest a creative and clear title for the following idea. The title should be under 60 characters and highlight the innovative aspect.
    
    Idea Description:
    {content}
    
    Title:`,
                  llama: `Create a captivating, memorable title for this idea. The title should:
    - Be creative but clear, under 60 characters
    - Capture the innovative aspect
    - Be engaging and memorable
    - Reflect the potential impact
    
    Content:
    {content}
    
    Generated Title:`,
                  grok: `Create a captivating, memorable title for this idea. The title should:
    - Be creative but clear, under 60 characters
    - Capture the innovative aspect
    - Be engaging and memorable
    - Reflect the potential impact
    
    Content:
    {content}
    
    Generated Title:`
            },
            task: {
                  openai: `Generate a clear, action-oriented title for this task. The title should:
    - Be specific and under 60 characters
    - Start with a verb when possible
    - Clearly state the objective
    - Include key context
    
    Content:
    {content}
    
    Generated Title:`,
                  anthropic: `Please create an action-oriented title for the following task. Ensure it starts with a verb, is under 60 characters, and clearly states the objective.
    
    Task Details:
    {content}
    
    Title:`,
                  gemini: `Please create an action-oriented title for the following task. Ensure it starts with a verb, is under 60 characters, and clearly states the objective.
    
    Task Details:
    {content}
    
    Title:`,
                  llama: `Generate a clear, action-oriented title for this task. The title should:
    - Be specific and under 60 characters
    - Start with a verb when possible
    - Clearly state the objective
    - Include key context
    
    Content:
    {content}
    
    Generated Title:`,
                  grok: `Generate a clear, action-oriented title for this task. The title should:
    - Be specific and under 60 characters
    - Start with a verb when possible
    - Clearly state the objective
    - Include key context
    
    Content:
    {content}
    
    Generated Title:`
            },
            reminder: {
                  openai: `Create a clear, time-relevant title for this reminder. The title should:
    - Be specific and under 60 characters
    - Include relevant timing context
    - Be action-oriented
    - Be immediately understandable
    
    Content:
    {content}
    
    Generated Title:`,
                  anthropic: `Please provide a time-relevant title for the following reminder. Ensure it is under 60 characters, action-oriented, and includes relevant timing context.
    
    Reminder Details:
    {content}
    
    Title:`,
                  gemini: `Please provide a time-relevant title for the following reminder. Ensure it is under 60 characters, action-oriented, and includes relevant timing context.
    
    Reminder Details:
    {content}
    
    Title:`,
                  llama: `Create a clear, time-relevant title for this reminder. The title should:
    - Be specific and under 60 characters
    - Include relevant timing context
    - Be action-oriented
    - Be immediately understandable
    
    Content:
    {content}
    
    Generated Title:`,
                  grok: `Create a clear, time-relevant title for this reminder. The title should:
    - Be specific and under 60 characters
    - Include relevant timing context
    - Be action-oriented
    - Be immediately understandable
    
    Content:
    {content}
    
    Generated Title:`
            }
      },
      content: {
            note: {
                  openai: `Generate detailed, well-structured content for this note. The content should:
    - Expand on the title's topic
    - Be informative and clear
    - Include relevant details
    - Use proper formatting
    
    Title: {title}
    
    Content:{context}`,
                  anthropic: `Please provide a detailed and well-structured description for the following note. Ensure it expands on the title, is clear, and includes relevant details.
    
    Note Title: {title}
    
    Description:{context}`,
                  gemini: `Please provide a detailed and well-structured description for the following note. Ensure it expands on the title, is clear, and includes relevant details.
    
    Note Title: {title}
    
    Description:{context}`,
                  llama: `Generate detailed, well-structured content for this note. The content should:
    - Expand on the title's topic
    - Be informative and clear
    - Include relevant details
    - Use proper formatting
    
    Title: {title}
    
    Content:{context}`,
                  grok: `Generate detailed, well-structured content for this note. The content should:
    - Expand on the title's topic
    - Be informative and clear
    - Include relevant details
    - Use proper formatting
    
    Title: {title}
    
    Content:{context}`
            },
            idea: {
                  openai: `Develop this idea with compelling content. The description should:
    - Explain the core concept
    - Highlight potential benefits
    - Address key considerations
    - Suggest possible next steps
    
    Title: {title}
    
    Content:{context}`,
                  anthropic: `Please elaborate on the following idea with a compelling description. It should explain the core concept, highlight potential benefits, address key considerations, and suggest possible next steps.
    
    Idea Title: {title}
    
    Description:{context}`,
                  gemini: `Please elaborate on the following idea with a compelling description. It should explain the core concept, highlight potential benefits, address key considerations, and suggest possible next steps.
    
    Idea Title: {title}
    
    Description:{context}`,
                  llama: `Develop this idea with compelling content. The description should:
    - Explain the core concept
    - Highlight potential benefits
    - Address key considerations
    - Suggest possible next steps
    
    Title: {title}
    
    Content:{context}`,
                  grok: `Develop this idea with compelling content. The description should:
    - Explain the core concept
    - Highlight potential benefits
    - Address key considerations
    - Suggest possible next steps
    
    Title: {title}
    
    Content:{context}`
            },
            task: {
                  openai: `Create a clear task description. The content should:
    - Detail the specific requirements
    - Include any important steps
    - Mention relevant dependencies
    - Set clear success criteria
    
    Title: {title}
    
    Content:{context}`,
                  anthropic: `Please provide a clear description for the following task. It should detail the specific requirements, include important steps, mention relevant dependencies, and set clear success criteria.
    
    Task Title: {title}
    
    Description:{context}`,
                  gemini: `Please provide a clear description for the following task. It should detail the specific requirements, include important steps, mention relevant dependencies, and set clear success criteria.
    
    Task Title: {title}
    
    Description:{context}`,
                  llama: `Create a clear task description. The content should:
    - Detail the specific requirements
    - Include any important steps
    - Mention relevant dependencies
    - Set clear success criteria
    
    Title: {title}
    
    Content:{context}`,
                  grok: `Create a clear task description. The content should:
    - Detail the specific requirements
    - Include any important steps
    - Mention relevant dependencies
    - Set clear success criteria
    
    Title: {title}
    
    Content:{context}`
            },
            reminder: {
                  openai: `Write a helpful reminder description. The content should:
    - Specify what needs to be done
    - Include important details
    - Mention any prerequisites
    - Note any related deadlines
    
    Title: {title}
    
    Content:{context}`,
                  anthropic: `Please provide a helpful description for the following reminder. It should specify what needs to be done, include important details, mention any prerequisites, and note any related deadlines.
    
    Reminder Title: {title}
    
    Description:{context}`,
                  gemini: `Please provide a helpful description for the following reminder. It should specify what needs to be done, include important details, mention any prerequisites, and note any related deadlines.
    
    Reminder Title: {title}
    
    Description:{context}`,
                  llama: `Write a helpful reminder description. The content should:
    - Specify what needs to be done
    - Include important details
    - Mention any prerequisites
    - Note any related deadlines
    
    Title: {title}
    
    Content:{context}`,
                  grok: `Write a helpful reminder description. The content should:
    - Specify what needs to be done
    - Include important details
    - Mention any prerequisites
    - Note any related deadlines
    
    Title: {title}
    
    Content:{context}`
            }
      },
      tags: {
            note: {
                  openai: `Generate relevant tags for this note. The tags should:
    - Be concise and specific
    - Cover key themes and categories
    - Be useful for organization
    - Include 3-5 tags total
    
    Content to analyze:
    {titleSection}{contentSection}{currentTagsSection}
    
    Generate tags as a comma-separated list:`,
                  anthropic: `Please provide 3-5 relevant tags for the following note. Ensure the tags are concise, specific, and cover key themes.
    
    {titleSection}{contentSection}{currentTagsSection}
    
    Tags:`,
                  gemini: `Please provide 3-5 relevant tags for the following note. Ensure the tags are concise, specific, and cover key themes.
    
    {titleSection}{contentSection}{currentTagsSection}
    
    Tags:`,
                  llama: `Generate relevant tags for this note. The tags should:
    - Be concise and specific
    - Cover key themes and categories
    - Be useful for organization
    - Include 3-5 tags total
    
    Content to analyze:
    {titleSection}{contentSection}{currentTagsSection}
    
    Generate tags as a comma-separated list:`,
                  grok: `Generate relevant tags for this note. The tags should:
    - Be concise and specific
    - Cover key themes and categories
    - Be useful for organization
    - Include 3-5 tags total
    
    Content to analyze:
    {titleSection}{contentSection}{currentTagsSection}
    
    Generate tags as a comma-separated list:`
            },
            idea: {
                  openai: `Generate relevant tags for this idea. The tags should:
    - Be concise and specific
    - Cover key themes and categories
    - Be useful for organization
    - Include 3-5 tags total
    
    Content to analyze:
    {titleSection}{contentSection}{currentTagsSection}
    
    Generate tags as a comma-separated list:`,
                  anthropic: `Please provide 3-5 relevant tags for the following idea. Ensure the tags are concise, specific, and cover key themes.
    
    {titleSection}{contentSection}{currentTagsSection}
    
    Tags:`,
                  gemini: `Please provide 3-5 relevant tags for the following idea. Ensure the tags are concise, specific, and cover key themes.
    
    {titleSection}{contentSection}{currentTagsSection}
    
    Tags:`,
                  llama: `Generate relevant tags for this idea. The tags should:
    - Be concise and specific
    - Cover key themes and categories
    - Be useful for organization
    - Include 3-5 tags total
    
    Content to analyze:
    {titleSection}{contentSection}{currentTagsSection}
    
    Generate tags as a comma-separated list:`,
                  grok: `Generate relevant tags for this idea. The tags should:
    - Be concise and specific
    - Cover key themes and categories
    - Be useful for organization
    - Include 3-5 tags total
    
    Content to analyze:
    {titleSection}{contentSection}{currentTagsSection}
    
    Generate tags as a comma-separated list:`
            },
            task: {
                  openai: `Generate relevant tags for this task. The tags should:
    - Be concise and specific
    - Cover key themes and categories
    - Be useful for organization
    - Include 3-5 tags total
    
    Content to analyze:
    {titleSection}{contentSection}{currentTagsSection}
    
    Generate tags as a comma-separated list:`,
                  anthropic: `Please provide 3-5 relevant tags for the following task. Ensure the tags are concise, specific, and cover key themes.
    
    {titleSection}{contentSection}{currentTagsSection}
    
    Tags:`,
                  gemini: `Please provide 3-5 relevant tags for the following task. Ensure the tags are concise, specific, and cover key themes.
    
    {titleSection}{contentSection}{currentTagsSection}
    
    Tags:`,
                  llama: `Generate relevant tags for this task. The tags should:
    - Be concise and specific
    - Cover key themes and categories
    - Be useful for organization
    - Include 3-5 tags total
    
    Content to analyze:
    {titleSection}{contentSection}{currentTagsSection}
    
    Generate tags as a comma-separated list:`,
                  grok: `Generate relevant tags for this task. The tags should:
    - Be concise and specific
    - Cover key themes and categories
    - Be useful for organization
    - Include 3-5 tags total
    
    Content to analyze:
    {titleSection}{contentSection}{currentTagsSection}
    
    Generate tags as a comma-separated list:`
            },
            reminder: {
                  openai: `Generate relevant tags for this reminder. The tags should:
    - Be concise and specific
    - Cover key themes and categories
    - Be useful for organization
    - Include 3-5 tags total
    
    Content to analyze:
    {titleSection}{contentSection}{currentTagsSection}
    
    Generate tags as a comma-separated list:`,
                  anthropic: `Please provide 3-5 relevant tags for the following reminder. Ensure the tags are concise, specific, and cover key themes.
    
    {titleSection}{contentSection}{currentTagsSection}
    
    Tags:`,
                  gemini: `Please provide 3-5 relevant tags for the following reminder. Ensure the tags are concise, specific, and cover key themes.
    
    {titleSection}{contentSection}{currentTagsSection}
    
    Tags:`,
                  llama: `Generate relevant tags for this reminder. The tags should:
    - Be concise and specific
    - Cover key themes and categories
    - Be useful for organization
    - Include 3-5 tags total
    
    Content to analyze:
    {titleSection}{contentSection}{currentTagsSection}
    
    Generate tags as a comma-separated list:`,
                  grok: `Generate relevant tags for this reminder. The tags should:
    - Be concise and specific
    - Cover key themes and categories
    - Be useful for organization
    - Include 3-5 tags total
    
    Content to analyze:
    {titleSection}{contentSection}{currentTagsSection}
    
    Generate tags as a comma-separated list:`
            }
      }
};
