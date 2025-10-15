import { scout } from './agents/scout.js';
import { scribe } from './agents/scribe.js';
import { engineer } from './agents/engineer.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path.startsWith("/research")) return scout(url.searchParams.get("topic"), env);
    if (path.startsWith("/generate")) return scribe(url.searchParams.get("topic"), env);
    if (path.startsWith("/optimize")) return engineer(url.searchParams.get("project"), env);

    return new Response("AI Agent Active", { status: 200 });
  }
};
