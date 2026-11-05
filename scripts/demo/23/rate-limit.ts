const API_INSTANCES = 2;
const LIMIT = 4;
const REQUESTS_A_AMOUNT = 10;
const REQUESTS_B_AMOUNT = 10;
const API_A_PORT = 3001;
const API_B_PORT = 3002;

async function requestHello(amount: number, port: number) {
  const request = () => fetch(`http://127.0.0.1:${port}/database`);
  return Promise.all(Array.from({ length: amount }, request));
}

async function waitForReady(port: number) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`API on port ${port} did not become ready`);
}

async function main() {
  try {
    await Promise.all([waitForReady(API_A_PORT), waitForReady(API_B_PORT)]);
    const [requestsA, requestsB] = await Promise.all([
      requestHello(REQUESTS_A_AMOUNT, API_A_PORT),
      requestHello(REQUESTS_B_AMOUNT, API_B_PORT),
    ]);
    const passed = [];
    const blocked = [];

    for (const request of [...requestsA, ...requestsB]) {
      if (request.status === 429) {
        blocked.push(request);
      } else if (request.status === 200) {
        passed.push(request);
      }
    }
    const lastBlocked = blocked.at(-1);
    if (!lastBlocked) throw new Error('Expected a rate-limited response');
    const retryAfterPresent = Number(lastBlocked.headers.has('retry-after'));

    console.log(`instances=${API_INSTANCES}`);
    console.log(`limit=${LIMIT}`);
    console.log(`requests=${REQUESTS_A_AMOUNT + REQUESTS_B_AMOUNT}`);
    console.log(`allowed=${passed.length}`);
    console.log(`blocked=${blocked.length}`);
    console.log(`status=${lastBlocked.status}`);
    console.log(`retry-after=${retryAfterPresent}`);
    process.exitCode = Number(passed.length !== LIMIT || !retryAfterPresent);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
}

await main();
