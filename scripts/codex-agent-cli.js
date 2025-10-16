#!/usr/bin/env node
const { execSync } = require('child_process');

const DEFAULT_BRANCH = 'main';

function usage() {
  return `\nCodex Agent CLI\n----------------\nGenerate the shell commands the Cloudflare Worker sends to GitHub for Codex.\n\nUsage:\n  npm run codex-agent -- --instruction "<plan>" [--repo <url>] [--branch <name>] [--execute]\n\nOptions:\n  --instruction  Required. The change description that should be sent to Codex.\n  --repo          Optional. Git repository URL. Defaults to $GITHUB_REPO if set.\n  --branch        Optional. Branch Codex should operate on. Defaults to ${DEFAULT_BRANCH}.\n  --execute       Optional. Run the generated commands locally instead of printing them.\n  --help          Show this message.\n`;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
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

function runCommands(commands) {
  commands.forEach((command) => {
    console.log(`\n▶ ${command}`);
    execSync(command, { stdio: 'inherit', shell: true });
  });
}

(async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    console.log(usage());
    process.exit(0);
  }

  const instruction = args.instruction || args.i;
  if (!instruction) {
    console.error('Error: --instruction is required.');
    console.log(usage());
    process.exit(1);
  }

  const repoUrl = args.repo || process.env.GITHUB_REPO;
  if (!repoUrl) {
    console.error('Error: Provide --repo or set the GITHUB_REPO environment variable.');
    process.exit(1);
  }

  const branch = args.branch || args.b;

  const commands = buildCommand({ repoUrl, instruction, branch });

  console.log('\nGenerated command sequence:\n');
  console.log(commands.join('\n'));

  if (args.execute) {
    try {
      runCommands(commands);
    } catch (error) {
      console.error('\nCommand execution failed:', error.message);
      process.exitCode = error.status || 1;
    }
  } else {
    console.log('\nRun with --execute to perform these steps locally.');
  }
})();
