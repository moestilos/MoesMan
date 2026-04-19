import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { ProgressService } from './progress.service';
import { UpdateProgressDto } from './dto/update-progress.dto';

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly svc: ProgressService) {}

  @Post()
  upsert(@CurrentUser() user: AuthUser, @Body() dto: UpdateProgressDto) {
    return this.svc.upsert(user.id, dto);
  }

  @Get('history')
  history(@CurrentUser() user: AuthUser, @Query('limit') limit?: string) {
    return this.svc.history(user.id, limit ? Number(limit) : 30);
  }

  @Get(':providerId/:mangaId')
  forManga(
    @CurrentUser() user: AuthUser,
    @Param('providerId') providerId: string,
    @Param('mangaId') mangaId: string,
  ) {
    return this.svc.forManga(user.id, providerId, mangaId);
  }
}
