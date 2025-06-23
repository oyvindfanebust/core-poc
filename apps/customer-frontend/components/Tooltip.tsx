import React, { useState, useRef, useEffect, useId, cloneElement, isValidElement } from 'react';
import { cn } from '../lib/utils';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  placement?: TooltipPlacement;
  showDelay?: number;
  hideDelay?: number;
  className?: string;
  open?: boolean;
  disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  placement = 'top',
  showDelay = 0,
  hideDelay = 0,
  className,
  open: controlledOpen,
  disabled = false,
}) => {
  const [isVisible, setIsVisible] = useState(controlledOpen ?? false);
  const [actuallyVisible, setActuallyVisible] = useState(false);
  const showTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const hideTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  const isControlled = controlledOpen !== undefined;

  // Handle controlled visibility
  useEffect(() => {
    if (isControlled) {
      setIsVisible(controlledOpen);
      if (controlledOpen) {
        setActuallyVisible(true);
      } else {
        const timer = setTimeout(() => setActuallyVisible(false), 150);
        return () => clearTimeout(timer);
      }
    }
  }, [controlledOpen, isControlled]);

  const clearTimeouts = () => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = undefined;
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = undefined;
    }
  };

  const showTooltip = () => {
    if (disabled || isControlled) return;
    
    clearTimeouts();
    
    if (showDelay > 0) {
      showTimeoutRef.current = setTimeout(() => {
        setIsVisible(true);
        setActuallyVisible(true);
      }, showDelay);
    } else {
      setIsVisible(true);
      setActuallyVisible(true);
    }
  };

  const hideTooltip = () => {
    if (disabled || isControlled) return;
    
    clearTimeouts();
    
    if (hideDelay > 0) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => setActuallyVisible(false), 150);
      }, hideDelay);
    } else {
      setIsVisible(false);
      setTimeout(() => setActuallyVisible(false), 150);
    }
  };

  const handleMouseEnter = () => {
    showTooltip();
  };

  const handleMouseLeave = () => {
    hideTooltip();
  };

  const handleFocus = () => {
    showTooltip();
  };

  const handleBlur = () => {
    hideTooltip();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && isVisible) {
      setIsVisible(false);
      setActuallyVisible(false);
      clearTimeouts();
    }
  };

  const handleTooltipMouseEnter = () => {
    if (!isControlled) {
      clearTimeouts();
    }
  };

  const handleTooltipMouseLeave = () => {
    hideTooltip();
  };

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, []);

  if (!isValidElement(children)) {
    throw new Error('Tooltip children must be a valid React element');
  }

  // Clone the trigger element with event handlers and ARIA attributes
  const trigger = cloneElement(children, {
    onMouseEnter: (e: React.MouseEvent) => {
      handleMouseEnter();
      (children.props as any).onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      handleMouseLeave();
      (children.props as any).onMouseLeave?.(e);
    },
    onFocus: (e: React.FocusEvent) => {
      handleFocus();
      (children.props as any).onFocus?.(e);
    },
    onBlur: (e: React.FocusEvent) => {
      handleBlur();
      (children.props as any).onBlur?.(e);
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      handleKeyDown(e);
      (children.props as any).onKeyDown?.(e);
    },
    'aria-describedby': isVisible ? tooltipId : undefined,
  } as any);

  return (
    <>
      {trigger}
      {actuallyVisible && (
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          className={cn(
            'tooltip',
            `tooltip--${placement}`,
            {
              'tooltip--visible': isVisible,
              'tooltip--hidden': !isVisible,
            },
            className
          )}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
          style={{
            position: 'absolute',
            zIndex: 1000,
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 150ms ease-in-out',
            pointerEvents: isVisible ? 'auto' : 'none',
          }}
        >
          {content}
        </div>
      )}
    </>
  );
};

Tooltip.displayName = 'Tooltip';