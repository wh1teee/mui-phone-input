---
'@wh1teee/mui-phone-input': patch
---

Expose `parseNationalPhoneValue` from the client and neutral server entrypoints
so applications can apply the same selected-country authority to complete
national input on both sides of the network boundary.
