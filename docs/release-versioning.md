# Branching, Release, and Versioning

## Branch Roles

- `develop`: day-to-day working branch. Open PRs from here into `canary`.
- `canary`: integration and staging branch, deployed to `test.date-planner.us`.
- `main`: production release branch. Only tested changes from `canary` are promoted here.

## Delivery Flow

1. Open PRs from `develop` against `canary`.
2. `CI` validates backend/frontend changes on every PR.
3. Merge validated PRs into `canary`.
4. Deploy `canary` to the test environment.
5. Promote `canary` to `main` with a PR when the test environment is stable.
6. Merge into `main` to trigger `Deploy to Production`.
7. Apply exactly one release label to the `canary -> main` PR:
   - `release:patch`
   - `release:minor`
   - `release:major`
8. Merge into `main` to trigger `Deploy to Production`.
9. After merge, `Auto Tag Release` creates the next SemVer tag automatically.
10. `Auto Tag Release` also publishes the GitHub Release. (`Release` only runs for manually pushed tags, since tags pushed with `GITHUB_TOKEN` do not trigger workflows.)

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
5. Add one release label to the `canary -> main` PR.
6. Merge to `main`.
7. Confirm the auto-tag workflow created the next SemVer tag.
8. Confirm the GitHub Release was published for that tag.

## Example Cadence

- First production cut after the branch split: `v1.0.0`
- Backward-compatible feature release: `v1.1.0`
- Hotfix on production: `v1.1.1`
- Breaking API release: `v2.0.0`

## Label Rules

- `release:patch`: bug fixes, infra fixes, copy changes, non-breaking polish
- `release:minor`: new backward-compatible user-facing features
- `release:major`: breaking API, schema, or rollout changes

Use at most one release label on each `main` promotion PR. If no release label is present, the release defaults to `patch`.
The label must be on the PR before it is merged; labels added after merge are ignored.
