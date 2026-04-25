require('dotenv').config();

const app = require('./app');

const port = process.env.PORT || 4000;

app.listen(port, () => {
  // Keep this log simple for deployment logs.
  console.log(`Backend listening on port ${port}`);
});
