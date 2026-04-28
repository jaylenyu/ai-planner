# PR Base Branch Rules

When creating pull requests, always use the following base branches:

- `develop` → base: `canary`
- `canary` → base: `main`

Example:
```bash
# on develop branch
gh pr create --base canary ...

# on canary branch
gh pr create --base main ...
```
