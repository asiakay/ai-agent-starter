#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const {
  DEFAULT_BRANCH,
  parseArgs,
  buildCommand,
  printSequence
} = require('./codex-agent-cli.js');

const CONFIG_FILENAMES = ['codex-agent.yaml', 'codex-agent.yml'];

function usage() {
  return `\nCodex Task Runner\n-----------------\nExecute predefined Codex instructions declared in codex-agent.yaml.\n\nUsage:\n  codex list\n  codex run <task-name> [--repo <url>] [--branch <name>] [--instruction "override"] [--execute]\n\nCommands:\n  list               Show all configured tasks.\n  run <task-name>    Generate the Codex shell plan for the selected task.\n\nOptions:\n  --repo          Override the repository clone URL.\n  --branch        Override the git branch.\n  --instruction   Override the instruction text from the config.\n  --execute       Run the commands locally instead of printing them.\n  --help          Show this message.\n`;
}

function findConfig(baseDir = process.cwd()) {
  for (const filename of CONFIG_FILENAMES) {
    const filePath = path.resolve(baseDir, filename);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  return null;
}

function tryParseJSON(raw) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function parseSimpleYaml(raw) {
  const lines = raw.replace(/\r/g, '').split('\n');
  const root = {};
  const stack = [{ indent: -1, container: root }];

  lines.forEach((line) => {
    if (!line.trim() || line.trim().startsWith('#')) {
      return;
    }

    const indent = line.match(/^\s*/)[0].length;
    const trimmed = line.trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const frame = stack[stack.length - 1];
    const separatorIndex = trimmed.indexOf(':');
    if (separatorIndex === -1) {
      throw new Error(`Unable to parse line: "${trimmed}"`);
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();

    if (!rawValue) {
      const child = {};
      frame.container[key] = child;
      stack.push({ indent, container: child });
      return;
    }

    let value = rawValue;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    frame.container[key] = value;
  });

  return root;
}

function loadConfig(configPath) {
  const raw = fs.readFileSync(configPath, 'utf8');
  const fromJson = tryParseJSON(raw);
  const parsed = fromJson || parseSimpleYaml(raw);

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid codex-agent config: expected an object at the root.');
  }
  return parsed;
}

function resolveDefaults(config) {
  const defaults = config.defaults || {};
  const agentDefaults = config.agent?.defaults || {};
  return {
    repo: defaults.repo || agentDefaults.repo || config.agent?.repo,
    branch: defaults.branch || agentDefaults.branch || config.agent?.branch || DEFAULT_BRANCH
  };
}

function assertTasks(config) {
  if (!config.tasks || typeof config.tasks !== 'object') {
    throw new Error('codex-agent config missing "tasks" section.');
  }
}

function listTasks(config) {
  assertTasks(config);
  const entries = Object.entries(config.tasks);
  if (entries.length === 0) {
    console.log('No tasks defined in codex-agent.yaml.');
    return;
  }

  console.log('\nAvailable Codex tasks:\n');
  entries.forEach(([name, task]) => {
    const description = task?.description ? ` - ${task.description}` : '';
    console.log(`• ${name}${description}`);
  });
}

function resolveInstruction(task, flags) {
  if (flags.instruction || flags.i) {
    return flags.instruction || flags.i;
  }

  if (typeof task.instruction === 'string' && task.instruction.trim().length > 0) {
    return task.instruction.trim();
  }

  if (Array.isArray(task.instructions)) {
    return task.instructions.join('\n');
  }

  throw new Error('Task does not define an instruction to send to Codex.');
}

function runTask(taskName, config, flags, env) {
  assertTasks(config);
  const task = config.tasks[taskName];
  if (!task) {
    throw new Error(`Unknown task "${taskName}".`);
  }

  const defaults = resolveDefaults(config);
  const repoUrl = flags.repo || env.GITHUB_REPO || defaults.repo;
  if (!repoUrl) {
    throw new Error('Missing repository URL. Provide --repo, set GITHUB_REPO, or add defaults.repo in codex-agent.yaml.');
  }

  const branch = flags.branch || flags.b || defaults.branch || DEFAULT_BRANCH;
  const instruction = resolveInstruction(task, flags);

  console.log(`\nTask: ${taskName}`);
  if (task.description) {
    console.log(task.description);
  }

  console.log('\nInstruction:\n');
  console.log(instruction);

  const commands = buildCommand({ repoUrl, instruction, branch });
  printSequence(commands, Boolean(flags.execute));
}

function main(argv = process.argv, env = process.env) {
  const command = argv[2];
  if (!command || command === '--help' || command === '-h') {
    console.log(usage());
    return 0;
  }

  const configPath = findConfig();
  if (!configPath) {
    console.error('Unable to locate codex-agent.yaml in the project root.');
    return 1;
  }

  let config;
  try {
    config = loadConfig(configPath);
  } catch (error) {
    console.error(`Failed to read ${path.basename(configPath)}: ${error.message}`);
    return 1;
  }

  switch (command) {
    case 'list':
    case 'ls':
      listTasks(config);
      return 0;
    case 'run': {
      const taskName = argv[3];
      if (!taskName) {
        console.error('codex run requires a task name.');
        console.log(usage());
        return 1;
      }
      const flags = parseArgs(argv, 4);
      try {
        runTask(taskName, config, flags, env);
        return 0;
      } catch (error) {
        console.error(`Error: ${error.message}`);
        return 1;
      }
    }
    default:
      console.error(`Unknown command "${command}".`);
      console.log(usage());
      return 1;
  }
}

if (require.main === module) {
  const exitCode = main();
  if (Number.isInteger(exitCode) && exitCode !== 0) {
    process.exit(exitCode);
  }
}

module.exports = { usage, main };
