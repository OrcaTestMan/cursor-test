import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { trimString } from '../../common/text.js';

const BEST_MESSAGE = '인기글 기준 추천 수는 1~100 사이 정수여야 합니다.';
const HIDE_MESSAGE = '자동 숨김 신고 수는 1~100 사이 정수여야 합니다.';
const POST_COOLDOWN_MESSAGE = '글 작성 간격은 0~600초 사이 정수여야 합니다.';
const COMMENT_COOLDOWN_MESSAGE =
  '댓글 작성 간격은 0~600초 사이 정수여야 합니다.';

function trimTags({ value }: { value: unknown }): unknown {
  return Array.isArray(value)
    ? value.map((tag: unknown) => (typeof tag === 'string' ? tag.trim() : tag))
    : value;
}

const TAGS_ARRAY_MESSAGE = '말머리는 목록이어야 합니다.';
const TAGS_SIZE_MESSAGE = '말머리는 20개까지 등록할 수 있습니다.';
const TAG_STRING_MESSAGE = '말머리는 문자열이어야 합니다.';
const TAG_LENGTH_MESSAGE = '말머리는 각각 1~20자로 입력해 주세요.';
const TAGS_UNIQUE_MESSAGE = '같은 말머리가 두 번 들어 있습니다.';

export class UpdateSettingsDto {
  @Transform(trimString)
  @IsString({ message: '사이트 이름을 입력해 주세요.' })
  @Matches(/\S/, { message: '사이트 이름을 입력해 주세요.' })
  @Length(1, 30, { message: '사이트 이름은 1~30자로 입력해 주세요.' })
  siteName!: string;

  @IsString({ message: '공지 배너는 문자열이어야 합니다.' })
  @Length(0, 200, { message: '공지 배너는 200자까지 쓸 수 있습니다.' })
  noticeBanner!: string;

  @IsBoolean({ message: '회원가입 허용 여부는 true 또는 false여야 합니다.' })
  signupEnabled!: boolean;

  @IsBoolean({ message: '글 승인 사용 여부는 true 또는 false여야 합니다.' })
  postApprovalRequired!: boolean;

  @IsInt({ message: BEST_MESSAGE })
  @Min(1, { message: BEST_MESSAGE })
  @Max(100, { message: BEST_MESSAGE })
  bestThreshold!: number;

  @Transform(trimTags)
  @IsArray({ message: TAGS_ARRAY_MESSAGE })
  @ArrayMaxSize(20, { message: TAGS_SIZE_MESSAGE })
  @IsString({ each: true, message: TAG_STRING_MESSAGE })
  @Length(1, 20, { each: true, message: TAG_LENGTH_MESSAGE })
  @ArrayUnique({ message: TAGS_UNIQUE_MESSAGE })
  freeTags!: string[];

  @Transform(trimTags)
  @IsArray({ message: TAGS_ARRAY_MESSAGE })
  @ArrayMaxSize(20, { message: TAGS_SIZE_MESSAGE })
  @IsString({ each: true, message: TAG_STRING_MESSAGE })
  @Length(1, 20, { each: true, message: TAG_LENGTH_MESSAGE })
  @ArrayUnique({ message: TAGS_UNIQUE_MESSAGE })
  matchTags!: string[];

  @Transform(trimTags)
  @IsArray({ message: TAGS_ARRAY_MESSAGE })
  @ArrayMaxSize(20, { message: TAGS_SIZE_MESSAGE })
  @IsString({ each: true, message: TAG_STRING_MESSAGE })
  @Length(1, 20, { each: true, message: TAG_LENGTH_MESSAGE })
  @ArrayUnique({ message: TAGS_UNIQUE_MESSAGE })
  humorTags!: string[];

  @Transform(trimTags)
  @IsArray({ message: TAGS_ARRAY_MESSAGE })
  @ArrayMaxSize(20, { message: TAGS_SIZE_MESSAGE })
  @IsString({ each: true, message: TAG_STRING_MESSAGE })
  @Length(1, 20, { each: true, message: TAG_LENGTH_MESSAGE })
  @ArrayUnique({ message: TAGS_UNIQUE_MESSAGE })
  reviewTags!: string[];

  @Transform(trimTags)
  @IsArray({ message: TAGS_ARRAY_MESSAGE })
  @ArrayMaxSize(20, { message: TAGS_SIZE_MESSAGE })
  @IsString({ each: true, message: TAG_STRING_MESSAGE })
  @Length(1, 20, { each: true, message: TAG_LENGTH_MESSAGE })
  @ArrayUnique({ message: TAGS_UNIQUE_MESSAGE })
  newsTags!: string[];

  @IsInt({ message: HIDE_MESSAGE })
  @Min(1, { message: HIDE_MESSAGE })
  @Max(100, { message: HIDE_MESSAGE })
  reportHideThreshold!: number;

  @IsInt({ message: POST_COOLDOWN_MESSAGE })
  @Min(0, { message: POST_COOLDOWN_MESSAGE })
  @Max(600, { message: POST_COOLDOWN_MESSAGE })
  postCooldownSec!: number;

  @IsInt({ message: COMMENT_COOLDOWN_MESSAGE })
  @Min(0, { message: COMMENT_COOLDOWN_MESSAGE })
  @Max(600, { message: COMMENT_COOLDOWN_MESSAGE })
  commentCooldownSec!: number;
}
