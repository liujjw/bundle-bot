import { Queue, Worker, QueueEvents } from "bullmq";

const queue = new Queue("Paint");

queue.add("cars", { color: "blue" });

const worker = new Worker("Paint", async (job) => {
  if (job.name === "cars") {
    await paintCar(job.data.color);
  }
});

const queueEvents = new QueueEvents("Paint");

queueEvents.on("completed", ({ jobId }) => {
  console.log("done painting");
});

queueEvents.on("failed", ({ jobId: string, failedReason: string }) => {
  console.error("error painting", failedReason);
});

// export function feedPets(pets) {
//   // ...
// }
