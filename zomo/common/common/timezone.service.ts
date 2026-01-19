import { Injectable } from '@nestjs/common';
import * as moment from 'moment-timezone';
@Injectable()
export class TimezoneService {
  constructor(
      ) { }
  convertToTimezone(datetime: string, timezone: string): string {
    const convertedDatetime = moment.tz(datetime, timezone).format('YYYY-MM-DD HH:mm:ss');
    return convertedDatetime;
  }
}