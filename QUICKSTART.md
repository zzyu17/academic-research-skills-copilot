# Quick Start — Copilot CLI

Get from zero to your first AI-assisted research in 3 steps.

## Step 1: Install

In your Copilot CLI session:

```text
/plugin marketplace add zzyu17/academic-research-skills-copilot
/plugin install academic-research-skills@academic-research-skills
```

## Step 2: Set up the extension (first session only)

When you invoke any ARS skill, it first checks for the current extension's silent
session sentinel. If the extension is not active, the skill loads `ars-bootstrap`, which:

1. Detects that the current ARS extension is not active
2. Asks you to approve running `scripts/setup-copilot-extension.sh` (one bash permission)
3. Creates or refreshes the extension symlink
4. Reloads extensions automatically — 16 slash commands (`/ars-full`, `/ars-plan`, etc.) are activated immediately within the same session

On subsequent sessions, the loaded extension supplies the sentinel and every skill's
preflight continues silently. The `.bootstrapped` file is diagnostic only and never
overrides this live check.

> **After plugin update:** Run `/restart` or start a new session with `/clear`. The next
ARS invocation detects a missing or old-version sentinel, refreshes the extension symlink,
and reloads the updated `extension.mjs`.

## Step 3: Start researching

Tell Copilot what you want to do. It will automatically pick the right skill and mode.

### Example: Guided research (Socratic mode)

```
You: "I have a vague idea about AI's impact on higher education quality assurance,
      but I'm not sure how to frame the research question. Can you guide me?"
```

Copilot enters Socratic mode — asking questions to help you clarify your thinking. After 5-15 rounds, you'll have a focused research question.

### Example: Write a paper

```
You: "Help me write a paper about the impact of declining birth rates
      on private universities in Taiwan"
```

### Example: Review an existing paper

```
You: "Review this paper" (then paste or attach the paper)
```

### Example: Full pipeline

```
You: "I want to produce a complete research paper about how agentic AI
      is reshaping student learning outcome measurement"

Or use the slash command:
/ars-full
```

This triggers the full 10-stage pipeline. Budget ~$4-6 in API costs and 2-4 hours of collaborative work.

## Which mode should I use?

| I want to... | Use this |
|-------------|----------|
| Explore a vague idea | `/academic-research-skills:deep-research` socratic mode |
| Get a quick literature summary | `/academic-research-skills:deep-research` quick mode |
| Do a systematic review (PRISMA) | `/academic-research-skills:deep-research` systematic-review mode |
| Write a paper from scratch | `/ars-full` or `/academic-research-skills:academic-paper` full mode |
| Plan a paper chapter by chapter | `/ars-plan` |
| Get my paper reviewed | `/ars-reviewer` |
| Do everything end-to-end | `/ars-full` |

## Slash commands

**Mode-specific and utilities** (16, requires extension setup):
`/ars-full`, `/ars-plan`, `/ars-outline`, `/ars-revision`, `/ars-revision-coach`, `/ars-abstract`, `/ars-lit-review`, `/ars-reviewer`, `/ars-format-convert`, `/ars-citation-check`, `/ars-disclosure`, `/ars-mark-read`, `/ars-unmark-read`, `/ars-cache-invalidate`, `/ars-3w`, `/ars-rebuttal-audit`

**Skill entry points** (5, available immediately after plugin install):
`/academic-research-skills:deep-research`, `/academic-research-skills:academic-paper`, `/academic-research-skills:academic-paper-reviewer`, `/academic-research-skills:academic-pipeline`, `/academic-research-skills:ars-bootstrap`

## Model routing (optional)

ARS uses the session model by default. Opt in to the v3.16 model-tiering policy with:

```bash
export ARS_MODEL_TIERING="economy"        # execution roles step down one tier
# or: export ARS_MODEL_TIERING="quality-boost"  # judgment roles use the frontier tier
```

Without the variable, all dispatches use the session model. See [`shared/model_tiering.md`](shared/model_tiering.md) for role classifications and precedence.

## What's next?

- [Full README](README.md) — all features, modes, and changelog
- [中文版](README.zh-TW.md) — Traditional Chinese version
- [한국어](README.ko-KR.md) — Korean version
- [Pipeline showcase](examples/showcase/) — real artifacts from a complete pipeline run
