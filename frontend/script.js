async function runTask(type) {
  const topic = prompt('Enter topic or project:');
  const res = await fetch(`/${type}?topic=${encodeURIComponent(topic)}`);
  const text = await res.text();
  document.getElementById('output').innerText = text;
}
