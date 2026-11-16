import { getCountries } from 'libphonenumber-js/max';
import { describe, expect, it } from 'vitest';

import {
  createPhoneCountryOptions,
  filterPhoneCountryOptions,
} from '../../packages/mui-phone-input/src/country-selector';
import { ja } from '../../packages/mui-phone-input/src/locales/ja';

const options = createPhoneCountryOptions({
  locale: ja.locale,
  ...(ja.searchAliases === undefined ? {} : { searchAliases: ja.searchAliases }),
});
const first = (query: string) => filterPhoneCountryOptions(options, query)[0]?.country;

describe('Japanese country search', () => {
  it.each([
    ['にほん', 'JP'],
    ['ニホン', 'JP'],
    ['にっぽん', 'JP'],
    ['ちゅうごく', 'CN'],
    ['かんこく', 'KR'],
    ['きたちょうせん', 'KP'],
    ['たいわん', 'TW'],
    ['ほんこん', 'HK'],
    ['香港', 'HK'],
    ['みなみあふりか', 'ZA'],
    ['ばーじん', 'VG'],
    ['べいこく', 'US'],
    ['だいかんみんこく', 'KR'],
    ['えいこく', 'GB'],
  ])('finds %s by its reading before IME conversion', (query, country) => {
    expect(first(query)).toBe(country);
  });

  it('folds hiragana to the katakana of displayed names', () => {
    expect(first('べらるーし')).toBe('BY');
    expect(first('ベラルーシ')).toBe('BY');
  });

  // Calling-code search read full-width digits before 1.3.0; kept as a regression.
  it('reads full-width calling codes', () => {
    expect(first('+８１')).toBe('JP');
    expect(first('＋８１')).toBe('JP');
  });

  it('has a reading for every name Intl writes with kanji', () => {
    const names = new Intl.DisplayNames([ja.locale], { type: 'region' });
    const kanjiNamed = getCountries().filter((country) =>
      /\p{Script=Han}/u.test(names.of(country) ?? ''),
    );
    expect(kanjiNamed.length).toBeGreaterThan(0);
    for (const country of kanjiNamed) {
      expect(ja.searchAliases?.[country]?.length, country).toBeGreaterThan(0);
    }
  });

  it('aliases never change the displayed names', () => {
    expect(options.find((option) => option.country === 'JP')?.localizedName).toBe(
      new Intl.DisplayNames(['ja'], { type: 'region' }).of('JP'),
    );
  });
});
