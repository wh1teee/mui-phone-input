'use client';

import type { CountryCode } from 'libphonenumber-js/max';
import {
  type ComponentPropsWithRef,
  type ImgHTMLAttributes,
  type ReactNode,
  useState,
} from 'react';

export type PhoneFlagMode = 'emoji' | 'external' | 'local' | 'none';
export type PhoneFlagPlacement = 'option' | 'trigger';

export interface PhoneFlagProviderContext {
  country: CountryCode;
  placement: PhoneFlagPlacement;
}

export type PhoneFlagProvider = (context: PhoneFlagProviderContext) => ReactNode;

export type PhoneExternalFlagFallback = Exclude<ReactNode, null | undefined>;

export interface PhoneExternalFlagOptions {
  crossOrigin?: ImgHTMLAttributes<HTMLImageElement>['crossOrigin'];
  fallback?: PhoneExternalFlagFallback;
  referrerPolicy?: ImgHTMLAttributes<HTMLImageElement>['referrerPolicy'];
  resolveUrl(country: CountryCode): string;
}

export interface PhoneCountryFlagProps
  extends Omit<ComponentPropsWithRef<'span'>, 'children'>,
    PhoneFlagProviderContext {
  external?: PhoneExternalFlagOptions;
  mode?: PhoneFlagMode;
  provider?: PhoneFlagProvider;
}

function countryCodeToEmoji(country: CountryCode): string {
  return String.fromCodePoint(
    ...[...country].map((character) => 127397 + character.charCodeAt(0)),
  );
}

/**
 * Decorative country flag renderer used by the selector. Local mode is the
 * default and is backed by the package's generated local 3x2 stylesheet.
 * Consumers using local mode import `@wh1teee/mui-phone-input/flags.css`.
 */
export function PhoneCountryFlag({
  country,
  external,
  mode = 'local',
  placement,
  provider,
  ...spanProps
}: PhoneCountryFlagProps): ReactNode {
  const [failedSource, setFailedSource] = useState<string | undefined>();
  let content = provider
    ? provider({ country, placement })
    : mode === 'local'
      ? <span className={`flag:${country}`} />
      : mode === 'emoji'
        ? countryCodeToEmoji(country)
        : null;

  if (!provider && mode === 'external') {
    const externalSource = external?.resolveUrl(country);
    content =
      external && externalSource && failedSource !== externalSource ? (
        <img
          alt=""
          crossOrigin={external?.crossOrigin}
          loading="lazy"
          onError={() => setFailedSource(externalSource)}
          referrerPolicy={external?.referrerPolicy}
          src={externalSource}
        />
      ) : (external?.fallback ?? countryCodeToEmoji(country));
  }

  return content == null ? null : (
      <span {...spanProps} aria-hidden="true">
        {content}
      </span>
    );
}

