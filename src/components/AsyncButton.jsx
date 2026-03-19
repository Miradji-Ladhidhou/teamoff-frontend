import React from 'react';
import { Button, Spinner } from 'react-bootstrap';

const AsyncButton = ({
  action = null,
  onClickAsync = null,
  onClick,
  isLoading = false,
  showSpinner = false,
  loadingText = 'Chargement...',
  disabled = false,
  children,
  className = '',
  ...props
}) => {
  const effectiveIsLoading = action?.isRunning ?? isLoading;
  const effectiveShowSpinner = action?.showSpinner ?? showSpinner;
  const mergedDisabled = disabled || effectiveIsLoading;
  const showLoadingState = effectiveIsLoading && effectiveShowSpinner;
  const content = showLoadingState ? loadingText : children;

  const handleClick = async (event) => {
    if (typeof onClick === 'function') {
      onClick(event);
      if (event?.defaultPrevented) {
        return;
      }
    }

    if (typeof onClickAsync !== 'function') {
      return;
    }

    if (action?.run) {
      await action.run(() => onClickAsync(event));
      return;
    }

    await onClickAsync(event);
  };

  return (
    <Button
      {...props}
      onClick={onClick || onClickAsync ? handleClick : undefined}
      disabled={mergedDisabled}
      aria-busy={effectiveIsLoading}
      className={className}
    >
      {showLoadingState && (
        <Spinner animation="border" size="sm" className="me-2" />
      )}
      {content}
    </Button>
  );
};

export default AsyncButton;
