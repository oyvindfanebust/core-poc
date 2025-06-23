'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { 
  maskSensitiveId, 
  shouldShowMaskingOption, 
  getSecurityLevel,
  type IdType,
  type MaskingOptions 
} from '../lib/id-masking-utils';
import { Tooltip } from './Tooltip';

interface ToggleableIdProps {
  id: string | null | undefined;
  type: IdType;
  showFull?: boolean;
  onToggle?: (showFull: boolean) => void;
  disabled?: boolean;
  enableCopy?: boolean;
  className?: string;
  maskingOptions?: Partial<MaskingOptions>;
  [key: string]: any; // Allow additional props
}

export const ToggleableId: React.FC<ToggleableIdProps> = ({
  id,
  type,
  showFull: controlledShowFull,
  onToggle,
  disabled = false,
  enableCopy = false,
  className = '',
  maskingOptions,
  ...props
}) => {
  const t = useTranslations();
  const [internalShowFull, setInternalShowFull] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Use controlled or uncontrolled state
  const isControlled = controlledShowFull !== undefined;
  const showFull = isControlled ? controlledShowFull : internalShowFull;

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleToggle = useCallback(() => {
    if (disabled) return;

    const newShowFull = !showFull;
    
    if (isControlled) {
      onToggle?.(newShowFull);
    } else {
      setInternalShowFull(newShowFull);
    }

    // Update live region for screen readers
    if (liveRegionRef.current) {
      const action = newShowFull ? 'revealed' : 'hidden';
      liveRegionRef.current.textContent = `Full ${type} ID ${action}`;
    }
  }, [disabled, showFull, isControlled, onToggle, type]);

  const handleCopy = useCallback(async () => {
    if (!id || !navigator.clipboard) return;

    try {
      await navigator.clipboard.writeText(id);
      setCopyFeedback(true);
      
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      
      copyTimeoutRef.current = setTimeout(() => {
        setCopyFeedback(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, [id]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    }
  }, [handleToggle]);

  // Handle cases where ID is empty, null, or undefined
  if (!id) {
    return <span className={className} {...props}>-</span>;
  }

  // Check if ID should be maskable
  const shouldMask = shouldShowMaskingOption(id, type);
  
  // If ID is too short to mask meaningfully, just show it
  if (!shouldMask) {
    return <span className={className} {...props}>{id}</span>;
  }

  // Get security level for styling
  const securityLevel = getSecurityLevel(id, type);
  
  // Get appropriate tooltip content
  const getTooltipContent = () => {
    switch (type) {
      case 'account':
        return t('tooltips.accountId');
      case 'transaction':
        return t('tooltips.transactionId');
      case 'customer':
        return t('tooltips.customerId');
      default:
        return '';
    }
  };

  // Get appropriate button label
  const getButtonLabel = () => {
    if (type === 'account') {
      return showFull ? t('accountDetails.hideFullId') : t('accountDetails.viewFullId');
    }
    return showFull ? t('common.hide') : t('common.viewFull');
  };

  const displayValue = showFull ? id : maskSensitiveId(id, type, maskingOptions);
  const buttonClasses = [
    'toggleable-id',
    showFull ? 'toggleable-id--revealed' : 'toggleable-id--masked',
    `toggleable-id--security-${securityLevel}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="toggleable-id-container" {...props}>
      {/* Live region for screen readers */}
      <div 
        ref={liveRegionRef}
        role="status" 
        aria-live="polite" 
        className="sr-only"
        aria-hidden="true"
      />
      
      <Tooltip content={getTooltipContent()}>
        <button
          type="button"
          className={buttonClasses}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label={getButtonLabel()}
          aria-expanded={showFull}
          tabIndex={0}
        >
          {displayValue}
        </button>
      </Tooltip>

      {/* Copy functionality when ID is revealed */}
      {enableCopy && showFull && (
        <div className="toggleable-id-copy">
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy to clipboard"
            className="copy-button"
          >
            📋
          </button>
          {copyFeedback && (
            <span className="copy-feedback" aria-live="polite">
              Copied!
            </span>
          )}
        </div>
      )}
    </div>
  );
};