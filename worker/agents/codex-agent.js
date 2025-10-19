const DEFAULT_BRANCH = 'main';

function buildCommand({ repoUrl, instruction, branch }) {
  const targetBranch = branch || DEFAULT_BRANCH;
  const segments = repoUrl.split('/').filter(Boolean);
  const repoName = (segments[segments.length - 1] ?? '').replace(/\.git$/, '') || 'repo';
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
  ].join('\n');
}

export async function codexAgent(request, env) {
  if (request.method === 'GET') {
    const baseUrl = env?.baseUrl ?? '';
    return Response.json({
      name: 'Codex Agent',
      description:
        'Coordinates Codex code-generation runs by forwarding instructions to GitHub.',
      baseUrl,
      endpoints: [
        {
          path: '/research',
          method: 'GET',
          query: ['topic'],
          summary: 'Uses the scout agent to gather research for a given topic.'
        },
        {
          path: '/generate',
          method: 'GET',
          query: ['topic'],
          summary: 'Uses the scribe agent to draft content for a topic.'
        },
        {
          path: '/optimize',
          method: 'GET',
          query: ['project'],
          summary:
            'Uses the engineer agent to streamline workflows for a project.'
        },
        {
          path: '/logs',
          method: 'GET',
          summary: 'Retrieves the 50 most recent agent task log entries.'
        }
      ],
      usage: {
        method: 'POST',
        path: '/api/codex-agent',
        body: {
          instruction: 'Required string of repo changes for Codex to execute.',
          repoUrl: 'Optional Git repository URL. Defaults to env.GITHUB_REPO.',
          branch: 'Optional branch Codex should work on. Defaults to main.',
          dryRun:
            'Optional flag. When true the worker will return the command payload without hitting GitHub.'
        }
      }
    });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { allow: 'GET, POST' }
    });
  }

  let payload;

  try {
    payload = await request.json();
  } catch (error) {
    return Response.json(
      { error: 'Invalid JSON payload', details: error.message },
      { status: 400 }
    );
  }

  const instruction = payload?.instruction?.trim();
  const repoUrl = payload?.repoUrl?.trim() || env?.GITHUB_REPO;
  const branch = payload?.branch?.trim();
  const dryRun = Boolean(payload?.dryRun);

  if (!instruction) {
    return Response.json(
      { error: 'instruction is required' },
      { status: 400 }
    );
  }

  if (!repoUrl) {
    return Response.json(
      {
        error: 'repoUrl missing',
        details: 'Provide repoUrl in the request or set the GITHUB_REPO environment variable.'
      },
      { status: 400 }
    );
  }

  const commandScript = buildCommand({ repoUrl, instruction, branch });

  if (dryRun) {
    return Response.json({
      status: 'dry-run',
      repoUrl,
      branch: branch || DEFAULT_BRANCH,
      commandScript
    });
  }

  if (!env?.GITHUB_TOKEN) {
    return Response.json(
      {
        error: 'Missing GitHub token',
        details: 'Set the GITHUB_TOKEN secret to allow dispatching Codex jobs.'
      },
      { status: 500 }
    );
  }

  if (!env?.GITHUB_OWNER || !env?.GITHUB_REPO_NAME) {
    return Response.json(
      {
        error: 'Missing GitHub owner or repo name',
        details: 'Set GITHUB_OWNER and GITHUB_REPO_NAME environment bindings.'
      },
      { status: 500 }
    );
  }

  const githubBody = {
    event_type: 'codex-agent-run',
    client_payload: {
      instruction,
      repoUrl,
      branch: branch || DEFAULT_BRANCH,
      commandScript
    }
  };

  const response = await fetch(
    `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO_NAME}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ai-agent-starter-worker'
      },
      body: JSON.stringify(githubBody)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    return Response.json(
      {
        error: 'Failed to dispatch GitHub workflow',
        status: response.status,
        details: errorText
      },
      { status: 502 }
    );
  }

  return Response.json({
    status: 'queued',
    repoUrl,
    branch: branch || DEFAULT_BRANCH,
    commandScript
  });
}
