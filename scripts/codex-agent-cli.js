#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

const DEFAULT_BRANCH = 'main';

function usage() {
  return `\nCodex Agent CLI\n----------------\nGenerate the shell commands the Cloudflare Worker sends to GitHub for Codex.\n\nUsage:\n  npm run codex-agent -- --instruction "<plan>" [--repo <url>] [--branch <name>] [--execute]\n\nOptions:\n  --instruction  Required. The change description that should be sent to Codex.\n  --repo          Optional. Git repository URL. Defaults to $GITHUB_REPO if set.\n  --branch        Optional. Branch Codex should operate on. Defaults to ${DEFAULT_BRANCH}.\n  --execute       Optional. Run the generated commands locally instead of printing them.\n  --help          Show this message.\n`;
}

function parseArgs(argv, startIndex = 2) {
  const args = {};
  for (let i = startIndex; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      continue;
    }

    const [key, rawValue] = token.split('=');
    const name = key.replace(/^--/, '');

    if (name === 'help' || name === 'h') {
      args.help = true;
      continue;
    }

    if (rawValue !== undefined) {
      args[name] = rawValue;
      continue;
    }

    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[name] = next;
      i += 1;
    } else {
      args[name] = true;
    }
  }
  return args;
}

function buildCommand({ repoUrl, instruction, branch }) {
  const targetBranch = branch || DEFAULT_BRANCH;
  const segments = repoUrl.split('/').filter(Boolean);
  const repoName = (segments[segments.length - 1] || '').replace(/\.git$/, '') || 'repo';
  const sanitizedInstruction = instruction
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');

  return [
    `git clone ${repoUrl}`,
    `cd ${repoName}`,
    `git checkout ${targetBranch}`,
    `npx openai codex edit --repo . --instruction "${sanitizedInstruction}"`,
    'git status',
    'git push'
  ];
}

function formatCommandSequence(commands) {
  return commands.join('\n');
}

function runCommands(commands) {
  let currentCwd = process.cwd();

  commands.forEach((command) => {
    console.log(`\n▶ ${command}`);

    const cdMatch = command.match(/^\s*cd\s+(.+)$/);
    if (cdMatch) {
      const target = cdMatch[1].trim();
      currentCwd = path.resolve(currentCwd, target);
      return;
    }

    execSync(command, { stdio: 'inherit', shell: true, cwd: currentCwd });
  });
}

function printSequence(commands, execute = false) {
  console.log('\nGenerated command sequence:\n');
  console.log(formatCommandSequence(commands));

  if (execute) {
    try {
      runCommands(commands);
    } catch (error) {
      console.error('\nCommand execution failed:', error.message);
      process.exitCode = error.status || 1;
    }
  } else {
    console.log('\nRun with --execute to perform these steps locally.');
  }
}

function main(argv = process.argv, env = process.env) {
  const args = parseArgs(argv);

  if (args.help) {
    console.log(usage());
    return 0;
  }

  const instruction = args.instruction || args.i;
  if (!instruction) {
    console.error('Error: --instruction is required.');
    console.log(usage());
    return 1;
  }

  const repoUrl = args.repo || env.GITHUB_REPO;
  if (!repoUrl) {
    console.error('Error: Provide --repo or set the GITHUB_REPO environment variable.');
    return 1;
  }

  const branch = args.branch || args.b;

  const commands = buildCommand({ repoUrl, instruction, branch });
  printSequence(commands, Boolean(args.execute));
  return 0;
}

if (require.main === module) {
  const exitCode = main();
  if (Number.isInteger(exitCode) && exitCode !== 0) {
    process.exit(exitCode);
  }
}

module.exports = {
  DEFAULT_BRANCH,
  usage,
  parseArgs,
  buildCommand,
  formatCommandSequence,
  runCommands,
  printSequence,
  main
};
