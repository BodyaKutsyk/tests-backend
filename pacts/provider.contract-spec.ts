import { Verifier } from '@pact-foundation/pact';

const consumerPath = new URL(
  './pacts/consumersProvider-testsProvider.json',
  import.meta.url,
).pathname;

const pact = new Verifier({
  provider: 'testsProvider',
  providerBaseUrl: 'http://localhost:3000',
  pactUrls: [consumerPath],
});

describe('Provider Verification', () => {
  it('passes consumer expectations', async () => {
    return pact.verifyProvider();
  });
});
