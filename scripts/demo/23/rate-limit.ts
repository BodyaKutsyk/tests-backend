const API_INSTANCES = 2;
const REQUESTS_A_AMOUNT = 10;
const REQUESTS_B_AMOUNT = 10;
const API_A_PORT = 3001;
const API_B_PORT = 3002;

async function requestHello(amount: number, port: number) {
  const request = () => fetch(`http://127.0.0.1:${port}/database`);
  return Promise.all(Array.from({ length: amount }, request));
}

async function main() {
  console.log(`instances: ${API_INSTANCES}`);
  const requestsA = await requestHello(REQUESTS_A_AMOUNT, API_A_PORT);
  const requestsB = await requestHello(REQUESTS_B_AMOUNT, API_B_PORT);
  const passed = [];
  const blocked = [];

  for (const request of [...requestsA, ...requestsB]) {
    if (request.status === 429) {
      blocked.push(request);
    } else if (request.status === 200) {
      passed.push(request);
    }
  }
  const lastBlocked = blocked[blocked.length - 1];
  const lastBlockedStatus = lastBlocked.status;
  const lastBlockedRetryAfter = lastBlocked.headers.get('retry-after');

  console.log(`total requests: ${REQUESTS_A_AMOUNT + REQUESTS_B_AMOUNT}`);
  console.log(`Total passed: ${passed.length}`);
  console.log(`Total blocked: ${blocked.length}`);
  console.log(`Last blocked with status: ${lastBlockedStatus}`);
  console.log(`Last blocked retry after value: ${lastBlockedRetryAfter}`);
  process.exit(
    Number(
      !Boolean(
        lastBlockedStatus === 429 && !isNaN(Number(lastBlockedRetryAfter)),
      ),
    ),
  );
}

await main();
