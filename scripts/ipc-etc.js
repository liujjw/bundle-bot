const ipc = require("node-ipc");
ipc.config.id = "baz";

ipc.serve(() => {
  ipc.server.on("message", (data, socket) => {
    ipc.server.emit(socket, "message", data + " meenie");
  });
});

ipc.server.start();
