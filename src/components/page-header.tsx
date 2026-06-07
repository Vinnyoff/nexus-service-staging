import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4 md:mb-6">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-semibold tracking-tight md:text-3xl break-words leading-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5 md:mt-1 break-words">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 shrink-0 pt-0.5">{children}</div>
      )}
    </div>
  );
}
