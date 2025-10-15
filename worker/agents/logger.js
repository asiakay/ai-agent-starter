export async function logTask(env, type, topic, output) {
  if (!env?.AGENT_DB) {
    return;
  }

  try {
    await env.AGENT_DB.prepare(
      'INSERT INTO task_log (type, topic, output) VALUES (?1, ?2, ?3)'
    )
      .bind(type, topic ?? '', output ?? '')
      .run();
  } catch (error) {
    console.error('Failed to log task', { error, type, topic });
  }
}
