import { IsOptional, IsString, Length } from 'class-validator';

export class AddMangaDto {
  @IsString()
  @Length(1, 32)
  providerId!: string;

  @IsString()
  @Length(1, 128)
  mangaId!: string;

  @IsString()
  @Length(1, 512)
  title!: string;

  @IsOptional()
  @IsString()
  coverUrl?: string | null;
}
