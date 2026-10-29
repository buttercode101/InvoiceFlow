# Contributing

Start with the [README](README.md) and [repository verification](REPOSITORY-VERIFICATION.md). Follow the existing architecture and keep changes focused on a reproduced problem or an explicit product requirement.

## Before submitting

1. Record the affected workflow, expected result, reproduction and actual result.
2. Run the documented checks before and after changes. Add regression coverage when behaviour changes; avoid tests that only repeat the implementation.
3. For UI changes, exercise phone, tablet and desktop widths, keyboard access, loading/error states and refresh recovery. Label browser emulation accurately.
4. Preserve existing user data and configuration. Never commit credentials, personal documents, recordings, financial records or exported capability keys.
5. Explain the change, its validation and remaining limits in the pull request. Separate local tests, CI and live-production evidence.

## Reporting issues

For an ordinary defect, include browser/runtime versions, viewport, steps and a sanitised example. Do not attach real customer or financial data. Report security problems privately using [SECURITY.md](SECURITY.md).

Do not report a release as certified solely because its build passes. Tie production evidence to the intended source and complete the relevant acceptance journey.

## Code Style \u0026 Linting

* Use **Prettier** for formatting (`npm run format`).
* Follow the project's **ESLint** rules (`npm run lint`).
* Typescript projects must have **no TypeScript errors** (`npm run tsc`).

## Documentation

* Update the relevant **README** sections when you add new functionality.
* Keep the **API documentation** (e.g., OpenAPI spec) in sync.
* Add or update **doc comments** for any exported symbols.

## Testing Guidelines

* Write unit tests that cover **critical paths** and edge cases.
* Aim for **≥ 80 % statement coverage** on new code. Use the `c8` coverage badge to verify.
* Tests should be **fast** (< 1 s) and **deterministic**. Avoid external network calls; mock them instead.

## Pull Request Process

* Ensure the CI pipeline passes before requesting review.
* Provide a concise **summary** of changes and any required manual verification steps.
* Tag relevant reviewers and include any **issue numbers** the PR resolves.
