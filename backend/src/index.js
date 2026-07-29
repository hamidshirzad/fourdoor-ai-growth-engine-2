import app from './app.js';
import { startSchedulers } from './services/scheduler.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Fourdoor AI Growth Engine API running on port ${PORT}`);
  if (process.env.DISABLE_SCHEDULERS !== 'true') startSchedulers();
});

export default app;
