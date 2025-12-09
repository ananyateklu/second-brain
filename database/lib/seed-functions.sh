#!/bin/bash
# ============================================================================
# Seed Functions Module
# ============================================================================
# Seed data generation functions and templates for RAG/Agent testing

# ============================================================================
# Seed Data Templates - Realistic Notes for RAG/Agent Testing
# ============================================================================

# Topics and their associated data
SEED_TOPICS=(
    "technology"
    "productivity"
    "learning"
    "health"
    "cooking"
    "travel"
    "science"
    "philosophy"
    "finance"
    "creative"
    "project"
    "personal"
)

# Title templates by topic index (matching SEED_TOPICS order)
SEED_TITLES_0="Implementing Microservices Architecture|Understanding Docker and Containerization|GraphQL vs REST API Design|Machine Learning Model Deployment|Kubernetes Cluster Management|TypeScript Advanced Patterns|React Performance Optimization|Database Indexing Strategies|CI/CD Pipeline Configuration|WebSocket Communication|Redis Caching Patterns|AWS Lambda Serverless|PostgreSQL Query Tips|Git Branching Strategies|API Rate Limiting|OAuth 2.0 Flow|Prometheus Monitoring|Docker Compose Setup|Nginx Load Balancer|Event-Driven Kafka"

SEED_TITLES_1="Morning Routine Peak Performance|Time Blocking Methodology|GTD Implementation Guide|Pomodoro Technique Deep Dive|Weekly Review Template|Email Zero Inbox Strategy|Meeting Efficiency Guide|Task Prioritization Matrix|Focus Mode Setup|Batch Processing Strategy|Deep Work Planning|Automation Tasks|Energy Management|Decision Fatigue Prevention|Context Switching Tips|Digital Minimalism|Workspace Organization|Weekly Planning|Daily Standup Guide|Procrastination Breaking"

SEED_TITLES_2="Spaced Repetition Setup|Active Recall Methods|Mind Mapping Topics|Note-Taking Systems|Feynman Technique Guide|Learning Languages|Reading Comprehension|Memory Palace Guide|Deliberate Practice|Meta-Learning Skills|Second Brain Method|Knowledge Management|Book Summary Template|Course Evaluation|Learning Path Design|Study Group Tips|Skill Acquisition|Educational Channels|Podcast Learning|Documentation Skills"

SEED_TITLES_3="Strength Training Design|HIIT Workout Routines|Sleep Optimization|Nutrition Tracking|Stress Management|Meditation Guide|Flexibility Mobility|Hydration Tracking|Standing Desk Setup|Eye Strain Prevention|Meal Prep Planning|Supplement Research|Recovery Rest Days|Heart Rate Training|Walking Meetings|Desk Stretches|Mental Health Tips|Caffeine Management|Screen Time Limits|Breathing Exercises"

SEED_TITLES_4="Batch Cooking Guide|Knife Skills Basics|Stock Broth Making|Sourdough Starter|Pasta From Scratch|Wok Techniques|BBQ Smoking Methods|Fermentation Guide|Spice Blends|Quick Weeknight Meals|Budget Meal Planning|Kitchen Equipment|Food Storage Tips|Seasonal Cooking|International Cuisine|Vegetarian Recipes|Dessert Techniques|Sauce Fundamentals|Grilling Guide|Pressure Cooker Tips"

SEED_TITLES_5="Packing List Guide|Travel Rewards Tips|Airport Efficiency|Travel Languages|Photography Gear|Budget Travel|Solo Travel Safety|Travel Insurance|Jet Lag Recovery|Transportation Apps|Cultural Etiquette|Restaurant Finding|Accommodation Tips|Document Organization|International SIM|Money Exchange|Travel Health|Luggage Selection|Flight Booking|Destination Research"

SEED_TITLES_6="Quantum Computing Basics|CRISPR Explained|Climate Data Analysis|Neuroscience Learning|Black Holes Study|Evolutionary Biology|Chemistry Safety|Physics Problems|Microbiology Basics|Statistical Methods|Scientific Method|Research Papers|Peer Review Guide|Lab Notebook Tips|Experiment Design|Data Visualization|Hypothesis Testing|Literature Review|Science Communication|Research Reproducibility"

