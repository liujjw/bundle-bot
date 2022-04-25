const { fork } = require("child_process");
const Queue = require("bull");

/**
 * Profile a Bull task queue. 
 * 
 * Start an appropriate redis instance first. 
 */
async function main() {
  const taskQ = new Queue("task q", "http://127.0.0.1:6379", {
    redis: {
      db: 1
    }
  });

  fork(__dirname + "/worker.js");
  fork(__dirname + "/worker.js");
  fork(__dirname + "/worker.js");
  fork(__dirname + "/worker.js");
  fork(__dirname + "/worker.js");

  taskQ.add({ chunkIndex: 0, splitFactor: 5});  
  taskQ.add({ chunkIndex: 1, splitFactor: 5});  
  taskQ.add({ chunkIndex: 2, splitFactor: 5});  
  taskQ.add({ chunkIndex: 3, splitFactor: 5});  
  taskQ.add({ chunkIndex: 4, splitFactor: 5});  
}

main().then(() => {}).catch((e) => {
  console.error(e);
});