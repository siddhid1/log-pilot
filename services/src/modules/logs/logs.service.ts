import { Injectable } from '@nestjs/common';
import { publishLogBatch } from '../../nats/producer';

@Injectable()
export class LogsService {
  constructor() {}
  async sendLogs(body: any, keyId: string) {
    const serverReceivedAt = Date.now();
    await publishLogBatch(keyId, body.logs, serverReceivedAt);
    return { message: 'OK' };
  }
}
