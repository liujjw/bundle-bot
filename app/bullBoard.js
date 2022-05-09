const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const express = require('express');
const Queue = require('bull');

const taskQueue = new Queue("Task queue", process.env.REDIS_ENDPOINT, {
  redis: {
    db: Number.parseInt(process.env.DB_NUMBER_FOR_JOBS)
  }
});
// taskQueue.pause(false, true).then();
// taskQueue.obliterate({force: true}).then();
// taskQueue.resume(false).then();

const serverAdapter = new ExpressAdapter();
const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
  queues: [new BullAdapter(taskQueue)],
  serverAdapter: serverAdapter,
});
const app = express();
serverAdapter.setBasePath('/admin/queues');
app.use('/admin/queues', serverAdapter.getRouter());
const port = Number.parseInt(process.env.BULL_BOARD_PORT);
app.listen(port, () => {
  process.send(`bull board listening on ${port}`)
});