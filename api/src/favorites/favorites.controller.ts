import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { FavoritesService } from './favorites.service';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly svc: FavoritesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.svc.list(user.id);
  }

  @Post(':providerId/:mangaId/toggle')
  toggle(
    @CurrentUser() user: AuthUser,
    @Param('providerId') providerId: string,
    @Param('mangaId') mangaId: string,
  ) {
    return this.svc.toggle(user.id, providerId, mangaId);
  }
}
