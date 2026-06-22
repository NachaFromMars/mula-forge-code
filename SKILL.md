---
name: mula-forge-code
description: "7-phase feature dev pipeline — Discovery → Explore → Clarify → Architect → Implement → Review → Summary. Agent orchestrates, script manages state. Features: multi-agent exploration, architecture competition, user approval gates. Dùng khi: build feature mới, implement requirement, systematic coding. Triggers: forge code, feature dev, mula-forge-code, build feature, implement feature, phát triển tính năng."
---

# Mula Forge Code — 7-Phase Feature Dev Pipeline for OpenClaw

> "Hiểu trước, hỏi trước, thiết kế trước — rồi mới code."

## Tổng Quan

Mula Forge Code = pipeline 7 bước có chất lượng cao:

1. **Discovery** — Hiểu task cần làm gì
2. **Explore** — Khám phá codebase (2-3 explorer agents)
3. **Clarify** — Hỏi MỌI câu chưa rõ TRƯỚC khi code
4. **Architect** — Thiết kế 2-3 phương án, chọn tốt nhất
5. **Implement** — Code theo architecture đã chọn (StepForge)
6. **Review** — 3 reviewer agents kiểm tra
7. **Summary** — Document kết quả

**Architecture:** Script (`mula-forge-code.mjs`) quản lý STATE. Agent (bạn) quản lý EXECUTION.

Fork từ: [feature-dev](https://github.com/anthropics/claude-code-plugins-official) (Anthropic, MIT)

## Khi Nào Dùng

✅ Feature mới (nhiều files, cần kiến trúc)
✅ Requirement phức tạp (cần explore codebase trước)
✅ Task quan trọng (cần review chất lượng)
❌ Fix bug nhỏ (edit trực tiếp)
❌ One-liner changes

## Protocol — Agent Follow Exactly

### Bước 1: Init

```bash
node scripts/mula-forge-code.mjs init \
  --feature "Add file upload API" \
  --dir ~/project
```

Script trả:
```json
{
  "ok": true,
  "id": "forge-add-file-upload-api-20260308T100000",
  "currentPhase": "discovery",
  "instructions": "DISCOVERY: Parse feature request..."
}
```

### Bước 2-7: Advance Through Phases

After completing each phase, record data and advance:

```bash
# Via file (recommended)
echo '{"spec":"..."}' > /tmp/data.json
node scripts/mula-forge-code.mjs advance \
  --id forge-... \
  --phase discovery \
  --data-file /tmp/data.json

# Returns next phase instructions
```

### Phase-Specific Data

| Phase | Data to Record |
|-------|---------------|
| discovery | `{"spec": "feature specification"}` |
| explore | `{"keyFiles": ["src/api.ts", ...]}` |
| clarify | `{"questions": [...], "answers": [...]}` |
| architect | `{"chosenApproach": "pragmatic", "blueprint": "..."}` |
| implement | `{"filesCreated": [...], "filesModified": [...]}` |
| review | `{"issues": [...], "fixed": [...]}` |
| summary | `{"summary": "..."}` |

## 7 Phases — Chi Tiết

### Phase 1: Discovery 🔍
Parse feature request. Clarify basics. Confirm spec với user.

### Phase 2: Explore 🗺️
Spawn 2-3 **code-explorer** agents song song:
- Agent A: Tìm features tương tự
- Agent B: Map architecture
- Agent C: Analyze patterns

Collect key files → READ all of them.

### Phase 3: Clarify ❓ (CRITICAL)
**KHÔNG SKIP PHASE NÀY.**

Identify ALL ambiguities:
- Edge cases?
- Error handling strategy?
- Integration points?
- Backward compatibility?

Present questions → WAIT for user answers.

### Phase 4: Architect 🏗️
Spawn 2-3 **code-architect** agents:
- Agent A: Minimal approach
- Agent B: Clean architecture
- Agent C: Pragmatic balance

Compare → Recommend → ASK user to choose.

### Phase 5: Implement 💻
Code theo architecture đã chọn.

**Follow StepForge:**
- Mỗi step 4000-6000 tokens
- Verify mỗi step
- Pass mới tiếp

### Phase 6: Review 🔎
Spawn 3 **code-reviewer** agents:
- Simplicity (DRY, readable)
- Correctness (bugs, logic)
- Conventions (project patterns)

Merge findings → Present → Fix high-severity.

### Phase 7: Summary 📝
Document:
- What was built
- Key decisions
- Files created/modified
- Suggested next steps

## CLI Reference

| Command | Description | Key Flags |
|---------|-------------|-----------|
| `init` | Create forge | `--feature --dir [--model]` |
| `advance` | Complete phase | `--id --phase [--data\|--data-file]` |
| `skip-to` | Skip to phase | `--id --phase` |
| `status` | Show status | `--id` |
| `list` | List all | - |

## Agent Templates

Located in `agents/`:
- `code-explorer.md` — Codebase exploration
- `code-architect.md` — Architecture design
- `code-reviewer.md` — Quality review

## Structure

```
mula-forge-code/
├── SKILL.md                    # This file
├── scripts/
│   └── mula-forge-code.mjs     # State manager (10.5KB)
├── agents/
│   ├── code-explorer.md
│   ├── code-architect.md
│   └── code-reviewer.md
└── references/
    ├── pipeline.md             # 7-phase flow details
    └── agent-prompts.md        # Full agent specs
```
