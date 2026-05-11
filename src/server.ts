import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import createApp from './app';
import { initSocket } from './configurations/socket';
import configurations from './configurations';
import { connectToDatabase } from './configurations/database';


const app = createApp();
const server = http.createServer(app);

const PORT = configurations.PORT || 8080;

(async () => {
  try {
    await connectToDatabase();
    initSocket(server);
    server.listen(PORT, () => {
      console.log(`server running on Port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();
