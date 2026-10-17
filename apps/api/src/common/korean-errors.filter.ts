import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

type ErrorBody = { statusCode: number; message: string | string[]; error: string };

function toBody(exception: HttpException): ErrorBody {
  const status = exception.getStatus();
  const raw = exception.getResponse();
  const body: ErrorBody =
    typeof raw === 'string'
      ? { statusCode: status, message: raw, error: exception.name }
      : (raw as ErrorBody);

  const message = typeof body.message === 'string' ? body.message : '';
  if (status === HttpStatus.NOT_FOUND && message.startsWith('Cannot ')) {
    return { ...body, message: '요청한 주소를 찾을 수 없습니다.' };
  }
  if (
    status === HttpStatus.BAD_REQUEST &&
    (exception.cause instanceof SyntaxError || /\bJSON\b/.test(message))
  ) {
    return { ...body, message: '요청 형식이 올바르지 않습니다.' };
  }
  if (status === HttpStatus.PAYLOAD_TOO_LARGE) {
    return { ...body, message: '요청 내용이 너무 큽니다.' };
  }
  return body;
}

@Catch(HttpException)
export class KoreanErrorsFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    res.status(exception.getStatus()).json(toBody(exception));
  }
}
