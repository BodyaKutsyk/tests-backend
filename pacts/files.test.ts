import { Pact } from '@pact-foundation/pact'

const path = new URL('pacts', import.meta.url).pathname

const pact = new Pact({
    provider: 'testsProvider',
    consumer: 'consumersProvider',
    dir: path,
})

interface User {
    email: string;
    id: string;
    createdAt: string;
}

interface UsersResponse {
    next_cursor?: string;
    items: User[]
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
                    })
                })
                .willRespondWith(200, (builder) => {
                    builder.jsonBody({
                        items: [{
                            id: 'd3b07384-d113-4956-a5e2-aa591974421b',
                            email: 'test@example.com',
                            createdAt: '2026-08-28T14:30:00Z'
                        }],
                        next_cursor: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVC'
                    })
                })
                .executeTest(async (mockServer) => {
                    const response = await fetch(`${mockServer.url}/users?limit=10`);
                    const { items, next_cursor  } = await response.json() as UsersResponse;
                    expect(items?.[0]).not.toBeUndefined();
                    const { email, id, createdAt } =  items[0] as User;
                    expect(email).toBe('test@example.com');
                    expect(id).toBe('d3b07384-d113-4956-a5e2-aa591974421b')
                    expect(createdAt).toBe('2026-08-28T14:30:00Z')
                })
        })
    })
})