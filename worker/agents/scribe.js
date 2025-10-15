export async function scribe(topic, env) {
  return new Response(`Generating content for ${topic}...`, { status: 200 });
}