SEED_TITLES_7="Stoicism Practice|Technology Ethics|Existentialism Concepts|Eastern Philosophy|Critical Thinking|Philosophy of Mind|Free Will Debate|Epistemology Theory|Political Philosophy|Aesthetics Theory|Philosophy Science|Moral Dilemmas|Greek Philosophy|Buddhist Principles|Phenomenology Intro|Language Philosophy|AI Ethics|Meaning Purpose|Consciousness Studies|Argument Structure"

SEED_TITLES_8="Investment Strategy|Budgeting Setup|Emergency Fund|Retirement Accounts|Tax Optimization|Debt Payoff|Real Estate Notes|Stock Analysis|Crypto Research|Financial Independence|Insurance Review|Estate Planning|Credit Score Tips|Expense Tracking|Passive Income|Side Hustle Guide|Net Worth Tracking|Financial Goals|Compound Interest|Risk Assessment"

SEED_TITLES_9="Daily Writing Practice|Character Development|World Building|Plot Structure|Dialogue Tips|Creative Blocks|Journaling Prompts|Poetry Forms|Short Story Ideas|Novel Outline|Editing Process|Writing Groups|Publishing Research|Beta Readers|Writing Productivity|Genre Conventions|Voice Development|Fiction Research|Writing Tools|Creative Exercises"

SEED_TITLES_10="Project Kickoff|Stakeholder Management|Risk Matrix|Sprint Planning|Retrospective Format|Kanban Setup|Resource Allocation|Timeline Estimation|Communication Plan|Status Reports|Requirements Process|User Stories|Acceptance Criteria|Technical Debt|Release Planning|Team Velocity|Scope Management|Change Requests|QA Checklist|Project Closure"

SEED_TITLES_11="Goal Setting Framework|Habit Tracking|Self-Reflection|Values Exercise|Life Vision|Personal SWOT|Relationship Tips|Gratitude Practice|Boundary Setting|Self-Care Routine|Personal Branding|Networking Strategy|Finding Mentors|Career Planning|Work-Life Balance|Finance Review|Health Goals|Learning Goals|Social Connection|Development Books"

# Content templates by topic index
SEED_CONTENT_0="## Overview

Modern software development requires understanding distributed systems. This note captures key insights from implementing production solutions.

## Key Concepts

When building scalable applications, consider these principles:
- **Horizontal scaling** allows adding more machines
- **Vertical scaling** means upgrading existing hardware
- **Load balancing** distributes traffic across servers
- **Caching** reduces database load

## Implementation Details

The architecture follows a microservices pattern:
1. **API Gateway** - Routes requests and handles auth
2. **Service Mesh** - Manages inter-service communication
3. **Message Queue** - Enables async processing
4. **Database Cluster** - Provides data persistence

## Next Steps

- [ ] Set up monitoring dashboard
- [ ] Configure alerting rules
- [ ] Document API endpoints
- [ ] Create runbook for incidents"

SEED_CONTENT_1="## The Problem

Most productivity systems fail because they dont account for energy levels. This framework addresses that gap.

## Core Principles

1. **Energy Mapping** - Track energy levels to identify patterns
2. **Task Categorization** - Classify tasks by cognitive demand
3. **Strategic Scheduling** - Match tasks to energy periods
4. **Buffer Time** - Include transition time between activities

## Daily Structure

### Morning Block (High Energy)
- Deep work on important projects
- Complex problem-solving tasks
- Creative work requiring focus

### Afternoon Block (Medium Energy)
- Collaborative work and meetings
- Email and communication
- Administrative tasks

## Weekly Review Checklist

- [ ] Review completed tasks
- [ ] Assess goal progress
- [ ] Identify blockers
- [ ] Plan next week priorities"

SEED_CONTENT_2="## Learning Philosophy

Effective learning is about creating meaningful connections between ideas and applying knowledge in practice.

## The Learning Loop

