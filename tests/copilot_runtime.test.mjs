import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  ARS_EXTENSION_SENTINEL,
  buildGuardPayload,
  createModelRoutingHint,
  findRealPython,
  modelRoutingHint,
  runGuard,
  sessionStartContext,
} from "../scripts/copilot_runtime.mjs";

test("extension registers every upstream ARS command", () => {
  const extension = readFileSync(new URL("../extension.mjs", import.meta.url), "utf8");
  const names = [...extension.matchAll(/name:\s*"(ars-[^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(names.sort(), [
    "ars-3w",
    "ars-abstract",
    "ars-cache-invalidate",
    "ars-citation-check",
    "ars-disclosure",
    "ars-format-convert",
    "ars-full",
    "ars-lit-review",
    "ars-mark-read",
    "ars-outline",
    "ars-plan",
    "ars-rebuttal-audit",
    "ars-reviewer",
    "ars-revision",
    "ars-revision-coach",
    "ars-unmark-read",
  ]);
});

test("session start announces the exact current extension sentinel", () => {
  assert.equal(ARS_EXTENSION_SENTINEL, "[ARS_EXTENSION_ACTIVE v3.17.0-copilot]");
  assert.match(sessionStartContext(), /^\[ARS_EXTENSION_ACTIVE v3\.17\.0-copilot\]/);
  assert.match(sessionStartContext(), /16 slash commands/);

  const extension = readFileSync(new URL("../extension.mjs", import.meta.url), "utf8");
  assert.match(extension, /onSessionStart[\s\S]*sessionStartContext\(\)/);
});

test("marketplace exposes ars-bootstrap as an explicit installed skill", () => {
  const marketplace = JSON.parse(
    readFileSync(new URL("../.claude-plugin/marketplace.json", import.meta.url), "utf8"),
  );
  const skills = marketplace.plugins.find(
    (plugin) => plugin.name === "academic-research-skills",
  )?.skills;
  assert.ok(skills?.includes("./skills/ars-bootstrap"));
});

test("every functional skill requires bootstrap preflight before routing or mode selection", () => {
  const skillPaths = [
    "../skills/deep-research/SKILL.md",
    "../skills/academic-paper/SKILL.md",
    "../skills/academic-paper-reviewer/SKILL.md",
    "../skills/academic-pipeline/SKILL.md",
  ];
  for (const skillPath of skillPaths) {
    const body = readFileSync(new URL(skillPath, import.meta.url), "utf8");
    const preflight = body.indexOf("## Bootstrap Preflight (MUST run first)");
    assert.notEqual(preflight, -1, `${skillPath} lacks the bootstrap preflight`);
    assert.match(body, /\[ARS_EXTENSION_ACTIVE v3\.17\.0-copilot\]/);
    assert.match(body, /load `ars-bootstrap` and run its Extension Setup Check/);

    const routing = body.indexOf("Routing discipline");
    const quickStart = body.indexOf("## Quick Start");
    assert.ok(routing === -1 || preflight < routing, `${skillPath} routes before preflight`);
    assert.ok(quickStart === -1 || preflight < quickStart, `${skillPath} selects a mode before preflight`);
  }
});

test("bootstrap uses the live sentinel before idempotent cwd-independent repair", () => {
  const bootstrap = readFileSync(
    new URL("../skills/ars-bootstrap/SKILL.md", import.meta.url),
    "utf8",
  );
  const sentinel = bootstrap.indexOf("[ARS_EXTENSION_ACTIVE v3.17.0-copilot]");
  const absoluteSource = bootstrap.indexOf("absolute source path");
  const setup = bootstrap.indexOf("setup-copilot-extension.sh");
  assert.ok(sentinel !== -1 && absoluteSource > sentinel && setup > absoluteSource);
  assert.doesNotMatch(bootstrap, /does `~\/\.copilot\/extensions\/ars\/\.bootstrapped` exist\?/);
  assert.match(bootstrap, /\.bootstrapped.*diagnostic/si);
});

