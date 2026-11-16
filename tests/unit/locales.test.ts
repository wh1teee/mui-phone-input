import { describe, expect, it } from 'vitest';

import { createPhoneCountryOptions } from '../../packages/mui-phone-input/src/country-selector';
import { be } from '../../packages/mui-phone-input/src/locales/be';
import { en } from '../../packages/mui-phone-input/src/locales/en';
import { ja } from '../../packages/mui-phone-input/src/locales/ja';
import { ru } from '../../packages/mui-phone-input/src/locales/ru';

const shippedLocales = { be, en, ja, ru };

describe('locale packs', () => {
  it('provide framework-neutral selector messages and locale tags', () => {
    expect(en.locale).toBe('en');
    expect(be.messages.searchLabel).toBe('Пошук краін');
    expect(ru.messages.selectCountry).toBe('Выбрать страну');
    expect(ja.locale).toBe('ja');
    expect(ja.messages.allCountries).toBe('すべての国・地域');
  });

  it.each(Object.entries(shippedLocales))(
    '%s ships every English message',
    (_, pack) => {
      expect(Object.keys(pack.messages).sort()).toEqual(
        Object.keys(en.messages).sort(),
      );
      for (const message of Object.values(pack.messages)) {
        expect(message?.trim()).toBeTruthy();
      }
    },
  );

  it.each(Object.entries(shippedLocales))(
    '%s trigger label names the label, country and calling code',
    (_, pack) => {
      for (const placeholder of ['{label}', '{countryName}', '{callingCode}']) {
        expect(pack.messages.triggerLabel).toContain(placeholder);
      }
    },
  );

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