1. **Encounter** - First exposure to new information
2. **Encode** - Transform into your own words
3. **Connect** - Link to existing knowledge
4. **Apply** - Use in real situations
5. **Teach** - Explain to others
6. **Review** - Spaced repetition

## Active Recall Techniques

Instead of writing statements, phrase as questions:
- Bad: Photosynthesis converts light to energy
- Good: How do plants convert light into energy?

## Book Processing Workflow

1. **First Pass** - Quick skim for structure
2. **Second Pass** - Active reading with highlights
3. **Third Pass** - Create summary notes
4. **Integration** - Connect to existing notes"

SEED_CONTENT_3="## Fitness Philosophy

Health optimization is about sustainable habits that compound over time. Focus on consistency over intensity.

## Training Principles

### Progressive Overload
Gradually increase training stimulus:
- Add weight
- Increase reps
- Reduce rest time
- Improve form

### Recovery Priority
Training adaptations happen during rest:
- 7-9 hours sleep
- Rest days between intense sessions
- Deload weeks every 4-6 weeks

## Nutrition Guidelines

**Protein**: 0.8-1g per pound bodyweight
**Carbs**: Match activity level
**Fats**: 25-35% of calories
**Water**: Half bodyweight in ounces

## Sleep Optimization

1. Consistent sleep/wake times
2. Dark, cool room (65-68F)
3. No screens 1 hour before bed
4. Limit caffeine after 2pm"

SEED_CONTENT_4="## Kitchen Philosophy

Good cooking is about understanding fundamentals, not following recipes blindly.

## Essential Techniques

### Heat Control
- **High heat**: Searing, stir-frying
- **Medium heat**: Sauteing, pan-frying
- **Low heat**: Braising, simmering

### Seasoning Layers
1. Season while cooking, not just at end
2. Build flavor at each step
3. Taste continuously
4. Finish with acid (lemon, vinegar)

## Mise en Place

Prepare everything before cooking:
- [ ] Read recipe completely
- [ ] Gather all ingredients
- [ ] Prep vegetables
- [ ] Measure seasonings
- [ ] Preheat oven/pan

## Equipment Priorities

Must-have:
- Sharp chef knife
- Cast iron skillet
- Dutch oven
- Instant-read thermometer"

SEED_CONTENT_5="## Travel Philosophy

The best trips balance planning with spontaneity. Have a framework but leave room for serendipity.

## Pre-Trip Checklist

### Documents
- [ ] Passport (6+ months validity)
- [ ] Visas if required
- [ ] Travel insurance
- [ ] Copies of documents
- [ ] Emergency contacts

### Packing Strategy
1. **Capsule wardrobe**: Mix and match pieces
2. **Roll dont fold**: Saves space
3. **Wear bulkiest items**: On the plane
4. **Pack light**: One bag if possible

## On-the-Ground

### Navigation
- Download offline maps
- Learn basic local phrases
- Have backup transportation apps
- Screenshot important addresses

## Post-Trip Processing

1. Backup all photos
2. Journal key memories
3. Review expenses
4. Update packing list"

SEED_CONTENT_6="## Scientific Thinking

Science is a method for reducing uncertainty through systematic observation and experimentation.

## The Scientific Method

1. **Observation**: Notice something interesting
2. **Question**: Formulate specific inquiry
3. **Hypothesis**: Propose testable explanation
4. **Experiment**: Design controlled test
5. **Analysis**: Examine results statistically
6. **Conclusion**: Support or refute hypothesis

## Critical Evaluation

### Assessing Research Quality
- **Sample size**: Larger is generally better
- **Control group**: Essential for comparison
- **Replication**: Has it been repeated?
- **Peer review**: Published in reputable journals?

## Common Fallacies

- **Correlation vs causation**: A correlates with B does not mean A causes B
- **Cherry picking**: Selecting only supporting evidence
- **Appeal to nature**: Natural doesnt mean better
- **Anecdote as evidence**: Personal stories arent data"

SEED_CONTENT_7="## Philosophical Inquiry

Philosophy asks fundamental questions about existence, knowledge, ethics, and meaning.

## Major Branches

### Epistemology
- What can we know?
- How do we know it?
- What justifies belief?

