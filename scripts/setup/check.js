const shell = require('shelljs');

if (!shell.which("ngrok")) {
    console.log('install ngrok');
    shell.exit(1);
} else if (!shell.which("redis-server")) {
    console.log('install redis');
}

console.log("test");