# mula-forge-code — 7-phase structured feature development pipeline

> Understand → Explore → Clarify → Architect → Implement → Review → Document. A disciplined pipeline that forces the right questions before the first line of code.

[![OpenClaw Skill](https://img.shields.io/badge/OpenClaw-Skill-blueviolet)](https://github.com/NachaFromMars)

## Overview
mula-forge-code is a 7-phase feature development pipeline managed by `mula-forge-code.mjs`. It prevents premature coding by running codebase exploration agents and asking all clarifying questions before any implementation begins. Architecture goes through a competition phase where 2–3 options are designed and the best is selected before building. A review phase with 3 dedicated agents validates quality before the feature is documented. Fork of Anthropic's feature-dev plugin (MIT).

## Phases
1. **Discovery** — understand what the task requires
2. **Explore** — 2–3 explorer agents scan the codebase → key files identified
3. **Clarify** — ask ALL unclear questions BEFORE coding (gate: user approves)
4. **Architect** — 2–3 architect agents design options → user selects
5. **Implement** — code via StepForge (4–6K tokens/step, isolated)
6. **Review** — 3 reviewer agents check quality
7. **Summary** — document results

## When to Use
✅ New multi-file feature | ✅ Complex requirement needing codebase exploration | ✅ Important task needing quality review
❌ Small bug fixes | ❌ One-liner changes

## Trigger Keywords (OpenClaw)
forge code, feature dev, mula-forge-code, build feature, implement feature, phát triển tính năng

## Related Skills
- [mula-audit](https://github.com/NachaFromMars/mula-audit) — parallel code quality audit
- [mula-ralph](https://github.com/NachaFromMars/mula-ralph) — autonomous iterative loop

---
Part of the [NachaFromMars](https://github.com/NachaFromMars) OpenClaw skill ecosystem.
