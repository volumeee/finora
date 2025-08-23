import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

interface ResponsiveDialogActionsProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveDialogFormProps {
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
  className?: string;
}

const sizeClasses = {
  sm: 'w-[calc(100vw-2rem)] sm:max-w-sm',
  md: 'w-[calc(100vw-2rem)] sm:max-w-md',
  lg: 'w-[calc(100vw-2rem)] sm:max-w-lg',
  xl: 'w-[calc(100vw-2rem)] sm:max-w-xl',
};

export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = 'md',
  className,
}: ResponsiveDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        sizeClasses[size],
        'max-h-[90vh] overflow-y-auto',
        className
      )}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg sm:text-xl font-semibold pr-6">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-sm">{description}</DialogDescription>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ResponsiveDialogForm({
  onSubmit,
  children,
  className,
}: ResponsiveDialogFormProps) {
  return (
    <form onSubmit={onSubmit} className={cn('space-y-4 sm:space-y-6', className)}>
      {children}
    </form>
  );
}

export function ResponsiveDialogActions({
  children,
  className,
}: ResponsiveDialogActionsProps) {
  return (
    <div className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4',
      'flex-shrink-0 border-t border-gray-100 mt-4 sm:mt-6',
      className
    )}>
      {children}
    </div>
  );
}

interface ResponsiveDialogButtonProps {
  variant?: 'default' | 'outline' | 'destructive';
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveDialogButton({
  variant = 'default',
  disabled,
  onClick,
  type = 'button',
  children,
  className,
}: ResponsiveDialogButtonProps) {
  return (
    <Button
      variant={variant}
      disabled={disabled}
      onClick={onClick}
      type={type}
      className={cn('w-full sm:w-auto', className)}
    >
      {children}
    </Button>
  );
}