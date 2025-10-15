import { scout } from './agents/scout.js';
import { scribe } from './agents/scribe.js';
import { engineer } from './agents/engineer.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname, searchParams } = url;

    switch (pathname) {
      case '/research':
        return scout(searchParams.get('topic'), env);
      case '/generate':
        return scribe(searchParams.get('topic'), env);
      case '/optimize':
        return engineer(searchParams.get('project'), env);
      case '/logs':
        if (request.method !== 'GET') {
          return new Response('Method Not Allowed', {
            status: 405,
            headers: { 'allow': 'GET' }
          });
        }

        if (!env?.AGENT_DB) {
          return Response.json(
            { error: 'D1 database binding missing' },
            { status: 500 }
          );
        }

        try {
          const { results } = await env.AGENT_DB.prepare(
            `SELECT id, type, topic, output, created_at
             FROM task_log
             ORDER BY created_at DESC
             LIMIT 50`
          ).all();

          return Response.json(results ?? []);
        } catch (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }
      case '/api/codex-agent':
        if (request.method !== 'GET') {
          return new Response('Method Not Allowed', {
            status: 405,
            headers: { allow: 'GET' }
          });
        }

        return Response.json({
          name: 'Codex Agent',
          description:
            'Central coordination point that exposes the available AI helper routes.',
          baseUrl: `${url.protocol}//${url.host}`,
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
          ]
        });
      default:
        return new Response('AI Agent Active', { status: 200 });
    }
  }
};
