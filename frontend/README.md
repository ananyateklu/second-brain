# Second Brain - Knowledge Management System

A modern, AI-powered knowledge management system built with React, TypeScript, and Tailwind CSS. This application helps users organize notes, ideas, tasks, and reminders with intelligent suggestions and connections.

## Features

### Core Functionality
- 📝 **Notes Management**
  - Create, edit, and organize notes
  - Rich text formatting
  - Tags and categorization
  - AI-powered title and content suggestions
  - Link notes together for better organization

- 💡 **Ideas Hub**
  - Capture and develop ideas
  - AI-assisted idea refinement
  - Visual mind mapping
  - Idea linking and relationship mapping

- ✅ **Task Management**
  - Create and track tasks
  - Priority levels and due dates
  - Link tasks to related notes and ideas
  - AI-suggested task descriptions

- ⏰ **Smart Reminders**
  - Set and manage reminders
  - Recurring reminder options
  - Snooze functionality
  - AI-powered reminder suggestions

### AI Integration
- 🤖 **OpenAI Integration**
  - Intelligent title suggestions
  - Content generation assistance
  - Smart tagging recommendations
  - Context-aware suggestions

### Organization Features
- 🏷️ **Advanced Tagging**
  - Flexible tag management
  - Tag suggestions
  - Tag-based filtering and search

- 🔗 **Knowledge Linking**
  - Connect related items
  - Visual relationship mapping
  - Contextual suggestions

- 🗑️ **Trash Management**
  - Soft delete functionality
  - Restore capabilities
  - Automatic cleanup

### User Experience
- 🌓 **Dark/Light Mode**
  - System preference detection
  - Manual toggle option
  - Consistent styling

- 📱 **Responsive Design**
  - Mobile-friendly interface
  - Adaptive layouts
  - Touch-optimized interactions

## Technical Stack

### Frontend
- React 18.3
- TypeScript
- Tailwind CSS
- Vite
- Lucide Icons
- React Router DOM

### AI Integration
- OpenAI API (GPT-4)
- Anthropic Claude (Coming soon)

### State Management
- React Context
- Custom hooks

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/second-brain.git
cd second-brain
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
VITE_OPENAI_API_KEY=your_api_key_here
```

4. Start the development server:
```bash
npm run dev
```

## Project Structure

```
src/
├── components/          # React components
│   ├── Dashboard/      # Dashboard-related components
│   ├── shared/         # Reusable components
│   └── auth/           # Authentication components
├── contexts/           # React contexts for state management
├── services/           # Service layer (AI, data handling)
├── types/              # TypeScript type definitions
└── utils/             # Utility functions
```

## AI Features Implementation

### Title Suggestions
- Uses GPT-4-mini for efficient processing
- Analyzes content context for relevant suggestions
- Maintains consistent style and length

### Content Generation
- Context-aware content suggestions
- Maintains user's writing style
- Supports multiple content types

### Tag Suggestions
- Intelligent tag extraction
- Category-based suggestions
- Contextual relevance

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- OpenAI for GPT-4 API
- Lucide for beautiful icons
- Tailwind CSS team for the amazing styling framework

## Roadmap

- [ ] Backend implementation with Node.js
- [ ] User authentication system
- [ ] Real-time collaboration features
- [ ] Mobile applications
- [ ] Advanced AI features
- [ ] Data export/import capabilities
- [ ] API documentation
- [ ] Integration tests