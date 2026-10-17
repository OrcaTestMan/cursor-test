import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    if (!/^[1-9]\d{0,8}$/.test(value)) {
      throw new BadRequestException('잘못된 번호입니다.');
    }
    return Number(value);
  }
}
