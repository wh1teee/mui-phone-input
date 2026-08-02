import { forwardRef } from 'react';

import { AdaptedInputFormatCandidate } from './AdaptedInputFormatCandidate';
import { MaskitoCandidate } from './MaskitoCandidate';
import type { InputEngineCandidateId, InputEngineCandidateProps } from './types';

type Props = InputEngineCandidateProps &
  Readonly<{ candidate: InputEngineCandidateId }>;

export const InputEngineCandidate = forwardRef<HTMLInputElement, Props>(
  function InputEngineCandidate({ candidate, ...props }, ref) {
    switch (candidate) {
      case 'maskito':
        return <MaskitoCandidate {...props} ref={ref} />;
      case 'adapted-input-format':
        return <AdaptedInputFormatCandidate {...props} ref={ref} />;
    }
  },
);
