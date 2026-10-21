import { Pact, Matchers } from '@pact-foundation/pact';
import { User } from '../src/entities/user.js';

const path = new URL('contracts', import.meta.url).pathname;

const pact = new Pact({
  provider: 'tests-api',
  consumer: 'frontend',
  dir: path,
});

const { eachLike, uuid, string, timestamp } = Matchers;

interface UsersResponse {
  nextCursor?: string;
  items: User[];
}

describe('API Contract Testing', () => {
  describe('users', () => {
    test('successfully returns users', async () => {
      await pact
        .addInteraction()
        .uponReceiving('a request to get users')
        .withRequest('GET', '/users', (builder) => {
          builder.query({
            limit: '10',
          });
        })
        .willRespondWith(200, (builder) => {
          builder.headers({
            'Content-Type': 'application/json',
          });

          builder.jsonBody({
            items: eachLike({
              id: uuid('d3b07384-d113-4956-a5e2-aa591974421b'),
              email: string('test@example.com'),
              firstName: string('Jane'),
              lastName: string('Doe'),
              createdAt: timestamp(
                "yyyy-MM-dd'T'HH:mm:ss.SSSX",
                '2026-08-28T14:30:00.000Z',
              ),
              updatedAt: timestamp(
                "yyyy-MM-dd'T'HH:mm:ss.SSSX",
                '2026-08-28T14:30:00.000Z',
              ),
            }),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/users?limit=10`);
          const { items } = (await response.json()) as UsersResponse;
          expect(items?.[0]).not.toBeUndefined();
          const user = items[0] as User;
          expect(user).toMatchObject({
            id: 'd3b07384-d113-4956-a5e2-aa591974421b',
            email: 'test@example.com',
            firstName: 'Jane',
            lastName: 'Doe',
            createdAt: '2026-08-28T14:30:00.000Z',
            updatedAt: '2026-08-28T14:30:00.000Z',
          });
        });
    });
  });
});
