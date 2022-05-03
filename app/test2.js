
const EventEmitter = require("events");

class Test extends EventEmitter {
  constructor() {
    super();
  }

  foo() {
    this.emit("error");
  }
}

module.exports = Test;