### Ethics
- What is right and wrong?
- How should we live?
- What do we owe others?

### Metaphysics
- What exists?
- What is the nature of reality?
- Do we have free will?

## Practical Philosophy - Stoic Principles
1. **Focus on what you can control**: Actions and judgments
2. **Accept what you cannot**: External events
3. **Practice negative visualization**: Imagine loss to appreciate present
4. **Memento mori**: Remember death to live fully

## Daily Practice

- Question assumptions
- Seek opposing viewpoints
- Distinguish facts from opinions
- Practice intellectual humility"

SEED_CONTENT_8="## Financial Framework

Building wealth is about consistent habits, compound growth, and avoiding major mistakes.

## Core Principles

1. **Spend less than you earn**: The foundation
2. **Invest the difference**: Put money to work
3. **Diversify**: Dont put all eggs in one basket
4. **Think long-term**: Time in market beats timing market
5. **Minimize fees**: They compound negatively

## Priority Order

1. Emergency fund (3-6 months expenses)
2. Employer 401k match (free money)
3. High-interest debt payoff
4. Max tax-advantaged accounts
5. Taxable brokerage account

## Budget Framework - 50/30/20 Rule
- **50% Needs**: Housing, utilities, food, transport
- **30% Wants**: Entertainment, dining, hobbies
- **20% Savings**: Investments, debt payoff

## Key Metrics

- **Net worth**: Assets minus liabilities
- **Savings rate**: Percentage of income saved
- **Expense ratio**: Investment fund fees"

SEED_CONTENT_9="## Creative Process

Creativity isnt a gift - its a practice. The muse visits those who show up consistently.

## Daily Writing Practice

### Morning Pages
- Write 3 pages longhand
- Dont edit or censor
- Do it first thing
- No one reads these

### Writing Prompts
- What if...
- The last time I felt...
- In five years...
- The thing no one knows...

## Story Structure - Three-Act Framework
1. **Setup**: Introduce character and world
2. **Confrontation**: Conflict and complications
3. **Resolution**: Climax and denouement

## Editing Process

1. **First draft**: Get it down, dont look back
2. **Rest period**: Distance for objectivity
3. **Structural edit**: Big picture changes
4. **Line edit**: Sentence-level polish
5. **Proofread**: Final error check"

SEED_CONTENT_10="## Project Management Philosophy

Successful projects balance process with pragmatism. Too much process creates overhead; too little creates chaos.

## Project Phases

1. **Initiation**: Define scope and stakeholders
2. **Planning**: Create timeline and resources
3. **Execution**: Do the work
4. **Monitoring**: Track progress and adjust
5. **Closure**: Deliver and document

## Sprint Planning Template

### Sprint Goals
1. Primary objective
2. Secondary objectives
3. Nice-to-haves

## Meeting Templates

### Daily Standup (15 min)
- What did you complete?
- What are you working on?
- Any blockers?

### Retrospective
- What went well?
- What didnt go well?
- What will we change?

## Success Metrics

- Delivered on time
- Within budget
- Met acceptance criteria
- Stakeholder satisfaction"

SEED_CONTENT_11="## Personal Development Framework

Growth happens at the intersection of intention, action, and reflection.

## Goal Setting Process

### Vision (10 years)
What does ideal life look like?
- Career
- Relationships
- Health
- Finances
- Growth

### Goals (1 year)
What milestones move toward vision?
- [ ] Goal 1
- [ ] Goal 2
- [ ] Goal 3

## Weekly Review Questions

1. What did I accomplish?
2. What am I grateful for?
3. What did I learn?
4. What would I do differently?
5. Whats most important next week?

## Habit Tracking - Keystone Habits
- Morning routine
- Exercise
- Reading
- Reflection

## Self-Care Categories

- **Physical**: Exercise, sleep, nutrition
- **Mental**: Learning, challenge, creativity
- **Emotional**: Relationships, therapy, journaling
- **Spiritual**: Meditation, nature, purpose"

