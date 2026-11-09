# Quality Gates TODO

Spec-Rails does not run your quality gates. Set them up for your stack:

- [ ] Unit tests run in CI and in the pre-commit `test` hook.
- [ ] Coverage check enforced (target: >= 95% line and branch).
- [ ] Mutation testing enforced (target: >= 95% kill score) with a tool for your stack.
- [ ] Uncomment and fill the steps in `.github/workflows/spec-rails-ci.yml`.
- [ ] Delete this file when done.
