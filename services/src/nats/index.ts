import { JSONCodec, connect } from 'nats';
const jc = JSONCodec();
let natsConnection: any = null;

export async function getNats() {
  if (!natsConnection) {
    natsConnection = await connect({
      servers: process.env.NATS_URL || 'nats://localhost:4222',
      name: 'oml-server',
    });
    console.log('Connected to NATS server');
  }
  return { nc: natsConnection, jc };
}
