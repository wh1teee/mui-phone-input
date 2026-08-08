---
'@wh1teee/mui-phone-input': patch
---

Make explicit country selection authoritative in the default Country Selector,
including when the current value is a non-geographic/global-service number. Preserve
the existing national digits under the requested calling code, keep selected UI state
separate from detected/resolved numbering authority, and let validation report drafts
that still need correction instead of silently rejecting the country click.
