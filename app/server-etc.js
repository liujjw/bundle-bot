const express = require('express');
let app = express();
app.post('/test', async (req, res) => {
    res.send('done');
});
app.listen(8545, () => {});