# Tags by topic index (matching SEED_TOPICS order)
SEED_TAGS_0="programming development software engineering architecture devops backend frontend api database cloud"
SEED_TAGS_1="workflow efficiency systems habits organization time-management focus deep-work planning"
SEED_TAGS_2="education study memory knowledge skills books reading courses growth"
SEED_TAGS_3="fitness wellness exercise nutrition sleep recovery mental-health lifestyle"
SEED_TAGS_4="recipes food kitchen techniques meal-prep cuisine ingredients cooking-tips"
SEED_TAGS_5="destinations planning packing tips adventures culture exploration budget-travel"
SEED_TAGS_6="research physics biology chemistry data analysis experiments studies"
SEED_TAGS_7="thinking ethics wisdom stoicism mindset reasoning critical-thinking ideas"
SEED_TAGS_8="investing money budget savings retirement wealth-building personal-finance"
SEED_TAGS_9="writing storytelling fiction creativity ideas inspiration craft process"
SEED_TAGS_10="management planning agile scrum teams leadership execution delivery"
SEED_TAGS_11="goals self-improvement reflection values habits growth mindset purpose"

# Folders for organization
SEED_FOLDERS=(
    ""
    ""
    ""
    ""
    "Work"
    "Work"
    "Personal"
    "Personal"
    "Learning"
    "Learning"
    "Projects"
    "Reference"
)

# ============================================================================
# Seed Functions
# ============================================================================

# List available users in the database
seed_list_users() {
    local port=$1
    local user=$2
    local host=$3
    local password=$4
    
    run_sql "$port" "$user" "$host" "
        SELECT id || '|' || email || '|' || display_name 
        FROM users 
        WHERE is_active = true 
        ORDER BY created_at;
    " "$password"
}

# Validate that a user exists
seed_validate_user() {
    local port=$1
    local user=$2
    local host=$3
    local password=$4
    local user_id=$5
    
    local result=$(run_sql "$port" "$user" "$host" "
        SELECT 1 FROM users WHERE id = '$user_id' AND is_active = true;
    " "$password")
    
    [ "$result" = "1" ]
}

# Get a random element from an array
get_random_element() {
    local arr_name=$1
    # Use indirect variable expansion for bash 3.2+ compatibility
    eval "local len=\${#${arr_name}[@]}"
    if [ $len -eq 0 ]; then
        echo ""
        return
    fi
    local idx=$((RANDOM % len))
    eval "echo \"\${${arr_name}[$idx]}\""
}

# Get random tags from a topic's tag list
get_random_tags() {
    local topic_idx=$1
    local num_tags=$2
    
    # Get tags string by topic index
    local tags_str=""
    case $topic_idx in
        0) tags_str="$SEED_TAGS_0" ;;
        1) tags_str="$SEED_TAGS_1" ;;
        2) tags_str="$SEED_TAGS_2" ;;
        3) tags_str="$SEED_TAGS_3" ;;
        4) tags_str="$SEED_TAGS_4" ;;
        5) tags_str="$SEED_TAGS_5" ;;
        6) tags_str="$SEED_TAGS_6" ;;
        7) tags_str="$SEED_TAGS_7" ;;
        8) tags_str="$SEED_TAGS_8" ;;
        9) tags_str="$SEED_TAGS_9" ;;
        10) tags_str="$SEED_TAGS_10" ;;
        11) tags_str="$SEED_TAGS_11" ;;
    esac
    
    local -a tags_arr=($tags_str)
    local -a selected=()
    local len=${#tags_arr[@]}
    
    # Select random tags
    for ((i=0; i<num_tags && i<len; i++)); do
        local idx=$((RANDOM % len))
        local tag="${tags_arr[$idx]}"
        # Avoid duplicates
        local found=false
        for existing in "${selected[@]}"; do
            if [ "$existing" = "$tag" ]; then
                found=true
                break
            fi
        done
        if [ "$found" = false ]; then
            selected+=("$tag")
        fi
    done
    
    # Format as PostgreSQL array
    local result="{"
    local first=true
    for tag in "${selected[@]}"; do
        if [ "$first" = true ]; then
            result+="\"$tag\""
            first=false
        else
            result+=",\"$tag\""
        fi
    done
    result+="}"
    echo "$result"
}

