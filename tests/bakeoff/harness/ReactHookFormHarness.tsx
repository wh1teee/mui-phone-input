import { Controller, useForm, useWatch } from 'react-hook-form';

import { InputEngineCandidate } from '../candidates/InputEngineCandidate';
import type { PhoneValue } from '../candidates/shared';
import type { InputEngineCandidateId } from '../candidates/types';

type FormValue = Readonly<{
  phone: PhoneValue;
}>;

type Props = Readonly<{
  candidate: InputEngineCandidateId;
  initialValue: PhoneValue;
}>;

export function ReactHookFormHarness({ candidate, initialValue }: Props) {
  const {
    control,
    formState: { isDirty },
    reset,
  } = useForm<FormValue>({
    defaultValues: { phone: initialValue },
  });
  const phone = useWatch({ control, name: 'phone' });

  return (
    <form>
      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <InputEngineCandidate
            candidate={candidate}
            onChange={field.onChange}
            ref={field.ref}
            value={field.value}
          />
        )}
      />
      <output data-testid="rhf-value">{phone ?? ''}</output>
      <output data-testid="rhf-dirty">{String(isDirty)}</output>
      <button
        onClick={() => {
          reset({ phone: initialValue });
        }}
        type="button"
      >
        Reset form
      </button>
    </form>
  );
}
