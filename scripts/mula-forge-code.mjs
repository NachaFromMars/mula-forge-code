#!/usr/bin/env node
/**
 * mula-forge-code.mjs — 7-phase feature dev STATE MANAGER for OpenClaw
 * 
 * Script manages forge state. Agent orchestrates (spawns explorers, architects, reviewers).
 * Agent reads SKILL.md → follows 7-phase protocol → uses script for state tracking.
 * 
 * Usage:
 *   node mula-forge-code.mjs init --feature "Add file upload" --dir ~/project
 *   node mula-forge-code.mjs advance --id <id> --phase explore --data '{...}'
 *   node mula-forge-code.mjs status --id <id>
 *   node mula-forge-code.mjs list
 * 
 * Fork: feature-dev (Anthropic, MIT)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';

// --- Config ---
const FORGES_DIR = join(homedir(), '.openclaw', 'workspace', 'forges');
const DEFAULT_MODEL = 'claudible/claude-opus-4.6';
const PHASES = ['discovery', 'explore', 'clarify', 'architect', 'implement', 'review', 'summary'];

// --- Helpers ---
function ensureDir(d) { if (!existsSync(d)) mkdirSync(d, { recursive: true }); }
function readJson(p) { try { return JSON.parse(readFileSync(p, 'utf-8')); } catch { return null; } }
function writeJson(p, d) { writeFileSync(p, JSON.stringify(d, null, 2), 'utf-8'); }
function statePath(id) { return join(FORGES_DIR, `${id}.json`); }

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
}

function getProjectName(dir) {
  try { return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8')).name || dir.split(/[\\/]/).pop(); }
  catch { return dir.split(/[\\/]/).pop(); }
}

function loadOrDie(id) {
  const p = statePath(id);
  if (!existsSync(p)) { console.error(`❌ Forge not found: ${id}`); process.exit(1); }
  const s = readJson(p);
  if (!s) { console.error(`❌ Corrupted state: ${id}`); process.exit(1); }
  return s;
}

function save(state) {
  ensureDir(FORGES_DIR);
  state.updatedAt = new Date().toISOString();
  writeJson(statePath(state.id), state);
}

// --- Commands ---

function cmdInit(feature, dir, options = {}) {
  const absDir = resolve(dir);
  if (!existsSync(absDir)) {
    console.error(`❌ Directory not found: ${absDir}`);
    process.exit(1);
  }
  
  const projectName = getProjectName(absDir);
  const id = `forge-${slugify(feature)}-${timestamp()}`;
  const model = options.model || DEFAULT_MODEL;
  
  const phases = {};
  PHASES.forEach(p => {
    phases[p] = { status: 'pending', data: null };
  });
  phases.discovery.status = 'running';
  
  const state = {
    id,
    feature,
    dir: absDir,
    projectName,
    model,
    currentPhase: 'discovery',
    phases,
    keyFiles: [],      // populated by explore
    questions: [],     // populated by clarify
    answers: [],       // populated by clarify
    chosenApproach: null,  // populated by architect
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  save(state);
  
  console.log(JSON.stringify({
    ok: true,
    action: 'init',
    id,
    feature,
    dir: absDir,
    projectName,
    model,
    currentPhase: 'discovery',
    instructions: getPhaseInstructions('discovery')
  }));
}

function cmdAdvance(id, phase, dataJson, dataFile) {
  const state = loadOrDie(id);
  
  if (!PHASES.includes(phase)) {
    console.error(`❌ Invalid phase: ${phase}. Valid: ${PHASES.join(', ')}`);
    process.exit(1);
  }
  
  // Parse data
  let data = {};
  try {
    if (dataFile && existsSync(dataFile)) {
      let raw = readFileSync(dataFile, 'utf-8');
      if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
      data = JSON.parse(raw.trim());
    } else if (dataJson) {
      let raw = dataJson;
      if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
      data = JSON.parse(raw.trim());
    }
  } catch (e) {
    console.error(`❌ Invalid JSON: ${e.message}`);
    process.exit(1);
  }
  
  // Mark current phase as done
  state.phases[state.currentPhase].status = 'done';
  state.phases[state.currentPhase].completedAt = new Date().toISOString();
  state.phases[state.currentPhase].data = data;
  
  // Handle phase-specific data
  if (phase === 'explore' && data.keyFiles) {
    state.keyFiles = data.keyFiles;
  }
  if (phase === 'clarify') {
    state.questions = data.questions || [];
    state.answers = data.answers || [];
  }
  if (phase === 'architect' && data.chosenApproach) {
    state.chosenApproach = data.chosenApproach;
  }
  
  // Advance to specified phase
  const phaseIndex = PHASES.indexOf(phase);
  const nextPhase = phaseIndex < PHASES.length - 1 ? PHASES[phaseIndex + 1] : null;
  
  state.currentPhase = nextPhase || 'complete';
  if (nextPhase) {
    state.phases[nextPhase].status = 'running';
  }
  
  save(state);
  
  console.log(JSON.stringify({
    ok: true,
    action: 'advance',
    completedPhase: phase,
    nextPhase: nextPhase || 'DONE',
    instructions: nextPhase ? getPhaseInstructions(nextPhase, state) : 'Forge complete! Summarize results.'
  }));
}

function cmdSkipTo(id, phase) {
  const state = loadOrDie(id);
  
  if (!PHASES.includes(phase)) {
    console.error(`❌ Invalid phase: ${phase}`);
    process.exit(1);
  }
  
  // Mark all phases before target as skipped
  const targetIndex = PHASES.indexOf(phase);
  for (let i = 0; i < targetIndex; i++) {
    if (state.phases[PHASES[i]].status !== 'done') {
      state.phases[PHASES[i]].status = 'skipped';
    }
  }
  
  state.currentPhase = phase;
  state.phases[phase].status = 'running';
  save(state);
  
  console.log(JSON.stringify({
    ok: true,
    action: 'skip-to',
    phase,
    instructions: getPhaseInstructions(phase, state)
  }));
}

function cmdStatus(id) {
  const state = loadOrDie(id);
  
  console.log(`📊 Forge: ${state.id}`);
  console.log(`Feature: ${state.feature}`);
  console.log(`Project: ${state.projectName}`);
  console.log(`Dir: ${state.dir}`);
  console.log(`Model: ${state.model}`);
  console.log(`Current: ${state.currentPhase}`);
  console.log(`Created: ${state.createdAt}`);
  console.log();
  
  console.log('Phases:');
  PHASES.forEach((p, i) => {
    const ph = state.phases[p];
    const icon = { done: '✅', running: '▶️', pending: '⬜', skipped: '⏭️' }[ph.status] || '❓';
    console.log(`  ${icon} ${i+1}. ${p}`);
  });
  
  if (state.keyFiles.length) console.log(`\nKey files: ${state.keyFiles.length}`);
  if (state.chosenApproach) console.log(`Approach: ${state.chosenApproach}`);
}

function cmdList() {
  ensureDir(FORGES_DIR);
  const files = readdirSync(FORGES_DIR).filter(f => f.endsWith('.json'));
  
  if (files.length === 0) {
    console.log('No forges found.');
    return;
  }
  
  console.log(`📋 Forges (${files.length})\n`);
  
  files.sort().reverse().forEach(f => {
    const s = readJson(join(FORGES_DIR, f));
    if (!s) return;
    const phaseNum = s.currentPhase === 'complete' ? 7 : PHASES.indexOf(s.currentPhase) + 1;
    const icon = s.currentPhase === 'complete' ? '✅' : '▶️';
    console.log(`${icon} ${s.id}`);
    console.log(`   ${s.feature.slice(0, 50)} | Phase ${phaseNum}/7 ${s.currentPhase}`);
    console.log(`   ${s.updatedAt}`);
    console.log();
  });
}

function getPhaseInstructions(phase, state = null) {
  const instructions = {
    discovery: `DISCOVERY: Parse feature request. Clarify basics with user. Confirm spec. Output: feature spec.`,
    explore: `EXPLORE: Spawn 2-3 code-explorer agents (parallel). Each traces execution paths, maps architecture, returns key files. After agents return, READ all key files.`,
    clarify: `CLARIFY (CRITICAL): Identify ALL ambiguities, edge cases, integration points. Present questions to user. WAIT for answers. Do NOT proceed without answers.`,
    architect: `ARCHITECT: Spawn 2-3 code-architect agents (minimal/clean/pragmatic). Compare approaches. Recommend one. ASK user to choose.`,
    implement: `IMPLEMENT: Code according to chosen architecture. Follow StepForge: 4-6K tokens per step, verify each step, pass then next.`,
    review: `REVIEW: Spawn 3 code-reviewer agents (simplicity/correctness/conventions). Merge findings. Present to user. Fix high-severity issues.`,
    summary: `SUMMARY: Document what was built, decisions made, files modified, suggested next steps.`
  };
  
  let inst = instructions[phase] || '';
  
  if (state) {
    if (phase === 'implement' && state.chosenApproach) {
      inst += `\n\nChosen approach: ${state.chosenApproach}`;
    }
    if (phase === 'implement' && state.keyFiles.length) {
      inst += `\n\nKey files to reference:\n${state.keyFiles.slice(0, 10).map(f => `- ${f}`).join('\n')}`;
    }
  }
  
  return inst;
}

// --- Main ---
const [,, cmd, ...args] = process.argv;
const flags = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2);
    const val = args[i+1] && !args[i+1].startsWith('--') ? args[i+1] : true;
    flags[key] = val; if (val !== true) i++;
  }
}

try {
  switch (cmd) {
    case 'init':
      if (!flags.feature || !flags.dir) {
        console.error('Usage: mula-forge-code init --feature "..." --dir ~/project [--model ...]');
        process.exit(1);
      }
      cmdInit(flags.feature, flags.dir, { model: flags.model });
      break;
    case 'advance':
      if (!flags.id || !flags.phase) {
        console.error('Usage: mula-forge-code advance --id <id> --phase <phase> [--data \'{...}\' | --data-file path]');
        process.exit(1);
      }
      cmdAdvance(flags.id, flags.phase, flags.data, flags['data-file']);
      break;
    case 'skip-to':
      if (!flags.id || !flags.phase) {
        console.error('Usage: mula-forge-code skip-to --id <id> --phase <phase>');
        process.exit(1);
      }
      cmdSkipTo(flags.id, flags.phase);
      break;
    case 'status':
      if (!flags.id) { console.error('Need --id'); process.exit(1); }
      cmdStatus(flags.id);
      break;
    case 'list':
      cmdList();
      break;
    default:
      console.log('mula-forge-code — 7-phase feature dev state manager for OpenClaw');
      console.log('');
      console.log('Commands:');
      console.log('  init      Create forge           --feature "..." --dir ~/project [--model ...]');
      console.log('  advance   Complete phase         --id <id> --phase <phase> [--data \'{...}\']');
      console.log('  skip-to   Skip to phase          --id <id> --phase <phase>');
      console.log('  status    Show status             --id <id>');
      console.log('  list      List all forges');
      console.log('');
      console.log('Phases: ' + PHASES.join(' → '));
  }
} catch (err) {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
}
