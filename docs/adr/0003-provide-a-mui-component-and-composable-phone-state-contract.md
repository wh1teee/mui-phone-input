# Provide a MUI component and composable phone state contract

Status: Accepted

The package provides an excellent zero-configuration `MuiPhoneInput` and an advanced `usePhoneInput` contract with supported Composable Primitives. Both use one Input Transaction state machine, while MUI theme registration, stable slots, slot props, utility classes, and owner state provide the primary visual customization surface.

## Consequences

- advanced consumers can replace composition without copying telephone logic;
- public extension points are limited to stable semantic boundaries;
- the package supports controlled and uncontrolled ownership without switching modes after mount;
- custom formatting must preserve a logical digit-to-caret mapping;
- WCAG-required props and handlers are supplied to official slots and primitives.

