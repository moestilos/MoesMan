import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './db/db.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { LibraryModule } from './library/library.module';
import { ProgressModule } from './progress/progress.module';
import { FavoritesModule } from './favorites/favorites.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    UsersModule,
    AuthModule,
    LibraryModule,
    ProgressModule,
    FavoritesModule,
  ],
})
export class AppModule {}
