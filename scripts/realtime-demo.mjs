import { io } from 'socket.io-client';
import { parseArgs } from 'node:util';
import { Helper } from './utils/helper.ts';
import { randomUUID } from 'crypto';

const options = {
  ['same-room']: { type: 'boolean' },
};

const { values } = parseArgs({ options });
const isSameRoom = !!values['same-room'];
const PORT = Number(process.env.API_PORT || 3000);

function listen(roomId, userId) {
  const socket = io(`http://localhost:${PORT}/tests`, {
    autoConnect: false,
    auth: { testJobId: roomId, userId },
  });
  const events = [];

  socket.on('test.status', ({ data }) => events.push(data));

  const ready = new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });

  socket.connect();
  return { socket, events, ready };
}

async function realtimeDemo(isSameRoom) {
  const helper = new Helper();
  const dataSource = helper.dataSource;
  await dataSource.initialize();
  const [user1, user2] = await Promise.all([
    helper.getUserWithDocuments(),
    helper.getUserWithDocuments(),
  ]);

  const user1Docs = user1.documents.map((doc) => doc.id);
  const user2Docs = user2.documents.map((doc) => doc.id);
  const idempotentId1 = randomUUID();
  const idempotentId2 = randomUUID();

  const user1TestPayload = {
    questionCount: 10,
    questionType: 'multiple-choice',
    files: [...user1Docs],
  };

  const user2TestPayload = {
    questionCount: 10,
    questionType: 'multiple-choice',
    files: [...user2Docs],
  };

  const user1TestPromise = helper.createTest(
    user1TestPayload,
    idempotentId1,
    user1.id,
  );
  const user2TestPromise = helper.createTest(
    user2TestPayload,
    idempotentId2,
    user2.id,
  );

  const [user1Test, user2Test] = await Promise.all([
    user1TestPromise,
    user2TestPromise,
  ]);

  const room1Id = user1Test.id;
  const room2Id = user2Test.id;
  const a = listen(room1Id, user1.id);
  const b = listen(
    isSameRoom ? room1Id : room2Id,
    isSameRoom ? user1.id : user2.id,
  );
  try {
    await Promise.all([a.ready, b.ready]);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('A event timeout')),
        25_000,
      );

      a.socket.on('test.status', ({ data }) => {
        if (data.id === room1Id && ['done', 'failed'].includes(data.status)) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    const aReceived = a.events.some((event) => event.id === room1Id);
    const bReceived = b.events.some((event) => event.id === room1Id);

    console.log(`A_RECEIVED=${Number(aReceived)}`);
    console.log(`B_RECEIVED=${Number(bReceived)}`);
    process.exitCode = Number(!aReceived || bReceived !== isSameRoom);
  } finally {
    a.socket.disconnect();
    b.socket.disconnect();
    await dataSource.destroy();
  }
}

await realtimeDemo(isSameRoom);
