import { appConstant } from "@common-constants";
import {
    CallHandler,
    ExecutionContext,
    HttpStatus,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { HttpException } from "@nestjs/common/exceptions/http.exception";
import * as moment from 'moment-timezone';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TranslationService } from 'src/modules/translation/translation.service';
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
    constructor(private readonly translatorService: TranslationService) {}
    private requestCounts: { [key: string]: moment.Moment[] } = {};
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const clientIP = request.ip;
        if (!this.requestCounts[clientIP]) {
            this.requestCounts[clientIP] = [];
        }
        const cutoffTime = moment().subtract(1, 'minute');
        this.requestCounts[clientIP] = this.requestCounts[clientIP].filter(time => moment(time) > cutoffTime);
        const rateLimit = parseInt(appConstant.RATE_LIMIT) || 45;
        if (this.requestCounts[clientIP].length >= rateLimit) {
             throw new Error(this.translatorService.translate(request?.lang, "ERR_TOO_MANY_REQUEST"));
        }
        this.requestCounts[clientIP].push(moment());
        return next.handle().pipe(
            catchError(err => throwError(() => new HttpException(err.message,HttpStatus.BAD_REQUEST))))
    }
}
