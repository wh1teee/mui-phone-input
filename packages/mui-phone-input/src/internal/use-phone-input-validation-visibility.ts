'use client';

import { type FocusEvent, useCallback, useEffect, useRef, useState } from 'react';

import type { PhoneValidationDisplay } from '../usePhoneInput';

export interface PhoneInputValidationVisibility {
  handleBlur(event: FocusEvent<HTMLInputElement>): void;
  resetValidationVisibility(): void;
  validationVisible: boolean;
}

export function usePhoneInputValidationVisibility(
  validationDisplay: PhoneValidationDisplay,
): PhoneInputValidationVisibility {
  const validationBlurFrameRef = useRef<number | undefined>(undefined);
  const [validationBlurred, setValidationBlurred] = useState(false);

  const cancelValidationBlurFrame = useCallback(() => {
    if (validationBlurFrameRef.current !== undefined) {
      window.cancelAnimationFrame(validationBlurFrameRef.current);
      validationBlurFrameRef.current = undefined;
    }
  }, []);

  const resetValidationVisibility = useCallback(() => {
    cancelValidationBlurFrame();
    setValidationBlurred(false);
  }, [cancelValidationBlurFrame]);

  const handleBlur = useCallback(
    (_event: FocusEvent<HTMLInputElement>) => {
      cancelValidationBlurFrame();
      validationBlurFrameRef.current = window.requestAnimationFrame(() => {
        validationBlurFrameRef.current = undefined;
        setValidationBlurred(true);
      });
    },
    [cancelValidationBlurFrame],
  );

  useEffect(() => cancelValidationBlurFrame, [cancelValidationBlurFrame]);

  return {
    handleBlur,
    resetValidationVisibility,
    validationVisible:
      validationDisplay === 'always' ||
      (validationDisplay === 'blur' && validationBlurred),
  };
}
