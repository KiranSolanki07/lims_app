# AI Agent Instructions for MBT Project

This document provides essential context for AI agents working with this codebase.

## Project Overview
- Modern React application built with Vite, TypeScript, and TailwindCSS
- Focus on responsive design and modern authentication UI
- Uses latest React (v19) features and TypeScript for type safety

## Tech Stack & Architecture
- **Framework**: React 19.1 with TypeScript
- **Build Tool**: Vite 7.1
- **Styling**: TailwindCSS 4.1 with custom gradient and component styles
- **Development Tools**: ESLint 9 with TypeScript support

## Key Directories & Files
- `/src/App.tsx`: Main application component with authentication UI
- `/src/assets/`: Static assets and images
- `/src/index.css`: Global styles and Tailwind imports
- `vite.config.ts`: Build and development configuration
- `tailwind.config.cjs`: Tailwind customization and theme settings

## Development Workflow
1. **Development Server**:
   ```bash
   npm run dev
   ```

2. **Building for Production**:
   ```bash
   npm run build
   ```

3. **Linting**:
   ```bash
   npm run lint
   ```

## Project Conventions
1. **Component Patterns**:
   - Functional components with TypeScript
   - Props interfaces defined inline with components
   - CSS classes follow Tailwind's utility-first approach

2. **File Organization**:
   - React components use `.tsx` extension
   - Styles are co-located with components using Tailwind classes
   - Asset imports use direct paths from `/src/assets`

3. **Style Patterns**:
   - Use Tailwind's built-in classes for consistent styling
   - Custom gradients defined in component classes
   - Mobile-first responsive design using Tailwind breakpoints (e.g., `md:grid-cols-2`)

## Environment Setup
- Node.js v20+ recommended
- TypeScript 5.9
- VS Code with ESLint and Tailwind CSS IntelliSense extensions

## Common Tasks
- Adding new components: Create `.tsx` files in appropriate directories
- Styling: Use Tailwind utility classes, refer to existing components for patterns
- Type checking: Run `tsc -b` for TypeScript validation
