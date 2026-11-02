# How-To: Configure AI Agents with Spec-Rails

This guide explains how to install and enable Spec-Rails for Antigravity (AGY), Claude Code, and Cursor.

---

## 1. Antigravity (AGY) Integration

### Option A: Global Installation
Link the `spec-rails` plugin and skill into your user config:

```bash
mkdir -p ~/.gemini/config/plugins ~/.gemini/config/skills
ln -sfn /path/to/spec-rails ~/.gemini/config/plugins/spec-rails
ln -sfn /path/to/spec-rails/skills/spec-rails ~/.gemini/config/skills/spec-rails
```

The agent will discover `spec-rails` automatically across all projects.

### Option B: Project-Level Installation
Copy or symlink `skills/spec-rails` and `rules/AGENTS.md` into your project's `.agents/` folder:

```bash
mkdir -p .agents/skills .agents/rules
cp -r /path/to/spec-rails/skills/spec-rails .agents/skills/
cp /path/to/spec-rails/rules/AGENTS.md .agents/rules/spec-rails.md
```

Commit `.agents/` so the entire team's agents follow Spec-Rails rules.

---

## 2. Claude Code Integration

Add the Spec-Rails rules to `CLAUDE.md` in your project root:

```markdown
# Spec-Rails Protocol
This repository enforces Spec-Driven, Testing-Railed Development (Spec-Rails).
Always consult `openspec/spec-rails/WORKFLOW.md` before starting work.
- Never edit code without human sign-off at Gates 1–4.
- Always use feature branches (`feat/*`) or isolated worktrees (`.worktrees/*`).
- Always write failing tests first (Red) before implementation (Green).
- Enforce >= 95% coverage and 100% mutation kill score on core modules.
```

---

## 3. Cursor / General IDE Integration

Place the always-on rules in `.cursorrules` or `.cursor/rules/spec-rails.mdc`:

```markdown
---
description: Spec-Driven, Testing-Railed Development Rules
globs: **/*
alwaysApply: true
---

Follow `openspec/spec-rails/WORKFLOW.md`. Never make production changes directly on main.
Strictly follow human review gates 1 to 6. Always write tests before code.
```
