# npm identity gate (`mpi-g7a`)

The canonical package name remains `@whiteee/mui-phone-input`, but registry
publication is blocked until the owner proves all of the following from an
authenticated npm session:

1. `npm whoami` returns the intended publishing identity.
2. The identity controls the `@whiteee` scope and can create public packages.
3. Two-factor authentication and npm Trusted Publishing/OIDC ownership are
   configured for `wh1teee/mui-phone-input`.
4. The owner explicitly approves the canonical package name and the first
   `next` publication.

Run `pnpm verify:npm-identity` after authenticating. Local builds, package
validation, tarball consumers, and publish dry-runs do not require this gate to
be closed. No workflow in this repository publishes without a separate owner
approval environment.

