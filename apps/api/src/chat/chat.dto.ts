import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Matches, Min } from 'class-validator';

export class ListChatDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  beforeId?: number;
}

export class CreateChatDto {
  @IsString({ message: '내용을 입력해 주세요.' })
  @Matches(/\S/, { message: '내용을 입력해 주세요.' })
  @Length(1, 500, { message: '메시지는 1~500자로 입력해 주세요.' })
  body!: string;
}
