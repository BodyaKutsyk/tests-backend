import { io } from 'socket.io-client';
import { parseArgs } from 'node:util';

const options = {
  ['same-room']: { type: 'boolean' },
};

const { values } = parseArgs({ options });

const isSameRoom = !!values['same-room'];

function getTestStatusRequest(requestData) {
  return new Promise((res, rej) => {
    const socket = io('http://localhost:3000/tests', {
      auth: {
        testJobId: requestData.testId,
      },
    });

    socket.on('connect', () => {
      console.log('Connected:', socket.id);
    });

    socket.on('test.status', ({ data }) => {
      console.log(`[test-#${requestData.testId}] status: ${data.status}`);
      requestData.status = data.status;
      if (data.status === 'done' || data.status === 'failed') {
        res();
        socket.disconnect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Connection failed:', error.message);
      rej();
      socket.disconnect();
    });
  });
}

const request1 = {
  testId: '123',
  status: '',
};

const request2 = {
  testId: '1234',
  status: '',
};

if (isSameRoom) {
  request2.testId = request1.testId;
}

await Promise.all([
  getTestStatusRequest(request1),
  getTestStatusRequest(request2),
]);

console.log(
  `Request 1 -> testId: ${request1.testId} received status: ${request1.status}`,
);
console.log(
  `Request 2 -> testId: ${request2.testId} received status: ${request2.status}`,
);
if (isSameRoom) {
  process.exit(
    Number(
      !Boolean(
        request1.testId === request2.testId &&
        request1.status === request2.status,
      ),
    ),
  );
} else {
  process.exit(Number(!Boolean(request1.testId !== request2.testId)));
}
