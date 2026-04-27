/**
 * @axionax/ui - Shared UI Components
 *
 * This package provides reusable React components for the Axionax ecosystem.
 * Components use Tailwind CSS for styling.
 *
 * @example
 * ```tsx
 * import { Button, Card, Modal, Toast } from '@axionax/ui';
 *
 * <Button variant="primary">Click me</Button>
 * <Card>Content here</Card>
 * ```
 */

// Core Components
export * from './Button';
export * from './Card';

// Modal & Overlay
export * from './Modal';

// Feedback
export * from './Toast';
export * from './Loading';

// Form Components
export * from './Form';

// Display Components
export * from './Display';

// Axionax Oracle (Vertex AI Search assistant)
export { OracleChat } from './OracleChat';
