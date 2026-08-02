# MUI Phone Input Context

MUI Phone Input is a reusable React and Material UI component library for entering, formatting, validating, and composing international telephone-number fields without creating a second source of telephone numbering rules.

## Values and Representation

**Phone Value**:
A normalized international phone-number candidate containing a leading `+` and digits, or `undefined` when empty. It may be incomplete while the user is editing and becomes an E.164 number only when valid.
_Avoid_: Formatted Number, Raw Phone, Telephone String

**Phone Draft**:
The complete editing state required to preserve unfinished input, selected country intent, formatting, and logical caret position. It is not application data persisted as a phone number.
_Avoid_: Phone Value, Raw Input

**Display Value**:
The text visible in the input after applying the active display format or Format Strategy. Separators and localized presentation never become part of the Phone Value.
_Avoid_: Phone Value, Canonical Number

**Extension**:
A separate digits-only canonical value identifying a destination within a telephone system. It never becomes part of the Phone Value, though it may be exported with the number as RFC 3966.
_Avoid_: Phone Suffix, E.164 Extension

## Formatting and Input

**Display Mask**:
A declarative template that places phone digits for presentation without defining country, validity, or canonical value.
_Avoid_: Validation Mask, Phone Number Rule

**Format Strategy**:
A replaceable mechanism that converts phone digits into a Display Value and returns the positional mapping required to preserve logical caret behavior.
_Avoid_: Formatter Callback, Mask Function

**Input Transaction**:
One atomic change to a Phone Draft, including its source, normalized digits, resulting Phone Value, Display Value, and logical caret position.
_Avoid_: Change Event, Input Hack

**Display Format**:
One of the supported presentation modes: international, national, or international with a fixed calling-code segment. Display Format never changes Phone Value semantics.
_Avoid_: Storage Format, Validation Mode

## Countries and Metadata

**Selected Country**:
The country explicitly chosen by the user or controlled by the consumer. It retains priority while the current Phone Draft remains compatible with it.
_Avoid_: Detected Country, Default Country

**Detected Country**:
The country inferred from sufficient phone digits and numbering metadata. An ambiguous calling code may have no Detected Country.
_Avoid_: Selected Country, Resolved Country

**Resolved Country**:
The country currently used for formatting and displayed by the component after reconciling Selected Country, Detected Country, controlled props, and ambiguity rules.
_Avoid_: Selected Country, Detected Country

**Numbering Plan Resolution**:
The current classification of a Phone Draft as geographic, non-geographic, or unresolved, together with its calling code and any compatible countries. A numbering plan can be valid without resolving to a country.
_Avoid_: Country Detection, Selected Country

**Possible Countries**:
The countries whose numbering rules remain compatible with the current international digits when a shared calling code is not yet uniquely resolved.
_Avoid_: Preferred Countries, Guessed Countries

**Non-Geographic Numbering Plan**:
An international numbering plan that has a calling code but no country, such as a universal international service. It uses a neutral visual identity rather than a fabricated country or flag.
_Avoid_: Country 001, International Country

**Country Selector**:
The accessible interface used to make an explicit country selection. It does not own calling-code or numbering-plan data.
_Avoid_: Flag Dropdown, Prefix Picker

**Preferred Countries**:
Countries displayed in a pinned group before the full country list without changing country-resolution semantics.
_Avoid_: Default Countries, Priority Countries

**Metadata Preset**:
A supported `libphonenumber-js` metadata set—max, min, mobile, or validated custom metadata—that defines telephone-number parsing and validation semantics.
_Avoid_: Country Table, Dialing Rules

## Validation and Verification

**Validation State**:
The structural assessment of a Phone Draft: empty, incomplete, possible, valid, or invalid, accompanied by a typed reason where applicable.
_Avoid_: Verification Status, Error Visibility

**Validation Mode**:
The acceptance policy applied to a parsed number. The default `possible` mode checks numbering-plan length without rejecting newly assigned ranges solely because strict metadata has not yet caught up; stricter validity and number-type policies are explicit choices.
_Avoid_: Validation State, Validation Display Policy

**Validation Display Policy**:
The rule controlling when a computed validation problem becomes visible to the user, independently of the Validation State itself.
_Avoid_: Validation State, Form Submission Mode

**Number Verification**:
External evidence, such as an OTP challenge, that a user controls or can receive communication at a number. The library does not perform Number Verification.
_Avoid_: Validation, Reachability Check

## Customization and Delivery

**Composable Primitive**:
A supported building block that consumes the shared phone state contract and accessibility props while allowing a consumer to replace the default composition.
_Avoid_: Internal Component, Unstable Slot

**Flag Provider**:
A replaceable source and rendering contract for country flags, including local assets, external URLs, emoji, or no flag.
_Avoid_: Flag CDN, Sprite Setting

**Consumer Integration**:
A real product integration used to validate package behavior and API fitness. RideOS is the first planned Consumer Integration; Christofle follows after its MUI 9 migration.
_Avoid_: Demo, Example App

## Donor Practice

**Donor**:
A mature implementation, library, test suite, issue history, or product component examined before designing equivalent behavior locally.
_Avoid_: Dependency, Authority

**Donor Decision**:
The recorded choice to copy, adapt, use only as a pattern, or reject a donor capability, with exact provenance, known problems, and preserved tests.
_Avoid_: Inspiration, Informal Reference

