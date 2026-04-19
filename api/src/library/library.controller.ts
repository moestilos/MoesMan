import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { LibraryService } from './library.service';
import { AddMangaDto } from './dto/add-manga.dto';

@Controller('library')
@UseGuards(JwtAuthGuard)
export class LibraryController {
  constructor(private readonly svc: LibraryService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.svc.list(user.id);
  }

  @Post()
  add(@CurrentUser() user: AuthUser, @Body() dto: AddMangaDto) {
    return this.svc.add(user.id, dto);
  }

  @Get(':providerId/:mangaId')
  has(
    @CurrentUser() user: AuthUser,
    @Param('providerId') providerId: string,
    @Param('mangaId') mangaId: string,
  ) {
    return this.svc.has(user.id, providerId, mangaId).then((has) => ({ has }));
  }

  @Delete(':providerId/:mangaId')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('providerId') providerId: string,
    @Param('mangaId') mangaId: string,
  ) {
    return this.svc.remove(user.id, providerId, mangaId);
  }
}
