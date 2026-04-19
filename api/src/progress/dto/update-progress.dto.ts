import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class UpdateProgressDto {
  @IsString()
  @Length(1, 32)
  providerId!: string;

  @IsString()
  @Length(1, 128)
  mangaId!: string;

  @IsString()
  @Length(1, 128)
  chapterId!: string;

  @IsOptional()
  @IsString()
  chapterNumber?: string | null;

  @IsInt()
  @Min(0)
  page!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalPages?: number;
}
