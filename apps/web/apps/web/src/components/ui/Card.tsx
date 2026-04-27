import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  style?: React.CSSProperties;
}

export default function Card({
  children,
  className = '',
  hover = false,
  style,
}: CardProps) {
  return (
    <div
      className={`${hover ? 'card-hover' : 'card'} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div
      className={`border-b border-white/10 bg-white/[0.02] px-4 py-4 sm:px-6 sm:py-4 rounded-t-lg ${className}`}
    >
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function CardTitle({ children, className = '', id }: CardTitleProps) {
  return (
    <h3 id={id} className={`text-xl font-bold ${className}`}>
      {children}
    </h3>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={`p-4 sm:p-6 ${className}`}>{children}</div>;
}
