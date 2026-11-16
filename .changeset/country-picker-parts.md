---
'@wh1teee/mui-phone-input': minor
---

Let products put the country list in their own sheet, choose what the trigger shows, and follow a late default country.

- Base UI/shadcn export `PhoneCountryTrigger` and `PhoneCountryList`, the two parts the built-in popover is now made of. Put the list in your own dialog or bottom sheet (it owns drag, focus trap and back gesture) and close it from `onSelect(country)`, which runs after the selection is applied. The list owns its keyboard model, marks and scrolls to the selected row, and mirrors `aria-activedescendant` when focused itself. `autoFocusSearch` (`true`, `false` or `'fine-pointer'`) keeps the on-screen keyboard closed on touch devices.
- `triggerContent` (`'auto'`, `'calling-code'`, `'country-code'`, `'both'` or a render function) on both renderers. `'calling-code'` draws `+375` in national mode and nothing in international modes, where the input already starts with the code. `'auto'` keeps the current rendering.
- The trigger's accessible name always contains the selected country and calling code. A host `aria-label` is now its prefix instead of replacing it, through the new optional `triggerLabel` message present in every locale. The Base UI trigger was named only "Select country"; it now reads like the MUI trigger ("Select country. Belarus, BY, +375"), whose name is unchanged.
- While a field is untouched (empty, never edited, nothing picked), the selected country follows a changed `defaultCountry`, reported by `onCountryChange` with reason `default`.
- Add the Japanese locale, `@wh1teee/mui-phone-input/locales/ja`.
- `shadcn.css` lets off-screen option rows skip layout and paint (`content-visibility: auto` with the row height as intrinsic size), so the full list opens cheaper.

Entry sizes stay within budget (gzip): `/base-ui` and `/shadcn` +1.5 KB (85.5 → 87.0 KB), `/base-ui/min` +1.5 KB (64.3 → 65.8 KB), `/mui` +0.4 KB, `/headless` +0.1 KB. The MUI main closure budget moves from 33,506 to 33,892 bytes gzip (measured +386 B, 96 B headroom kept).
