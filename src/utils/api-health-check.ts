import http from 'node:http';

const options = {
  host: 'localhost',
  port: 3000,
  path: '/health',
  timeout: 3000,
};

const request = http.request(options, (res) => {
  console.log(res);
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', () => {
  process.exit(1);
});

request.end();
