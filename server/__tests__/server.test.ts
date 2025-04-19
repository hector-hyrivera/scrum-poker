import request from 'supertest';
import { createServer } from 'http';
import express from 'express';
import { Server } from 'socket.io';

describe('Backend API', () => {
  let app: express.Express;
  let server: any;
  let io: any;

  beforeAll((done) => {
    app = express();
    server = createServer(app);
    io = new Server(server);
    server.listen(() => done());
  });

  afterAll((done) => {
    io.close();
    server.close(done);
  });

  it('responds to GET / with 404', async () => {
    await request(server).get('/').expect(404);
  });
});
