import { Expose, Transform, Type } from 'class-transformer';
import { WeekDays } from '../../enum';
const moment = require('moment-timezone');
export class CompanySupportDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() title: string;
    @Expose() cname: string;
    @Expose() email: string;
    @Expose() message: string;
    @Expose() icon: string;
    @Expose() ph_number: string;
    @Expose() operation: string;
    @Expose() operation_week_day: string;
    @Expose() operation_time: string;
    @Expose() status: number;
    @Expose() timezone: number;
    @Expose() start_day: number;
    @Expose() end_day: number;
    @Expose() start_time: string ;
    @Expose() end_time: string;
    @Expose()
    @Type(() => String)
    @Transform(({obj }) => {
        if (!obj) return obj; // Return the value if it's undefined or null
        const defaultTimezone = 'UTC';
        let timezones = defaultTimezone;
        let timezoneInfoAlias=''
        if (obj?.timezoneData && obj?.timezone) {
            const timezoneInfo = obj?.timezoneData.find((data) => data.id === obj.timezone);
            timezones = timezoneInfo ? timezoneInfo.name : defaultTimezone; // Ensure fallback to UTC if no match
            timezoneInfoAlias=timezoneInfo.alias
        }
        // Convert the value to the specified timezone
        let startTime= moment.tz(obj?.start_time, "hh:mm A", timezones).format("hh:mm A")=== 'Invalid date'? '' : moment.tz(obj?.start_time, "hh:mm A", timezones).format("hh:mm A")||'';
        let endTime= moment.tz(obj?.end_time, "hh:mm A", timezones).format("hh:mm A")==='Invalid date'? '' : moment.tz(obj?.end_time, "hh:mm A", timezones).format("hh:mm A")|| '';
        let startDay = WeekDays[obj.start_day as number] || ''
        let endDay = WeekDays[obj.end_day as number] || ''
        if(startDay === '' && endDay=== '' && startTime === '' && endTime===''){
            return ''
        }else{
            return `${startDay?startDay+'-':''}${endDay} ${startTime?startTime+'-':''}${endTime}(${timezoneInfoAlias == ''?'UTC':timezoneInfoAlias})`;
        }
    }, { toClassOnly: true })
    date_desc: string;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
