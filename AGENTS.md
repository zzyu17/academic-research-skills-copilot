# Academic Research Skills — Contributor Guidelines

This file is for ARS maintainers and contributors. It is NOT loaded into Copilot CLI user sessions. End users receive their runtime instructions from the `ars-bootstrap` skill (`skills/ars-bootstrap/SKILL.md`) and the `onSessionStart` extension hook.

## Repository Structure

```
academic-research-skills/
├── copilot-main          ← Copilot CLI adaptations (this branch)
├── claude-code-main      ← Tracks upstream Imbad0202/academic-research-skills:main
├── extension.mjs         ← Copilot CLI extension (16 slash commands + hooks)
├── package.json          ← Plugin metadata
├── skills/
│   ├── ars-bootstrap/    ← Session-start bootstrap (replaces .claude/CLAUDE.md)
│   ├── deep-research/    ← 13-agent research team skill
│   ├── academic-paper/   ← 12-agent paper writing skill
│   ├── academic-paper-reviewer/ ← 7-agent peer review skill
│   └── academic-pipeline/ ← 5-agent pipeline orchestrator
├── agents/               ← 3 materialized mirrors of deep-research agents
├── shared/               ← Shared references, contracts, templates
├── scripts/              ← Python scripts + setup-copilot-extension.sh
└── tests/                ← Python suites + Copilot Node runtime tests
```

## Branch Strategy

- `claude-code-main` — tracks upstream `Imbad0202/academic-research-skills:main` (user-managed sync)
- `copilot-main` — Copilot CLI adaptations (maintained via merge from claude-code-main + Copilot-specific patches)

## Development

- **No `gh ext install`** — Copilot CLI uses `/plugin marketplace add` + `/plugin install`
- **Extension registration** — every functional skill checks the versioned session sentinel and falls back to `ars-bootstrap` + `scripts/setup-copilot-extension.sh`
- **Test in a separate Copilot CLI session** — this session is for development only
- **`onPreToolUse` enforcement** — active for workspace/plugin-root write scope; Copilot's hook schema still lacks per-agent identity for Bucket A fencing
