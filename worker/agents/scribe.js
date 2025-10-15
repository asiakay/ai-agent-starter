import { logTask } from './logger.js';

export async function scribe(topic, env) {
  const safeTopic = topic ?? 'general topic';
  const output = `Generating content for ${safeTopic}...`;
  await logTask(env, 'generate', safeTopic, output);
  return new Response(output, { status: 200 });
}
