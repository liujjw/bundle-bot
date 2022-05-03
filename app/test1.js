const Test = require('./test2.js')

const test = new Test();
test.on("error", err => {
  console.log('hi');
})
test.foo();