# Generate a random timestamp within the last N days
get_random_timestamp() {
    local max_days_ago=${1:-180}
    local days_ago=$((RANDOM % max_days_ago))
    local hours=$((RANDOM % 24))
    local minutes=$((RANDOM % 60))
    
    # Calculate timestamp
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        date -v-${days_ago}d -v${hours}H -v${minutes}M "+%Y-%m-%d %H:%M:%S%z"
    else
        # Linux
        date -d "-${days_ago} days -${hours} hours -${minutes} minutes" "+%Y-%m-%d %H:%M:%S%z"
    fi
}

# Generate a single note SQL insert
generate_note_sql() {
    local user_id=$1
    local note_number=$2
    
    # Select random topic index
    local topic_idx=$((RANDOM % ${#SEED_TOPICS[@]}))
    local topic="${SEED_TOPICS[$topic_idx]}"
    
    # Get titles for this topic index and select one
    local titles=""
    case $topic_idx in
        0) titles="$SEED_TITLES_0" ;;
        1) titles="$SEED_TITLES_1" ;;
        2) titles="$SEED_TITLES_2" ;;
        3) titles="$SEED_TITLES_3" ;;
        4) titles="$SEED_TITLES_4" ;;
        5) titles="$SEED_TITLES_5" ;;
        6) titles="$SEED_TITLES_6" ;;
        7) titles="$SEED_TITLES_7" ;;
        8) titles="$SEED_TITLES_8" ;;
        9) titles="$SEED_TITLES_9" ;;
        10) titles="$SEED_TITLES_10" ;;
        11) titles="$SEED_TITLES_11" ;;
    esac
    
    # Split titles by pipe delimiter
    IFS='|' read -ra title_arr <<< "$titles"
    local title_count=${#title_arr[@]}
    local title_idx=$((RANDOM % title_count))
    local title="${title_arr[$title_idx]}"
    
    # Add variation to title for uniqueness
    local variations=("Notes" "Guide" "Summary" "Overview" "Part $((RANDOM % 5 + 1))" "v$((RANDOM % 3 + 1))" "Draft" "Updated" "Revised" "Deep Dive")
    local var_idx=$((RANDOM % ${#variations[@]}))
    local variation="${variations[$var_idx]}"
    
    # Sometimes add variation
    if [ $((RANDOM % 3)) -eq 0 ]; then
        title="$title - $variation"
    fi
    
    # Get content for this topic index
    local content=""
    case $topic_idx in
        0) content="$SEED_CONTENT_0" ;;
        1) content="$SEED_CONTENT_1" ;;
        2) content="$SEED_CONTENT_2" ;;
        3) content="$SEED_CONTENT_3" ;;
        4) content="$SEED_CONTENT_4" ;;
        5) content="$SEED_CONTENT_5" ;;
        6) content="$SEED_CONTENT_6" ;;
        7) content="$SEED_CONTENT_7" ;;
        8) content="$SEED_CONTENT_8" ;;
        9) content="$SEED_CONTENT_9" ;;
        10) content="$SEED_CONTENT_10" ;;
        11) content="$SEED_CONTENT_11" ;;
    esac
    
    # Get random tags (2-5)
    local num_tags=$((RANDOM % 4 + 2))
    local tags=$(get_random_tags "$topic_idx" "$num_tags")
    
    # Get random folder (some empty)
    local folder=$(get_random_element SEED_FOLDERS)
    
    # Generate timestamps
    local created_at=$(get_random_timestamp 180)
    local updated_at=$(get_random_timestamp 30)
    
    # Generate UUID
    local note_id
    if command -v uuidgen &> /dev/null; then
        note_id=$(uuidgen | tr '[:upper:]' '[:lower:]')
    else
        note_id=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || echo "seed-$(date +%s)-$note_number-$RANDOM")
    fi
    
    # Escape content for SQL (double up single quotes)
    title=$(echo "$title" | sed "s/'/''/g")
    content=$(echo "$content" | sed "s/'/''/g")
    folder=$(echo "$folder" | sed "s/'/''/g")
    
    # Build SQL
    if [ -n "$folder" ]; then
        echo "INSERT INTO notes (id, title, content, created_at, updated_at, tags, is_archived, user_id, source, folder, is_deleted) VALUES ('$note_id', '$title', '$content', '$created_at', '$updated_at', '$tags', false, '$user_id', 'seed', '$folder', false);"
    else
        echo "INSERT INTO notes (id, title, content, created_at, updated_at, tags, is_archived, user_id, source, is_deleted) VALUES ('$note_id', '$title', '$content', '$created_at', '$updated_at', '$tags', false, '$user_id', 'seed', false);"
    fi
}

