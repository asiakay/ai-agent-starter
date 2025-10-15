import { logTask } from './logger.js';

export async function scout(topic, env) {
  const safeTopic = topic ?? 'general topic';
  const output = `Researching ${safeTopic}...`;
  await logTask(env, 'research', safeTopic, output);
  return new Response(output, { status: 200 });
}
