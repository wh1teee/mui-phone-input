import { describe, expect, it } from 'vitest';

import { createPhoneCountryOptions } from '../../packages/mui-phone-input/src/country-selector';
import { be } from '../../packages/mui-phone-input/src/locales/be';
import { en } from '../../packages/mui-phone-input/src/locales/en';
import { ru } from '../../packages/mui-phone-input/src/locales/ru';

describe('locale packs', () => {
  it('provide framework-neutral selector messages and locale tags', () => {
    expect(en.locale).toBe('en');
    expect(be.messages.searchLabel).toBe('Пошук краін');
    expect(ru.messages.selectCountry).toBe('Выбрать страну');
  });

  it('keeps Intl.DisplayNames country resolution authoritative', () => {
    const [belarus] = createPhoneCountryOptions({
      countryFilter: (country) => country === 'BY',
      locale: be.locale,
    });
    const expected = new Intl.DisplayNames([be.locale], { type: 'region' }).of('BY');

    expect(belarus?.localizedName).toBe(expected);
  });

  it('keeps consumer country-name overrides authoritative over Intl.DisplayNames', () => {
    const [belarus] = createPhoneCountryOptions({
      countryFilter: (country) => country === 'BY',
      locale: be.locale,
      resolveCountryName: (country, locale) =>
        country === 'BY' && locale === be.locale ? 'Беларусь — consumer' : undefined,
    });

    expect(belarus?.localizedName).toBe('Беларусь — consumer');
  });
});