# Insert notes in batches
seed_insert_notes() {
    local port=$1
    local user=$2
    local host=$3
    local password=$4
    local target_name=$5
    local user_id=$6
    local count=$7
    
    local batch_size=50
    local total_batches=$(( (count + batch_size - 1) / batch_size ))
    local success_count=0
    local fail_count=0
    
    echo ""
    print_info "Seeding $count notes for user $user_id..."
    echo ""
    
    for ((batch=0; batch<total_batches; batch++)); do
        local start=$((batch * batch_size))
        local end=$((start + batch_size))
        if [ $end -gt $count ]; then
            end=$count
        fi
        local batch_count=$((end - start))
        
        # Show progress
        local progress=$(( (batch + 1) * 100 / total_batches ))
        printf "\r  Progress: [%-50s] %d%% (batch %d/%d)" \
            "$(printf '#%.0s' $(seq 1 $((progress / 2))))" \
            "$progress" "$((batch + 1))" "$total_batches"
        
        if [ "$DRY_RUN" = true ]; then
            success_count=$((success_count + batch_count))
            continue
        fi
        
        # Generate batch SQL
        local batch_sql="BEGIN;"
        for ((i=start; i<end; i++)); do
            batch_sql+=$(generate_note_sql "$user_id" "$i")
        done
        batch_sql+="COMMIT;"
        
        # Execute batch
        if run_sql "$port" "$user" "$host" "$batch_sql" "$password" > /dev/null 2>&1; then
            success_count=$((success_count + batch_count))
        else
            fail_count=$((fail_count + batch_count))
            # Try individual inserts for this batch to identify failures
            for ((i=start; i<end; i++)); do
                local single_sql=$(generate_note_sql "$user_id" "$i")
                if run_sql "$port" "$user" "$host" "$single_sql" "$password" > /dev/null 2>&1; then
                    success_count=$((success_count + 1))
                    fail_count=$((fail_count - 1))
                fi
            done
        fi
    done
    
    echo ""
    echo ""
    
    if [ $fail_count -eq 0 ]; then
        print_success "Successfully seeded $success_count notes"
    else
        print_warning "Seeded $success_count notes, $fail_count failed"
    fi
    
    return 0
}

# Count existing seeded notes
count_seeded_notes() {
    local port=$1
    local user=$2
    local host=$3
    local password=$4
    
    run_sql "$port" "$user" "$host" "
        SELECT COUNT(*) FROM notes WHERE source = 'seed';
    " "$password"
}

# Remove all seeded notes
remove_seeded_notes() {
    local port=$1
    local user=$2
    local host=$3
    local password=$4
    local target_name=$5
    
    if [ "$DRY_RUN" = true ]; then
        local count=$(count_seeded_notes "$port" "$user" "$host" "$password")
        print_info "[DRY-RUN] Would remove $count seeded notes from $target_name"
        return 0
    fi
    
    print_info "Removing seeded notes from $target_name..."
    
    local count=$(count_seeded_notes "$port" "$user" "$host" "$password")
    
    if [ "$count" = "0" ] || [ -z "$count" ]; then
        print_info "No seeded notes found in $target_name"
        return 0
    fi
    
    if run_sql "$port" "$user" "$host" "DELETE FROM notes WHERE source = 'seed';" "$password" > /dev/null 2>&1; then
        print_success "Removed $count seeded notes from $target_name"
        return 0
    else
        print_error "Failed to remove seeded notes from $target_name"
        return 1
    fi
}
