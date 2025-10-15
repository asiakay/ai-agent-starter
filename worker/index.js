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
      default:
        return new Response('AI Agent Active', { status: 200 });
    }
  }
};