test("setup repairs missing and stale extension symlinks idempotently", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "ars-copilot-bootstrap-"));
  const setup = new URL("../scripts/setup-copilot-extension.sh", import.meta.url);
  const expected = realpathSync(new URL("../extension.mjs", import.meta.url));
  const link = join(sandbox, ".copilot", "extensions", "ars", "extension.mjs");

  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (attempt === 1) {
        unlinkSync(link);
        symlinkSync("/missing/stale-ars-extension.mjs", link);
      }
      const result = spawnSync("bash", [setup.pathname], {
        encoding: "utf8",
        env: { ...process.env, HOME: sandbox },
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(realpathSync(link), expected);
    }
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("guard payload uses Copilot cwd and records the plugin root", () => {
  assert.deepEqual(
    buildGuardPayload(
      { cwd: "/work/project", toolName: "edit", toolArgs: { path: "paper.md" } },
      "/plugins/ars",
    ),
    {
      cwd: "/work/project",
      plugin_root: "/plugins/ars",
      tool_input: { path: "paper.md" },
      tool_name: "edit",
    },
  );
});

test("guard payload parses Copilot CLI serialized tool arguments", () => {
  assert.deepEqual(
    buildGuardPayload(
      {
        cwd: "/work/project",
        toolName: "edit",
        toolArgs: JSON.stringify({
          path: "paper.md",
          old_str: "before",
          new_str: "after",
        }),
      },
      "/plugins/ars",
    ),
    {
      cwd: "/work/project",
      plugin_root: "/plugins/ars",
      tool_input: {
        path: "paper.md",
        old_str: "before",
        new_str: "after",
      },
      tool_name: "edit",
    },
  );
});

test("valid ARS_MODEL_TIERING suppresses legacy blanket model ids", () => {
  const hint = modelRoutingHint("architect", {
    ARS_MODEL_TIERING: "economy",
    ARS_MODEL_ARCHITECT: "hard-pinned-model",
  });
  assert.match(hint, /ARS_MODEL_TIERING=economy/);
  assert.match(hint, /shared\/model_tiering\.md/);
  assert.doesNotMatch(hint, /hard-pinned-model/);
});

test("unset tiering preserves legacy explicit model routing", () => {
  const hint = modelRoutingHint("execution", { ARS_MODEL_EXECUTION: "chosen-model" });
  assert.match(hint, /chosen-model/);
});

test("invalid tiering warns and otherwise behaves as absent", () => {
  const hint = modelRoutingHint("architect", {
    ARS_MODEL_TIERING: "fastest",
    ARS_MODEL_ARCHITECT: "chosen-model",
  });
  assert.match(hint, /invalid ARS_MODEL_TIERING=fastest/);
  assert.match(hint, /chosen-model/);
});

test("session model-routing wrapper warns only once for an invalid value", () => {
  const hintFor = createModelRoutingHint(() => ({
    ARS_MODEL_TIERING: "fastest",
    ARS_MODEL_ARCHITECT: "chosen-model",
  }));
  assert.match(hintFor("architect"), /invalid ARS_MODEL_TIERING=fastest/);
  const second = hintFor("architect");
  assert.doesNotMatch(second, /invalid ARS_MODEL_TIERING/);
  assert.match(second, /chosen-model/);
});

test("python discovery rejects a successful stub without the marker", () => {
  const calls = [];
  const fakeSpawn = (command, args) => {
    calls.push([command, ...args]);
    if (command === "python3") return { status: 0, stdout: "", stderr: "" };
    if (command === "python") return { status: 0, stdout: "ARS_PY_OK", stderr: "" };
    return { status: 1, stdout: "", stderr: "" };
  };
  assert.deepEqual(findRealPython(fakeSpawn, "linux"), ["python"]);
  assert.equal(calls[0][0], "python3");
});

test("broken or unavailable guard fails open without logging", () => {
  const fakeSpawn = () => ({ status: 1, stdout: "", stderr: "noisy stub" });
  const originalError = console.error;
  let logged = false;
  console.error = () => { logged = true; };
  try {
    assert.deepEqual(runGuard(
      { cwd: "/work", toolName: "edit", toolArgs: { path: "paper.md" } },
      { pluginRoot: "/plugins/ars", spawnSyncImpl: fakeSpawn, platform: "linux" },
    ), {});
  } finally {
    console.error = originalError;
  }
  assert.equal(logged, false);
});
