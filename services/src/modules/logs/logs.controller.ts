import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../guards/auth.guard';
import { LogsService } from './logs.service';

@Controller('logs')
@UseGuards(AuthGuard)
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Post('send')
  async sendLogs(@Req() req: any, @Body() body: any) {
    return this.logsService.sendLogs(body, req.user.keyId);
  }
}
