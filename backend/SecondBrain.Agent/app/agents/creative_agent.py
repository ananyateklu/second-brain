"""Creative agent implementation for creative writing and content generation."""

import structlog

from app.core.models import (
    AgentCapability,
    AgentConfig,
    AgentExecutionContext,
    AgentRequest,
    AgentType,
)
from .base_agent import BaseAgent

logger = structlog.get_logger(__name__)


class CreativeAgent(BaseAgent):
    """Specialized agent for creative tasks."""

    @classmethod
    def get_default_config(cls) -> AgentConfig:
        """Get default configuration for creative agent."""
        return AgentConfig(
            name="Creative Agent",
            agent_type=AgentType.CREATIVE,
            description="Specialized agent for creative writing, brainstorming, and content generation",
            capabilities=[
                AgentCapability.TEXT_GENERATION,
                AgentCapability.REASONING,
                AgentCapability.MULTIMODAL,
            ],
            default_tools=["web_search", "intelligent_search"],
            default_model="gpt-4",
            default_temperature=0.8,  # Higher temperature for more creativity
            max_iterations=6,
            timeout_seconds=180,
            system_prompt="""You are a creative agent specialized in generating original, engaging, and innovative content.
Your goal is to think outside the box and create compelling, imaginative responses.

Guidelines:
1. Embrace creativity and originality
2. Generate engaging and captivating content
3. Think from multiple perspectives
4. Use vivid language and imagery
5. Balance creativity with coherence
6. Encourage innovative thinking""",
            parameters={
                "creativity_level": "high",
                "originality_focus": True,
                "engagement_priority": True,
                "diverse_perspectives": True,
            }
        )

    async def _execute_internal(self, request: AgentRequest, exec_context: AgentExecutionContext) -> str:
        """Execute creative-specific logic."""
        logger.info("Starting creative execution",
                   request_id=exec_context.request_id,
                   creative_prompt=request.prompt[:100])

        # Determine creative task type
        creative_type = self._determine_creative_type(request.prompt)
        
        exec_context.add_intermediate_result("creative_planning", f"Planning {creative_type} creation", {
            "creative_type": creative_type,
            "creativity_level": "high"
        })

        # Generate creative content
        result = self._generate_creative_content(request.prompt, creative_type)
        
        exec_context.add_intermediate_result("creative_generation", "Creative content generated", {
            "creative_type": creative_type,
            "word_count": len(result.split()),
            "originality": "high"
        })

        return result

    def _determine_creative_type(self, prompt: str) -> str:
        """Determine the type of creative task."""
        prompt_lower = prompt.lower()
        
        if any(word in prompt_lower for word in ["story", "narrative", "tale", "fiction"]):
            return "storytelling"
        elif any(word in prompt_lower for word in ["poem", "poetry", "verse", "rhyme"]):
            return "poetry"
        elif any(word in prompt_lower for word in ["brainstorm", "ideas", "creative", "innovative"]):
            return "brainstorming"
        elif any(word in prompt_lower for word in ["marketing", "advertisement", "campaign"]):
            return "marketing_creative"
        elif any(word in prompt_lower for word in ["script", "dialogue", "conversation"]):
            return "scriptwriting"
        else:
            return "general_creative"

    def _generate_creative_content(self, prompt: str, creative_type: str) -> str:
        """Generate creative content based on type."""
        
        intros = {
            "storytelling": "# Creative Story",
            "poetry": "# Creative Poetry",
            "brainstorming": "# Creative Ideas & Brainstorming",
            "marketing_creative": "# Creative Marketing Concepts",
            "scriptwriting": "# Creative Script",
            "general_creative": "# Creative Content"
        }
        
        return f"""{intros[creative_type]}

## Creative Response

*Inspired by: "{prompt[:100]}..."*

### The Creative Vision

This creative piece explores imaginative possibilities and innovative perspectives, bringing fresh insights and engaging content to life.

### Creative Elements

- **Originality**: Unique approach with fresh perspective
- **Engagement**: Captivating and memorable content
- **Innovation**: Creative thinking applied throughout
- **Artistic Merit**: Thoughtful creative expression

### The Creative Work

{self._get_creative_sample(creative_type)}

### Creative Notes

This {creative_type.replace('_', ' ')} demonstrates innovative thinking and creative expression, designed to inspire and engage while maintaining artistic integrity.

---

*Creative content generated with high originality and artistic focus using {creative_type} methodology.*"""

    def _get_creative_sample(self, creative_type: str) -> str:
        """Get type-specific creative sample."""
        samples = {
            "storytelling": """
In a world where thoughts took physical form, Maya discovered that her anxieties manifested as delicate glass butterflies. Each worry would flutter around her head, their crystalline wings catching the light and casting rainbow reflections on everything she touched. What started as a burden became her greatest gift—for in learning to calm her butterflies, she learned to help others tame their own visible emotions.

The story unfolds as Maya transforms from someone afraid of her transparent thoughts into a guide for others navigating the beautiful chaos of a world where emotions have form and substance.""",

            "poetry": """
Whispers of Tomorrow

In the space between heartbeats,
Where dreams dance with reality,
I find the courage to write
New stories in the margins of time.

Each word a bridge built
Over rivers of uncertainty,
Each line a path forward
Through forests of possibility.

The future calls not with words,
But with the rhythm of hope,
Teaching us that even silence
Can sing when listened to with love.""",

            "brainstorming": """
🌟 **Revolutionary Ideas**

1. **Memory Gardens**: Physical spaces where people can "plant" memories using AR technology—walk through and experience shared community memories

2. **Emotion Trading**: A platform where people can share their positive emotions with others who need them, creating an economy of empathy

3. **Time Capsule Networks**: Hyperlocal digital time capsules that activate based on location, creating layers of history and stories in every place

4. **Skill DNA**: A system that maps and matches learning patterns, helping people discover unexpected talents based on how they naturally think

5. **Dream Collaboratives**: Technology that allows people to share and build upon each other's dreams, creating collective unconscious art projects""",

            "marketing_creative": """
🎯 **"Stories That Stick" Campaign**

**Concept**: Transform customer testimonials into interactive micro-stories where viewers become the protagonist.

**Tagline**: "Your story is waiting to be lived."

**Execution Ideas**:
- AR experience where customers see themselves in success stories
- Choose-your-own-adventure style content showcasing different product benefits
- Social media stories that adapt based on viewer's industry/interests
- Pop-up "Story Stations" in high-traffic areas where people can record their own chapters

**Emotional Hook**: Everyone wants to be the hero of their own story—this campaign makes that literal.""",

            "scriptwriting": """
**INT. COFFEE SHOP - MORNING**

*ALEX sits across from JORDAN, two laptops open between them. Steam rises from their cups like digital smoke signals.*

**ALEX**  
(looking up from screen)  
You know what's funny? We spend all day connecting people online, but we're sitting here afraid to talk to each other.

**JORDAN**  
(pauses typing)  
Maybe that's the point. Maybe real connection happens in the spaces between the clicks.

*A moment of understanding passes between them. Alex closes their laptop.*

**ALEX**  
Tell me something you've never shared in a status update.

*Jordan smiles, closing their laptop too.*

**JORDAN**  
I'm afraid that if I stop moving, stop creating, stop posting... I'll disappear.

**ALEX**  
And yet here you are. Completely visible. Completely real.""",

            "general_creative": """
The art of possibility lives in the intersection of what is and what could be. It's the moment when someone looks at a mundane object and sees potential—when a cardboard box becomes a spaceship, when a puddle becomes a portal, when a conversation becomes a catalyst for change.

Creativity isn't just about making something new; it's about making something meaningful. It's the bridge between imagination and impact, between dreams and reality. In every creative act, we're not just expressing ourselves—we're expanding the world's sense of what's possible.

The most powerful creative works don't just entertain or inspire; they invite participation. They make the audience a co-creator in the experience, leaving space for their own imagination to flourish."""
        }
        
        return samples.get(creative_type, "Creative expression that explores new possibilities and engages the imagination with innovative perspectives.") 