# Contributing to Axionax Web Universe

Thank you for your interest in contributing to Axionax! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Community](#community)

---

## 📜 Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on what is best for the community
- Show empathy towards other community members
- Avoid harassment and discrimination of any kind

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.x or v20.x
- **pnpm**: v8.x or later
- **Git**: v2.x or later
- **Docker**: v24.x or later (optional, for local testing)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

   ```bash
   git clone https://github.com/YOUR_USERNAME/axionax-web-universe.git
   cd axionax-web-universe
   ```

3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/axionaxprotocol/axionax-web-universe.git
   ```

### Install Dependencies

```bash
pnpm install
```

### Build All Packages

```bash
pnpm build
```

### Start Development Server

```bash
# Start all apps in development mode
pnpm dev

# Start specific app
pnpm --filter @axionax/web dev
pnpm --filter @axionax/marketplace dev
```

---

## 🔄 Development Workflow

### 1. Create a Branch

Always create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

Branch naming conventions:

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks

### 2. Make Your Changes

- Write clear, concise commit messages
- Follow the coding standards (see below)
- Add tests for new features
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run linting
pnpm lint

# Run type checking
pnpm type-check

# Run tests
pnpm test

# Run specific app tests
pnpm --filter @axionax/web test
```

### 4. Commit Your Changes

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git add .
git commit -m "feat: add new feature"
# or
git commit -m "fix: resolve issue with component"
```

Commit message format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Example**:

```
feat(web): add dark mode toggle

Added a dark mode toggle to the header component.
Users can now switch between light and dark themes.

Closes #123
```

### 5. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

---

## 🔀 Pull Request Process

### Before Submitting

- [ ] Code follows project coding standards
- [ ] All tests pass
- [ ] Documentation is updated
- [ ] Commit messages follow conventional commits
- [ ] Branch is up to date with `main`

### Submitting a Pull Request

1. Go to the original repository on GitHub
2. Click "New Pull Request"
3. Select your fork and branch
4. Fill out the PR template:

```markdown
## Description

Brief description of what this PR does

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How to Test

Steps to test the changes

## Screenshots (if applicable)

Add screenshots here

## Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

5. Click "Create Pull Request"

### Review Process

- Maintainers will review your PR within 2-3 business days
- Address any feedback or requested changes
- Once approved, a maintainer will merge your PR

---

## 📝 Coding Standards

### TypeScript/JavaScript

- Use **TypeScript** for all new code
- Follow **ESLint** configuration
- Use **Prettier** for code formatting
- Prefer `const` over `let`, avoid `var`
- Use meaningful variable names
- Add JSDoc comments for functions

**Example**:

```typescript
/**
 * Fetches user data from the API
 * @param userId - The ID of the user
 * @returns Promise with user data
 */
async function getUserData(userId: string): Promise<User> {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
}
```

### React Components

- Use **functional components** with hooks
- Use **TypeScript interfaces** for props
- Follow **component naming conventions**: PascalCase
- Keep components small and focused
- Use **React.memo** for optimization when needed

**Example**:

```typescript
import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ label, onClick, disabled = false }) => {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
};
```

### CSS/Styling

- Use **CSS Modules** or **Tailwind CSS**
- Follow **BEM naming convention** if using plain CSS
- Keep styles scoped to components
- Use CSS variables for theming

### File Structure

```
apps/
  web/
    src/
      components/     # React components
      pages/          # Next.js pages
      lib/            # Utility functions
      types/          # TypeScript types
      styles/         # Global styles
packages/
  sdk/              # Axionax SDK
  ui/               # Shared UI components
  contracts/        # Smart contracts
```

---

## 🧪 Testing Guidelines

### Unit Tests

- Write tests for all new functions and components
- Use **Jest** and **React Testing Library**
- Aim for >80% code coverage

**Example**:

```typescript
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with label', () => {
    render(<Button label="Click me" onClick={() => {}} />);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button label="Click me" onClick={handleClick} />);
    screen.getByText('Click me').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Integration Tests

- Test user workflows and interactions
- Use **Playwright** or **Cypress** for E2E tests

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e
```

---

## 📚 Documentation

### Code Documentation

- Add JSDoc comments to all public functions
- Document complex logic with inline comments
- Keep comments up to date with code changes

### README Updates

- Update README.md when adding new features
- Include setup instructions for new dependencies
- Add examples for new functionality

### API Documentation

- Document all API endpoints
- Include request/response examples
- Specify error codes and messages

### Changelog

- Update CHANGELOG.md for all changes
- Follow [Keep a Changelog](https://keepachangelog.com/) format
- Group changes by type (Added, Changed, Fixed, etc.)

---

## 👥 Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Discord**: Real-time chat and support
  - Join: https://discord.gg/axionax
  - Channel: #contributors
- **Twitter**: Updates and announcements
  - Follow: [@axionax](https://twitter.com/axionax)

### Getting Help

- Check existing documentation first
- Search GitHub issues for similar problems
- Ask in Discord #help channel
- Create a GitHub issue if needed

### Recognition

Contributors will be:

- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Invited to contributor-only channels
- Eligible for contributor NFT badges (coming soon)

---

## 🎯 Areas to Contribute

### Good First Issues

Look for issues labeled `good-first-issue` for beginner-friendly tasks.

### Areas Needing Help

- 📝 Documentation improvements
- 🐛 Bug fixes
- 🧪 Test coverage
- 🎨 UI/UX enhancements
- ⚡ Performance optimizations
- 🌐 Translations (i18n)
- 📱 Mobile responsiveness

---

## 📄 License

By contributing to Axionax, you agree that your contributions will be licensed under the same license as the project (see [LICENSE](./LICENSE)).

---

## 🙏 Thank You

Thank you for contributing to Axionax! Your efforts help make the project better for everyone.

**Questions?** Feel free to reach out in Discord or open a GitHub Discussion.

---

**Last Updated**: December 5, 2025 | v1.8.0-testnet
