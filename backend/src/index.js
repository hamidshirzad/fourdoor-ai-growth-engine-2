import app from './app.js';
import { shouldStartSchedulers } from './config/runtimeSafety.js';
import { startSchedulers } from './services/scheduler.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Fourdoor AI Growth Engine API running on port ${PORT}`);
  if (shouldStartSchedulers()) {
    startSchedulers();
  } else {
    console.log('Schedulers not started by runtime safety policy');
  }
});

export default app;
