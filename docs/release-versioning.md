# Branching, Release, and Versioning

## Branch Roles

- `canary`: integration and staging branch. All day-to-day work lands here first.
- `main`: production release branch. Only tested changes from `canary` are promoted here.

## Delivery Flow

1. Open feature PRs against `canary`.
2. `CI` validates backend/frontend changes on every PR.
3. Merge validated PRs into `canary`.
4. Deploy `canary` to the test environment.
5. Promote `canary` to `main` with a PR when the test environment is stable.
6. Merge into `main` to trigger `Deploy to Production`.
7. Create a version tag on `main` to publish a GitHub Release.

## Branch Protection

- Protect `canary` and `main`.
- Disable direct pushes to both branches.
- Require pull requests for merges.
- Require these checks before merge:
  - `Backend CI`
  - `Frontend CI`
- Restrict production deploys to `main` only.

## Versioning Policy

Use SemVer tags in the form `vMAJOR.MINOR.PATCH`.

- `PATCH`: bug fixes, infra-only improvements, non-breaking polish.
- `MINOR`: backward-compatible user-facing features.
- `MAJOR`: breaking API changes, incompatible env/config changes, or rollout policy resets.

## Initial Baseline

- First stable production release after the branch split: `v1.0.0`
- Canary-only test drops before that point:
  - optional prerelease tags such as `v1.0.0-rc.1`
  - optional internal canary tags such as `v1.0.0-canary.1`

## Release Checklist

1. Confirm `canary` test deployment is healthy.
2. Open `canary -> main` PR and wait for `Backend CI` and `Frontend CI`.
3. Merge to `main`.
4. Confirm production deployment is healthy.
5. Create the next SemVer tag on `main`.
6. Let the `Release` workflow publish GitHub Release notes.

## Example Cadence

- First production cut after the branch split: `v1.0.0`
- Backward-compatible feature release: `v1.1.0`
- Hotfix on production: `v1.1.1`
- Breaking API release: `v2.0.0`
