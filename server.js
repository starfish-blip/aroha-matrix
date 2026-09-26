const express = require('express');
const cors = require('cors');
const taskRouter = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/tasks', taskRouter);

app.listen(PORT, () => {
  console.log(`Hermes API server running on http://localhost:${PORT}`);
});
