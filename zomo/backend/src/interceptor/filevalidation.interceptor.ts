import { appConstant } from '@common-constants';
import {
    CallHandler,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import * as moment from 'moment-timezone';
import { Observable } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { TranslationService } from 'src/modules/translation/translation.service';
@Injectable()
export class FileValidationInterceptor implements NestInterceptor {
    private requestCounts: { [key: string]: moment.Moment[] } = {};
    constructor(private readonly translatorService: TranslationService) {}
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const clientIP = request.ip;
        if ((request.method === 'POST' || request.method === 'PUT') && request.is('multipart/form-data')) {
            return new Observable(observer => {
                let body: Buffer[] = [];
                request.on('data', chunk => {
                    body.push(chunk);
                });
                request.on('end', () => {
                    const fullBody = Buffer.concat(body).toString();
                    const hasFile = fullBody.includes('filename=');
                    // Check if there's no file uploaded
                    if (!hasFile || !request.files || Object.keys(request.files).length === 0) {
                        observer.complete(); // No file to process, complete
                        return;
                    }
                    // Rate limiting logic
                    const rateLimit = parseInt(appConstant.FILE_UPLOAD_RATE_LIMIT) || 10;
                    const timeWindow = 1; // Time window in minutes
                    // Initialize request count for the IP if it doesn't exist
                    if (!this.requestCounts[clientIP]) {
                        this.requestCounts[clientIP] = [];
                    }
                    // Filter out requests that are older than the time window
                    const cutoffTime = moment().subtract(timeWindow, 'minutes');
                    this.requestCounts[clientIP] = this.requestCounts[clientIP].filter(time => moment(time) > cutoffTime);
                    // Check if the current request count exceeds the rate limit
                    if (this.requestCounts[clientIP].length >= rateLimit) {
                        observer.error(new HttpException(
                            this.translatorService.translate(request?.lang, "ERR_TOO_MANY_FILE_UPLOADS"),
                            HttpStatus.TOO_MANY_REQUESTS
                        ));
                        return;
                    }
                    // Record the current request
                    this.requestCounts[clientIP].push(moment());
                    observer.next(true); // Emit a value to continue
                    observer.complete(); // Complete the observable
                });
                request.on('error', err => {
                    observer.error(err); // Handle any request errors
                });
            }).pipe(
                mergeMap(() => next.handle()), // Continue to the next handler
                catchError(err => {
                    // Handle any errors and rethrow if necessary
                    throw err;
                })
            );
        }
        // If not a file upload, just proceed
        return next.handle();
    }
}
// import {
//     Injectable,
//     NestInterceptor,
//     ExecutionContext,
//     CallHandler,
//     HttpException,
//     HttpStatus,
// } from '@nestjs/common';
// import * as moment from 'moment-timezone';
// import { Observable, throwError } from 'rxjs';
// import { catchError, mergeMap } from 'rxjs/operators';
// import * as formidable from 'formidable';
// import { appConstant } from '@common-constants';
// import { TranslationService } from 'src/modules/translation/translation.service';
// @Injectable()
// export class FileValidationInterceptor implements NestInterceptor {
//     private requestCounts: { [key: string]: moment.Moment[] } = {};
//     constructor(private readonly translatorService: TranslationService) {}
//     intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
//         const request = context.switchToHttp().getRequest();
//         const clientIP = request.ip;
//         if ((request.method === 'POST' || request.method === 'PUT') && request.is('multipart/form-data')) {
//             const form = formidable({ multiples: true});
//             return new Observable(observer => {
//                 form.parse(request, (err, fields, files) => {
//                     if (err) {
//                         observer.error(new HttpException('Error processing upload', HttpStatus.BAD_REQUEST));
//                         return;
//                     }
//                     request.body = fields;
//                     request.files = files;
//                     const hasFiles = files && Object.keys(files).length > 0;
//                     const rateLimit = parseInt(appConstant.FILE_UPLOAD_RATE_LIMIT) || 10;
//                     const timeWindow = 1; 
//                     if (!this.requestCounts[clientIP]) {
//                         this.requestCounts[clientIP] = [];
//                     }
//                     const cutoffTime = moment().subtract(timeWindow, 'minutes');
//                     this.requestCounts[clientIP] = this.requestCounts[clientIP].filter(time => moment(time) > cutoffTime);
//                     if (hasFiles) {
//                         if (this.requestCounts[clientIP].length >= rateLimit) {
//                             observer.error(new HttpException(
//                                 this.translatorService.translate(request?.lang, "ERR_TOO_MANY_FILE_UPLOADS"),
//                                 HttpStatus.TOO_MANY_REQUESTS
//                             ));
//                             return;
//                         }
//                         this.requestCounts[clientIP].push(moment());
//                     }
//                     observer.next();
//                     observer.complete(); 
//                     return;
//                 });
//             }).pipe(
//                 mergeMap(() => next.handle()), 
//                 catchError(err => {
//                     return throwError(() => err);
//                 })
//             );
//         }
//         return next.handle();
//     }
// }
// @Injectable()
// export class FileValidationInterceptor implements NestInterceptor {
//     private requestCounts: { [key: string]: moment.Moment[] } = {};
//     constructor(private readonly translatorService: TranslationService) {}
//     intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
//         const request = context.switchToHttp().getRequest();
//         const clientIP = request.ip;
//         let isFileUpload = false;
//         if((request.method === 'POST' || request.method === 'PUT') && request.is('multipart/form-data')){
//             let body = [];
//             request.on('data', chunk => {
//                 body.push(chunk);
//             });
//             request.on('end', () => {
//                 const fullBody = Buffer.concat(body).toString();
//                 const hasFile = fullBody.includes('filename=');
//                 if(hasFile ){
//                     isFileUpload = true;
//                 };
//             });
//             if (!request.files || Object.keys(request.files).length === 0) {
//                 isFileUpload = false;
//             }
//         }
//         if (!isFileUpload) {
//             return next.handle();
//         }
//         const rateLimit = parseInt(appConstant.FILE_UPLOAD_RATE_LIMIT) || 10;
//         const timeWindow = 1; // Time window in minutes
//         // Initialize request count for the IP if it doesn't exist
//         if (!this.requestCounts[clientIP]) {
//             this.requestCounts[clientIP] = [];
//         }
//         // Filter out requests that are older than the time window
//         const cutoffTime = moment().subtract(timeWindow, 'minutes');
//         this.requestCounts[clientIP] = this.requestCounts[clientIP].filter(time => moment(time) > cutoffTime);
//         // Check if the current request count exceeds the rate limit
//         if (this.requestCounts[clientIP].length >= rateLimit) {
//             throw new HttpException(
//                 this.translatorService.translate(request?.lang, "ERR_TOO_MANY_FILE_UPLOADS"),
//                 HttpStatus.TOO_MANY_REQUESTS
//             );
//         }
//         // Record the current request
//         this.requestCounts[clientIP].push(moment());
//         return next.handle();
//     }
// }
