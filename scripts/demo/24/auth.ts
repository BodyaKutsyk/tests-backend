import { Helper24 } from './utils.js';

async function main() {
  const helper = new Helper24();
  await helper.dataSource.initialize();
  const session = await helper.signUp();
  console.log(session);

  const result = await helper.refresh(session.refreshToken);
  console.log(result);

  await helper.dataSource.destroy();
}

await main();
