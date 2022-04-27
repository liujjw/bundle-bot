const { fork } = require("child_process");
const Queue = require("bull");

/**
 * Profile a Bull task queue. 
 * 
 * Start an appropriate redis instance first. 
 */
async function main() {
// USE CLUSTER MODE TODO
  const taskQ = new Queue("task q", "http://127.0.0.1:6379", {
    redis: {
      db: 1
    }
  });

  fork(__dirname + "/profileQworker.js");
  fork(__dirname + "/profileQworker.js");
  fork(__dirname + "/profileQworker.js");
  // fork(__dirname + "/profileQworker.js");
  // fork(__dirname + "/profileQworker.js");

  // fork(__dirname + "/profileQworker.js");
  // fork(__dirname + "/profileQworker.js");
  // fork(__dirname + "/profileQworker.js");
  // fork(__dirname + "/profileQworker.js");
  // fork(__dirname + "/profileQworker.js");

  const splitFactor = 3;
  taskQ.add({ chunkIndex: 0, splitFactor: splitFactor});  
  taskQ.add({ chunkIndex: 1, splitFactor: splitFactor});  
  taskQ.add({ chunkIndex: 2, splitFactor: splitFactor});  
  // taskQ.add({ chunkIndex: 3, splitFactor: splitFactor});  
  // taskQ.add({ chunkIndex: 4, splitFactor: splitFactor});  

  // taskQ.add({ chunkIndex: 5, splitFactor: splitFactor});  
  // taskQ.add({ chunkIndex: 6, splitFactor: splitFactor});  
  // taskQ.add({ chunkIndex: 7, splitFactor: splitFactor});  
  // taskQ.add({ chunkIndex: 8, splitFactor: splitFactor});  
  // taskQ.add({ chunkIndex: 9, splitFactor: splitFactor});  
}

main().then(() => {}).catch((e) => {
  console.error(e);
});