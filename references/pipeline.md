# Pipeline — Chi Tiết 7-Phase Flow

## Phase Flow Diagram

```
┌──────────────────────────────────────────────────┐
│ Phase 1: DISCOVERY                               │
│ Parse request → clarify basics → confirm spec    │
│ Output: Feature spec (confirmed by user)         │
└───────────────────────┬──────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│ Phase 2: EXPLORE (2-3 agents PARALLEL)           │
│ Agent A: Similar features trace                  │
│ Agent B: Architecture mapping                    │
│ Agent C: Patterns + testing                      │
│ Output: Key files list, patterns, architecture   │
│ → Read all key files after agents return         │
└───────────────────────┬──────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│ Phase 3: CLARIFY (CRITICAL — DO NOT SKIP)        │
│ Review findings → identify gaps → ask user       │
│ WAIT for answers before proceeding               │
│ Output: All questions answered                   │
└───────────────────────┬──────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│ Phase 4: ARCHITECT (2-3 agents PARALLEL)         │
│ Agent A: Minimal approach                        │
│ Agent B: Clean architecture                      │
│ Agent C: Pragmatic balance                       │
│ → Compare + recommend + ask user                 │
│ Output: Chosen architecture blueprint            │
└───────────────────────┬──────────────────────────┘
                        │ (user approval required)
                        ▼
┌──────────────────────────────────────────────────┐
│ Phase 5: IMPLEMENT                               │
│ Follow blueprint → code → test → track progress  │
│ Output: Working code + tests                     │
└───────────────────────┬──────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│ Phase 6: REVIEW (3 agents PARALLEL)              │
│ Agent 1: Simplicity/DRY                          │
│ Agent 2: Correctness/Bugs                        │
│ Agent 3: Conventions/Patterns                    │
│ → Merge → present → ask user                     │
│ Output: Fix list (user decides what to fix)      │
└───────────────────────┬──────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│ Phase 7: SUMMARY                                 │
│ Document what was built, decisions, next steps   │
│ Output: Summary document                         │
└──────────────────────────────────────────────────┘
```

## Phase Transitions

### Gate Rules

| From → To | Gate | Can Skip? |
|-----------|------|-----------|
| Discovery → Explore | Spec confirmed by user | No |
| Explore → Clarify | All agents returned + key files read | No |
| Clarify → Architect | All questions answered | **NEVER** |
| Architect → Implement | User chose approach | No |
| Implement → Review | Code complete | Yes (if urgent) |
| Review → Summary | User decided on fixes | No |

### Phase 3 (Clarify) — Why It Cannot Be Skipped

This is the most important phase. Without it:
- Assumptions become bugs
- Rework costs 5x more than asking upfront
- Architecture decisions made with wrong info
- User surprised by implementation that doesn't match expectations

**Even if everything seems clear, spend 5 minutes looking for gaps.**

## Agent Spawn Pattern

### Parallel Spawn (Phase 2, 4, 6)

```javascript
// Phase 2: 3 explorers
const explorers = await Promise.all([
  spawnAgent('code-explorer', 'Find similar features to [feature]'),
  spawnAgent('code-explorer', 'Map architecture for [area]'),
  spawnAgent('code-explorer', 'Analyze patterns + testing in [area]')
]);

// Collect key files from all agents
const keyFiles = [...new Set(
  explorers.flatMap(e => e.keyFiles)
)];

// Read all key files
for (const file of keyFiles) {
  await read(file);
}
```

### Sequential (Phase 1, 3, 5, 7)

These phases require human interaction or sequential logic — no parallel agents.

## State Management

State saved after EACH phase:

```json
{
  "id": "forge-upload-20260308",
  "feature": "File upload API",
  "dir": "/home/user/project",
  "currentPhase": "architect",
  "phases": {
    "discovery": {
      "status": "done",
      "spec": "Add multipart file upload to /api/upload...",
      "confirmedAt": "2026-03-08T10:05:00Z"
    },
    "explore": {
      "status": "done",
      "keyFiles": ["src/api/routes/...", "src/services/..."],
      "patterns": ["Service+Repository", "Zod validation", "S3 storage"],
      "agents": 3,
      "completedAt": "2026-03-08T10:15:00Z"
    },
    "clarify": {
      "status": "done",
      "questions": ["Max file size?", "Auth required?", "..."],
      "answers": ["10MB", "Yes, user session", "..."]
    },
    "architect": {
      "status": "running",
      "approaches": ["minimal", "clean", "pragmatic"],
      "chosen": null
    }
  }
}
```

## Error Recovery

### Agent Fails

```
Agent spawn → error
  │
  ├─ Retry once with same prompt
  │
  ├─ If still fails:
  │   ├─ Skip that agent's perspective
  │   └─ Continue with remaining agents
  │
  └─ If ALL agents fail: pause, notify user
```

### Phase Timeout

Each phase has a soft timeout:
- Discovery: 10 min
- Explore: 15 min (agents)
- Clarify: unlimited (waiting for user)
- Architect: 15 min (agents)
- Implement: 60 min
- Review: 15 min (agents)
- Summary: 5 min

After timeout: save state, notify user, pause.

## Integration with mula-ralph

Forge Code can run INSIDE a Ralph loop:
- Ralph handles iteration
- Forge Code handles the pipeline per iteration
- Each Ralph iteration = 1 forge pipeline run

```bash
# Ralph loop running forge code
node mula-ralph.mjs run \
  --task "Run mula-forge-code pipeline for file upload feature" \
  --dir ~/project \
  --max-iterations 3
```
