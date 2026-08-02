# Separate client, server, and optional integration entrypoints

Status: Accepted

The project publishes one ESM package with explicit client, server, React Hook Form, Zod, metadata, locale, and flag entrypoints. Client components use React 19 and MUI 9+, while server helpers do not import React, MUI, Emotion, DOM, or browser APIs.

## Consequences

- Next.js and other SSR consumers can validate and format numbers without pulling client UI into server bundles;
- React Hook Form and Zod remain optional peers;
- the first stable release supports React 19+, MUI 9+, TypeScript 6 declarations, Node 24 LTS tooling, and the MUI 9 browser floor; Node 26, TypeScript 7, and future MUI prereleases are non-blocking forward signals until separately accepted;
- CommonJS, legacy MUI, React Native, GeoIP, telemetry, and built-in OTP behavior are outside the contract.

