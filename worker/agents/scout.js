export async function scout(topic, env) {
  return new Response(`Researching ${topic}...`, { status: 200 });
}
