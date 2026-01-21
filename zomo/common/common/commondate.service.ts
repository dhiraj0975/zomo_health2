import { Injectable } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { InjectDataSource } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import * as fs from "fs";
import * as moment from 'moment-timezone';
import { lastValueFrom } from 'rxjs';
import { DataSource } from 'typeorm';
import { promisify } from 'util';
import { CacheService } from "../cache/cache.service";
import { appConstant } from '../constant';
import DeviceDetector = require('device-detector-js');
const TRANSLATIONS_DIR = appConstant.TRANSLATIONS_DIR || './src/local';
const readFileAsync = promisify(fs.readFile);
const deviceDetector = new DeviceDetector();
const S3_URL =  process.env.S3_URL_PROD
const secretKey = process.env.SECRET_KEY_PROD.slice(0, 32);
const iv = process.env.SECRET_KEY_PROD.slice(0, 16);
const algorithm = 'aes-256-gcm';
const key = crypto.scryptSync(secretKey!, 'salt', 32);
@Injectable()
export class CommonDateService {
    private readonly commonMicroservice: ClientProxy;
    constructor(
        @InjectDataSource(appConstant.READ_REPLICA.toLowerCase()) 
        private readonly dataSource: DataSource,
        private readonly cacheService: CacheService,
        ) {
            this.commonMicroservice = ClientProxyFactory.create({
                transport: Transport.TCP,
                options: {
                    host: process.env.COMMON_SERVICE_HOST_PROD,
                    port: Number(process.env.COMMON_SERVICE_PORT_PROD),
                },
            });
        }

    checkDate = (date) => {
        try{
            let [year, month, day] = date.split('-');
            if (month < 10) {
                month = `0${month}`;
            }
            if (day < 10) {
                day = `0${day}`;
            }
            const formattedDate = `${year}-${month}-${day}`;
            const pattern =  /^(?:(?:(?:0[13578]|1[02])(\/|-|\.| ?)31)\1|(?:(?:0[1,3-9]|1[0-2])(\/|-|\.| ?)(?:29|30)\2))(?:(?:1[6-9]|[2-9]\d)\d{2})$|^(?:02(\/|-|\.| ?)29\3(?:(?:(?:1[6-9]|[2-9]\d)(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:(?:0[1-9])|(?:1[0-2]))(\/|-|\.| ?)(?:0[1-9]|1\d|2[0-8])\4(?:(?:1[6-9]|[2-9]\d)\d{2})$/;
            if (pattern.test(formattedDate)) {
                return formattedDate;
            }
            return '0';
        }catch(err){
            throw new Error(err.message);
        }
    };
    checkOver18 = (dobStr) => {
        try{
            const splitDob = dobStr['dob'].split('-');
            if (splitDob.length !== 3) {
                throw new Error('Invalid date format. Expected format: MM-DD-YYYY');
            }
            const [dobMonth, dobDay, dobYear] = splitDob;
            const dob = new Date(dobYear, dobMonth - 1, dobDay);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            today.setFullYear(today.getFullYear() - 18);
            if (dob.getTime() < today.getTime()) {
                return true;
            } else {
                return false;
            }
        }catch(err){
            throw new Error(err.message);
        }
    };
    convertDateStrToTime = (getdatedata: string) => {
        try{
            const pattern = /^(?:(?:(?:0[13578]|1[02])(\/|-|\.| ?)31)\1|(?:(?:0[1,3-9]|1[0-2])(\/|-|\.| ?)(?:29|30)\2))(?:(?:1[6-9]|[2-9]\d)\d{2})$|^(?:02(\/|-|\.| ?)29\3(?:(?:(?:1[6-9]|[2-9]\d)(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:(?:0[1-9])|(?:1[0-2]))(\/|-|\.| ?)(?:0[1-9]|1\d|2[0-8])\4(?:(?:1[6-9]|[2-9]\d)\d{2})$/;
            if (typeof getdatedata === 'string' && !pattern.test(getdatedata)) {
                let dateParts: any[] = getdatedata.replace('/', '-').split('-');
                const dateObject = new Date(dateParts['2'], dateParts['0'] - 1, dateParts['1']);
                getdatedata = ('0' + (dateObject.getMonth() + 1)).slice(-2) + '-' + ('0' + dateObject.getDate()).slice(-2) + '-' + dateObject.getFullYear();
            }
            return getdatedata;
        }catch(err){
            throw new Error(err.message);
        }
    };

    generateTimeSlotsWithinAvailableHours(startDate, endDate, availableStartTime, availableEndTime, intervalInMinutes) {
        try{
            const intervals = [];
            let startTime = moment(startDate).startOf('day').add(availableStartTime.hour, 'hours').add(availableStartTime.minute, 'minutes');
            const endTime = moment(endDate).startOf('day').add(availableEndTime.hour, 'hours').add(availableEndTime.minute, 'minutes');
            let totalSlotsInDays = 0;
            if (startTime.isAfter(endTime)) {
                intervalInMinutes = 0;
            }
            if (intervalInMinutes > 0) {
                const timeDiff = endTime.diff(startTime, 'minutes');
                totalSlotsInDays = Math.round(timeDiff / intervalInMinutes);
            }
            for (let i = 0; i < totalSlotsInDays; i++) {
                let endTimeSlot = startTime.clone().add(intervalInMinutes, 'minutes');
                // const startTimeStr = startTime.format('HH:mm');
                // const endTimeStr = endTimeSlot.format('HH:mm');
                intervals.push({ slotdate:`${startDate}`,slotstarttime: startTime.format('HH:mm:ss'), slotendtime: endTimeSlot.format('HH:mm:ss'), slotinterval: intervalInMinutes });
                startTime = endTimeSlot;
            }
            return intervals;
        }catch(err){
            throw new Error(err.message);
        }
    }
    getIntervalsCount(startTime, endTime, intervalInMinutes: number) {
        try{
            const start = moment(startTime, 'HH:mm');
            const end = moment(endTime, 'HH:mm');
            const durationInMinutes = end.diff(start, 'minutes');
            const intervalsCount = Math.ceil(durationInMinutes / intervalInMinutes);
            return intervalsCount;
        }catch(err){
            throw new Error(err.message);
        }
    }
    getIntervalsCountPerDay(startTime, endTime, intervalInMinutes: number) {   
        try{
            const intervalCount = this.getIntervalsCount(startTime, endTime, intervalInMinutes);
            const daysCount = this.getDaysCount(startTime, endTime);
            return Math.floor(intervalCount/daysCount);
        }catch(err){
            throw new Error(err.message);
        }
    }
    getDaysCount(startDate, endDate) {
        try{
        const date1 = moment(startDate);
        const date2 = moment(endDate);
        const diffDays = date2.diff(date1, 'days');
        return diffDays + 1; // Include the start date in the count
        }catch(err){
            throw new Error(err.message);
        }
    }
    generateTimeSlotsWithinAvailableHoursByCount(startDate, endDate, availableStartTime, availableEndTime, slotCount) {
        try{
            const intervals = [];
            let totalMinutes = moment.duration(moment(moment(endDate).add(availableEndTime.hour, 'hours').add(availableEndTime.minute, 'minutes')).diff(moment(moment(startDate).add(availableStartTime.hour, 'hours').add(availableStartTime.minute, 'minutes')))).asMinutes();
            let slotDuration = Math.round(totalMinutes / slotCount);
            let currentTime = moment(startDate).startOf('day').add(availableStartTime.hour, 'hours').add(availableStartTime.minute, 'minutes');
            const endTime = moment(endDate).startOf('day').add(availableEndTime.hour, 'hours').add(availableEndTime.minute, 'minutes');
            for (let i = 0; i < slotCount; i++) {
                let endTimeSlot = currentTime.clone().add(slotDuration, 'minutes');
                if (endTimeSlot.isAfter(endTime)) {
                    endTimeSlot = endTime.clone();
                }
                // const startTimeStr = currentTime.format('HH:mm');
                // const endTimeStr = endTimeSlot.format('HH:mm');
                /*intervals.push({ startTime: currentTime.format('YYYY-MM-DD HH:mm:ss'), endTime: endTimeSlot.format('YYYY-MM-DD HH:mm:ss'), interval: `${startTimeStr} - ${endTimeStr}` });*/
                intervals.push({ slotdate:`${startDate}`,slotstarttime: currentTime.format('HH:mm:ss'), slotendtime: endTimeSlot.format('HH:mm:ss'), slotinterval: slotDuration });
                currentTime = endTimeSlot;
            }
            return intervals;
        }catch(err){
            throw new Error(err.message);
        }
      }
    getDatePeriod(startDate, endDate, interval) {
        try{
            let dateArray = [];
            let currentDate = startDate.clone();
            while (currentDate <= endDate) {
            dateArray.push(currentDate.format('YYYY-MM-DD'));
            currentDate = currentDate.add(interval, 'days');
            }
            return dateArray;
        }catch(err){
            throw new Error(err.message);
        }
    }
    // readTranslation(language: string, fileName: string = appConstant.TRANSLATIONS_FILE) {
    //     try {
    //         let arrayOfObjects1 = [];
    //         let arrayOfObjects2 = [];
    //         let languageDir = path.join(TRANSLATIONS_DIR, 'eng');
    //         let filePath = path.join(languageDir, fileName);
    //         if (fs.existsSync(filePath)) {
    //             const data = fs.readFileSync(filePath, { encoding: 'utf-8' });
    //             arrayOfObjects1 = Object.entries(JSON.parse(data)).map(([key, value]) => ({ type: key, english: value, translate: value }));
    //             if(arrayOfObjects1){
    //                 languageDir = path.join(TRANSLATIONS_DIR, language);
    //                 filePath = path.join(languageDir, fileName);
    //                 if (fs.existsSync(filePath)) {
    //                     const data = fs.readFileSync(filePath, { encoding: 'utf-8' });
    //                     arrayOfObjects2 = Object.entries(JSON.parse(data)).map(([key, value]) => ({ type: key, translate: value }));
    //                 }
    //                 const mergedArray = arrayOfObjects1.map(obj1 => {
    //                     const matchingObj = arrayOfObjects2.find(obj2 => obj1.type === obj2.type);
    //                     return { ...obj1, translate: matchingObj ? matchingObj.translate : null };
    //                 });
    //                 return mergedArray;
    //             }
    //             return arrayOfObjects1;
    //         }
    //         return [];        
    //     } catch (error) {
    //         return [];
    //     }
    // }
    async readLanguageFile(
        fileName: string = appConstant.TRANSLATIONS_FILE,
    ) {
        try {
            let dataFileRead;
            dataFileRead = this.cacheService.getCache(`Locale/${fileName}`);
            if(!dataFileRead){
                dataFileRead = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file'}, {path: `Locale/${fileName}`, userBucket: fileName.includes('dynamic') ? 'private' : 'public' }));
                if(dataFileRead){
                    dataFileRead = Buffer.from(dataFileRead.Body, 'base64').toString('utf-8');
                    this.cacheService.setCache(`Locale/${fileName}`, JSON.stringify(JSON.parse(dataFileRead)), 60000);
                }
                dataFileRead = JSON.parse(dataFileRead);
            }
            return dataFileRead;
        } catch (error) {
            console.error('Error reading file:', error);
            throw new Error('Error reading file.');
        }
    }
    async readTranslation(
        language: string,
        fileName: string = appConstant.TRANSLATIONS_FILE,
        defaultValue: boolean = false
    ) {
        try {
            let languageData = await this.readLanguageFile("languages.json");
            let lang = languageData.find(ele => ele.key === language || ele.name === language);
            language = lang ? lang?.localeFallback : language;
            let langPath = lang ? lang?.lang_path : language;
            let arrayOfObjects1 = [];
            let arrayOfObjects2 = [];
            let dataFileRead;
            dataFileRead = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file'}, {path: `Locale/eng${fileName}`, userBucket: fileName.includes('static') ? 'public' : 'private'}));
            if(dataFileRead){
                dataFileRead = Buffer.from(dataFileRead.Body, 'base64').toString('utf-8');
            }
            
            if (dataFileRead) {
                dataFileRead = (typeof dataFileRead == 'string') ? JSON.parse(dataFileRead) : dataFileRead;
                    arrayOfObjects1 = Object.entries(dataFileRead).map(([key, value]) => ({ type: key, english: value, translate: value }));
                    if(arrayOfObjects1 && arrayOfObjects1.length){
                        let dataFileReadIn = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file'}, {path: `Locale/${langPath}${fileName}`, userBucket: fileName.includes('static') ? 'public' : 'private'}))
                        if(dataFileReadIn){
                            dataFileReadIn = Buffer.from(dataFileReadIn.Body, 'base64').toString('utf-8');
                        }
                        if (dataFileReadIn) {
                            dataFileReadIn = (typeof dataFileReadIn == 'string') ? JSON.parse(dataFileReadIn) : dataFileReadIn;
                            arrayOfObjects2 = Object.entries(dataFileReadIn).map(([key, value]) => ({ type: key, translate: value }));
                        }
                        const mergedArray = arrayOfObjects1.map(obj1 => {
                            const matchingObj = arrayOfObjects2.find(obj2 => obj1.type === obj2.type);
                            if(matchingObj){
                                obj1 = {...obj1, ...matchingObj}
                            }
                            else{
                                if(defaultValue){
                                    obj1['translate'] = '';
                                }
                            }
                            return obj1;
                        });
                        return mergedArray;
                    }
                    return arrayOfObjects1;
            }
            return []        
        } catch (error) {
            return [];
        }
    }
    async frontendReadTranslation(
        language: string = 'eng',
        text: string,
        path: string = `/LC_MESSAGES/Common/Common`,
        filename: string = 'static'
    ) {
        try{
            if(!path || path == ''){
                path = `/LC_MESSAGES/Common/Common`
            }
            let customname;
            filename = filename == '' ? 'static' : filename;
            language = language == '' ? 'eng' : language;
            let filePath = `${path}/${filename}.json`;
            let translation = await this.readTranslation(language, `${filePath}`);
            if(translation && translation.length){
                customname = translation?.find((element) => element.type == text);
                if(customname?.translate){
                    customname = customname?.translate;
                }else if(customname?.english){
                    customname = customname?.english;
                }else{
                    customname = text;
                }
            }
            else{
                customname = text;
            }
            return customname;
        }catch(err){
            throw new Error(err.message);
        }
    }
    getTodayDate(date = null, format= null ) {
        try{
            let formatDate;
            if(date){
                if(format){
                    formatDate = moment(date, format);
                }else{
                    formatDate = moment(date);
                }
            }
            else{
                formatDate = moment();
            }
            return  formatDate;
        }catch(err){
            throw new Error(err.message);
        }
    }
    getDatesInRange(startDate, endDate, format = "MM-DD-YYYY") {
        const dates = [];
        let currentDate = moment(startDate, "MM-DD-YYYY");
        const end = moment(endDate, "MM-DD-YYYY");
        while (currentDate.isSameOrBefore(end, "day")) {
            dates.push(currentDate.format(format));
            currentDate.add(1, "day");
        }
        return dates;
    }

    getWeekMonthYearNo(date: any, frequency:any = null) {
        try{
            let finalWeekNo:any = '';
            if (frequency === 'W') {
                let nDcstart = moment(date,'DD-MM-YYYY').format('YYYY-MM-DD');
                let weekNo = moment(nDcstart).isoWeek();
                let year = moment(nDcstart).isoWeekYear();
                finalWeekNo = year + '' + weekNo;
            } else if (frequency === 'M') {
                let nDcstart = moment(date,'DD-MM-YYYY').format('YYYY-MM-DD');
                let monthNo = moment(nDcstart).month() + 1;
                let year = moment(nDcstart).year();
                finalWeekNo = monthNo + '' + year;
            }else{
                let nDcstart = moment(date,'DD-MM-YYYY').format('YYYY-MM-DD');
                let year = moment(nDcstart).year();
                finalWeekNo = year;
            }
            return finalWeekNo;
        }catch(err){
            throw new Error(err.message);
        }
    }
    DateTimeFormat(date: any = undefined, format: any = undefined, dateFormat: any = undefined , timezone: any = undefined,assignDateTimezone: any = null) {
        try{
            let formatDate;
            if(date != 'Invalid date 00:00:00' && date != '0000-00-00 00:00:00' && date != '' && date != null && date != 'Invalid date' && date !== undefined && date != ' 23:59:59' && date != '23:59:59' && date != ' 00:00:00'){
                date = (date == 'now') ? undefined : date ;
                format = (format != '')  ? format : undefined;
                dateFormat = (dateFormat != '')  ? dateFormat : undefined;
                timezone = (timezone != '')  ? timezone : undefined;
                if (timezone?.trim() !== undefined || timezone?.trim() !== "") {
                    if (timezone == "Pacific Standard Time (PST)") {
                        timezone = "America/Los_Angeles";
                    }
                    if (timezone == "Mountain Standard Time (MST)") {
                        timezone = "America/Denver";
                    }
                    if (timezone == "Central Standard Time (CST)") {
                        timezone = "America/Chicago";
                    }
                    if (timezone == "Eastern Standard Time (EST)") {
                        timezone = "America/New_York";
                    }
                }
                if(format == 'timestamp'){
                    formatDate = moment.utc(date, dateFormat).unix();
                }else if(format == 'timeformat'){
                    formatDate = moment.utc(date).format(dateFormat);
                }else if(format == 'assignTimezone'){
                    formatDate = moment.tz(date,timezone);
                }else if(format == 'tstodate'){
                    formatDate = moment.unix(date).utc().format(dateFormat);
                }else if(format == 'utcAndTz'){
                    formatDate = moment(date).utc().tz(timezone)
                }else if (format == 'utcInputToTz') {
                    formatDate = moment.tz(date, dateFormat || undefined, 'UTC').tz(timezone);
                }else if (format == 'utcTimeFormat') {
                    formatDate = moment.utc(date).format(dateFormat);
                }else{
                    if(timezone !== undefined){
                        if(format === undefined){
                            if (assignDateTimezone != null) {
                                formatDate = moment.utc(date,dateFormat);
                            } else {
                                if(dateFormat !== undefined){
                                    formatDate = moment(date, dateFormat).tz(timezone);
                                }else{
                                    formatDate = moment.tz(date,timezone);
                                }
                            }
                        }else{
                            if (assignDateTimezone != null) {
                                formatDate = moment.utc(date,dateFormat).format(format);
                            } else {
                                if(dateFormat !== undefined){
                                    formatDate = moment(date, dateFormat).tz(timezone).format(format);
                                }else{
                                    formatDate = moment.tz(date,timezone).format(format);
                                    //let localDate = moment.utc(date);
                                    //formatDate = localDate.clone().tz(timezone).format(format);
                                }
                            }
                        }
                    }else{
                        if(format === undefined){
                            formatDate = moment(date);
                        }else{
                            if (assignDateTimezone != null) {
                                formatDate = moment.utc(date,dateFormat).format(format);
                            } else {
                                if(dateFormat !== undefined){
                                    formatDate = moment(date, dateFormat).format(format);
                                }else{
                                    formatDate = moment(date).format(format);
                                }
                            }
                        }
                    }
                }
            }else{
                formatDate = '';
            }
            return formatDate;
        }catch(err){
            throw new Error(err.message);
        }
    }
    getStartAndEndOfMonth(date = null , format= null) {
        try{
            let currentDate = date ? moment(date) : moment();
            let startOfMonth = currentDate.startOf('month').format('YYYY-MM-DD');
            let endOfMonth = currentDate.endOf('month').format('YYYY-MM-DD');
            if(format){
                startOfMonth = currentDate.startOf('month').format(format);
                endOfMonth = currentDate.endOf('month').format(format);
            }
            return {
                startOfMonth: startOfMonth,
                endOfMonth: endOfMonth
            };
        }catch(err){
            throw new Error(err.message);
        }
    }
  
    formatTime(milliseconds) {
        try{
            const hours = Math.floor(milliseconds / 3600000);
            const minutes = Math.floor((milliseconds % 3600000) / 60000);
            const seconds = Math.floor((milliseconds % 60000) / 1000);
            const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            return formattedTime;
        }catch(err){
            throw new Error(err.message);
        }
    }
    calculateUserAge(userDOB) {
        try{
            const dob: any = new Date(userDOB);
            const currentTime: any = new Date();
            const diffInMilliseconds = Math.abs(currentTime - dob);
            const millisecondsInYear = 60 * 60 * 24 * 365 * 1000;
            return Math.floor(diffInMilliseconds / millisecondsInYear);
        }catch(err){
            throw new Error(err.message);
        }
    }

    getISOWeek(date) {
        try{
            let dt = new Date(date);
            dt.setHours(0, 0, 0, 0);
            dt.setDate(dt.getDate() + 3 - (dt.getDay() + 6) % 7);
            let yearStart = new Date(dt.getFullYear(), 0, 1);
            return Math.ceil((((dt.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        }catch(err){
            throw new Error(err.message);
        }
    }

    hour_minutes(hour, minutes) {
        try{
            let min = minutes / 60;
            let min_hour = Math.floor(min);
            let min_min = (min - Math.floor(min)) * 60;
            let result = { hour: hour + min_hour, min: Math.round(min_min)};
            return result;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async convertMinutesToHoursAndMinutes(minutes, type = 'array', hourTrans = 'Hr', minuteTrans = 'Min') {
        try{
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            let result:any = { hour: hours, min: Math.round(remainingMinutes)};
            if(type == 'string'){
                result = `${hours} ${hourTrans} ${Math.round(remainingMinutes)} ${minuteTrans}`;
            }
            return result;
        }catch(err){
            throw new Error(err.message);
        }
    }

    convertToUTC(dateTime: Date, sourceTimezone: string, destinationTimezone: string): string {
        try{
            const momentObj = moment.tz(dateTime, sourceTimezone);
            return momentObj.tz(destinationTimezone).format();
        }catch(err){
            throw new Error(err.message);
        }
    }
    getWeekRanges(startDateStr: string, endDateStr: string) {
        try{
            const startDate = new Date(startDateStr);
            const endDate = new Date(endDateStr);
            if (startDate > endDate) {
                throw new Error("Start date must be before end date");
            }
            const weekRanges = [];
            let currentStart = new Date(startDate);
            let weekNumber = 1;
            while (currentStart <= endDate) {
                const currentEnd = new Date(currentStart);
                currentEnd.setDate(currentStart.getDate() + 6);
                if (currentEnd > endDate) {
                    currentEnd.setTime(endDate.getTime());
                }
                weekRanges.push({
                    week_number: weekNumber,
                    week_start: currentStart.toISOString().split('T')[0],
                    week_end: currentEnd.toISOString().split('T')[0]
                });
                currentStart.setDate(currentStart.getDate() + 7);
                weekNumber++;
            }
            return weekRanges;
        }catch(err){
            throw new Error(err.message);
        }
    }

    async checkDateFormats(excelSerialDate: number | string) {
        try{
            const pattern = /^(?:(?:(?:0[13578]|1[02])(\/|-|\.| ?)31)\1|(?:(?:0[1,3-9]|1[0-2])(\/|-|\.| ?)(?:29|30)\2))(?:(?:1[6-9]|[2-9]\d)\d{2})$|^(?:02(\/|-|\.| ?)29\3(?:(?:(?:1[6-9]|[2-9]\d)(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:(?:0[1-9])|(?:1[0-2]))(\/|-|\.| ?)(?:0[1-9]|1\d|2[0-8])\4(?:(?:1[6-9]|[2-9]\d)\d{2})$/;
            if (typeof excelSerialDate === 'number') {
                const timestamp = Math.round((excelSerialDate - 25569) * 86400);
                return moment.unix(timestamp).format("YYYY-MM-DD");
            }
            if (pattern.test(excelSerialDate.toString())) {
                excelSerialDate.replace(/\//g, "-");
                return moment(excelSerialDate, 'MM-DD-YYYY').format('YYYY-MM-DD');
            }
            return "Invalid Date";
        }catch(err){
            throw new Error(err.message);
        }
    }
    async numOfDays(start_date: any, end_date: any) {
        try{
            const startDate = moment(start_date, 'YYYY-MM-DD HH:mm:ss');
            const endDate = moment(end_date, 'YYYY-MM-DD HH:mm:ss');
            const daysDifference = endDate.diff(startDate, 'days') + 1; // +1 to include the end date
            return daysDifference;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async numOfYears(start_date: any, end_date: any) {
        try{
            const startDate: any = new Date(start_date);
            const endDate: any = new Date(end_date);
            const totalMilliseconds = endDate - startDate;
            const totalDays = totalMilliseconds / (1000 * 60 * 60 * 24);
            /* Accurate: calculate how many years based on actual leap years*/
            /*Count leap years between the two dates*/
            let year = startDate.getFullYear();
            let leapYears = 0;
            const endYear = endDate.getFullYear();
            for (let i = year; i <= endYear; i++) {
                if ((i % 4 === 0 && i % 100 !== 0) || (i % 400 === 0)) {
                    leapYears++;
                }
            }
            /*Total days in those years*/
            const totalActualDays = (endYear - year + 1 - leapYears) * 365 + (leapYears * 366);
            const avgDaysInYear = totalActualDays / (endYear - year + 1);
            const accurateYearDiff = Math.floor(totalDays / avgDaysInYear);
            return accurateYearDiff;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async getDaysInMonth(yearMonthStr) {
        const [year, month] = yearMonthStr.split('-').map(Number);
        return new Date(year, month, 0).getDate();
    }
    async getWeeksInRangeold(start_date: any, end_date: any, type : string = 'normal') {
        try{
            const startDate = moment(start_date, 'YYYY-MM-DD HH:mm:ss');
            const endDate = moment(end_date, 'YYYY-MM-DD HH:mm:ss');
            const weeks = {};
            let weekCount = 1;
            let currentStart = startDate.clone();
            const endOfRange = endDate.clone();
            while (currentStart.isBefore(endOfRange)) {
                // Add 6 days to calculate the week end (without time part for non-final weeks)
                let weekEnd = currentStart.clone().add(6, 'days').endOf('day');
                if (weekEnd.isAfter(endDate)) {
                    weekEnd = endDate.clone();
                }
                // Store the week's start date (with time) and end date (without time for non-final weeks)
                weeks[`week_${weekCount}`] = [
                    currentStart.format('YYYY-MM-DD HH:mm:ss'), // start_date with time
                    weekEnd.isSame(endDate) ? weekEnd.format('YYYY-MM-DD HH:mm:ss') : weekEnd.format('YYYY-MM-DD') // end_date
                ];
                // Move to the next week (starting at 06:00:00 of the next day)
                currentStart = weekEnd.clone().add(1, 'day').set({
                    hour: 6,
                    minute: 0,
                    second: 0
                });
                weekCount++;
            }
            const currentWeek = await this.getCurrentWeek(weeks, moment().format('YYYY-MM-DD HH:mm:ss'));
            return { weeks, currentWeek };
        }catch(err){
            throw new Error(err.message);
        }
    }
    async getWeeksInRange(start_date: any, end_date: any, type : string = 'normal') {
        try{
            const startDate = moment(start_date, 'YYYY-MM-DD HH:mm:ss');
            const endDate = moment(end_date, 'YYYY-MM-DD HH:mm:ss');
            const weeks = {};
            let weekCount = 1;
            let currentStart = startDate.clone();
            const endOfRange = endDate.clone();
            while (currentStart.isBefore(endOfRange)) {
                let weekEnd = currentStart.clone().add(6, 'days').endOf('day');
                if (weekEnd.isAfter(endDate)) {
                    weekEnd = endDate.clone();
                }
                if(type == 'normal'){
                    weeks[`week${weekCount}`] = {
                        start_date: currentStart.format('YYYY-MM-DD HH:mm:ss'),
                        end_date: weekEnd.format('YYYY-MM-DD HH:mm:ss')
                    };
                }else{
                    if(weekCount == 1){
                        weeks[`week_${weekCount}`] = [
                            currentStart.format('YYYY-MM-DD HH:mm:ss'),
                            weekEnd.format('YYYY-MM-DD')
                        ];
                    }else{
                        weeks[`week_${weekCount}`] = [
                            currentStart.format('YYYY-MM-DD'),
                            weekEnd.isSame(endDate) ? weekEnd.format('YYYY-MM-DD HH:mm:ss') : weekEnd.format('YYYY-MM-DD')
                        ];
                    }
                }
                currentStart = weekEnd.clone().add(1, 'day').startOf('day');
                weekCount++;
            }
            if(type == 'normal'){
                if (!weeks[`week${weekCount - 1}`].end_date.endsWith('23:59:59')) {
                    weeks[`week${weekCount -1}`] = {
                        start_date: endDate.clone().startOf('day').format('YYYY-MM-DD HH:mm:ss'),
                        end_date: endDate.clone().endOf('day').format('YYYY-MM-DD HH:mm:ss')
                    };
                }
            }
            const currentWeek = await this.getCurrentWeek(weeks, moment().format('YYYY-MM-DD HH:mm:ss'));
            return { weeks, currentWeek };
        }catch(err){
            throw new Error(err.message);
        }
    }
    async getCurrentWeek(weeksArray, today) {
        try{
            const todayDate = moment(today, 'YYYY-MM-DD HH:mm:ss');
            for (const weekKey in weeksArray) {
                const { start_date, end_date } = weeksArray[weekKey];
                const start = moment(start_date, 'YYYY-MM-DD HH:mm:ss');
                const end = moment(end_date, 'YYYY-MM-DD HH:mm:ss');
                if (todayDate.isBetween(start, end, null, '[]')) {
                    return weekKey;
                }
            }
            return null;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async getMonthsInRange(start_date: any, end_date: any) {
        try{
            const startDate = moment(start_date, 'YYYY-MM-DD HH:mm:ss');
            const endDate = moment(end_date, 'YYYY-MM-DD HH:mm:ss');
            const months = {};
            const monthNumbers = [];
            let currentMonth = startDate.clone().startOf('month');
            const endOfRange = endDate.clone().endOf('month');
            while (currentMonth.isBefore(endOfRange)) {
                let monthEnd = currentMonth.clone().endOf('month');
                if (monthEnd.isAfter(endDate)) {
                    monthEnd = endDate.clone().endOf('day');
                }
                months[`month${currentMonth.format('MM')}`] = {
                    start_date: currentMonth.format('YYYY-MM-DD HH:mm:ss'),
                    end_date: monthEnd.format('YYYY-MM-DD HH:mm:ss')
                };
                monthNumbers.push(currentMonth.format('MM'));
                currentMonth.add(1, 'month');
            }
            const currentMonths = await this.getCurrentMonth(months, moment().format('YYYY-MM-DD HH:mm:ss'));
            return {
            months,
            currentMonths,
            monthNumbers
            };
        }catch(err){
            throw new Error(err.message);
        }
    }
    async getCurrentMonth(months, today) {
        try{
            const todayDate = moment(today, 'YYYY-MM-DD HH:mm:ss');
            for (const monthKey in months) {
                const { start_date, end_date } = months[monthKey];
                const start = moment(start_date, 'YYYY-MM-DD HH:mm:ss');
                const end = moment(end_date, 'YYYY-MM-DD HH:mm:ss');
                if (todayDate.isBetween(start, end, null, '[]')) {
                    return monthKey;
                }
            }
            return null;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async basedOnPlanDate(data, insurancePlanName, userGender, bDay) {
        try{
            data['mb'].forEach((value, key) => {
                if (!value['mab']) {
                    data['mb'][key]['ma'] = [];
                } else {
                    data['mb'][key]['ma'] = value['ma'].filter(ndata => {
                        let validHealthPlan: boolean = ndata['healthplan'] === 0 || (ndata.healthplan_name.toLowerCase() && insurancePlanName.toLowerCase().includes(ndata.healthplan_name.toLowerCase()));
                        let validGender: boolean = ndata['gender'] === 0 || userGender === ndata['gender'];
                        let validAge: boolean = ndata['age'] == 0;
                        let validRange: boolean = false;
                        switch (ndata.ageoption) {
                            case 0:
                                validRange = ndata.age_s_range == bDay;
                                break;
                            case 1:
                                validRange = bDay > ndata.age_s_range;
                                break;
                            case 2:
                                validRange = bDay >= ndata.age_s_range;
                                break;
                            case 3:
                                validRange = bDay < ndata.age_s_range;
                                break;
                            case 4:
                                validRange = bDay <= ndata.age_s_range;
                                break;
                            case 5:
                                validRange = bDay >= ndata.age_s_range && bDay <= ndata.age_e_range;
                                break;
                        }
                        return ndata['maa'] && validHealthPlan && validGender && (validAge || validRange);
                    });
                }
            });
            if(data.map.based_on === 0 || [2,3].includes(data.map.based_on) || (data.map.based_on === 1 && !data.map.startdate)) {
                data['start_date'] = `${await this.DateTimeFormat(new Date(data.jup.created), 'YYYY-MM-DD','','',1)} 00:00:00`;
            }
            if(data.map.based_on === 0 || ([1,2].includes(data.map.based_on) && !data.map.enddate)) {
                let totalDays = 0;
                for (let i = 0; i < data['mb'].length; i++) {
                    if (data['mb'][i]['ma']) {
                        totalDays += data['mb'][i]['ma'].reduce((total, activity) => total + activity.days, 0);
                    }
                }
                let startDate = new Date(data['start_date']);
                startDate.setDate(startDate.getDate() + ((totalDays > 0) ? totalDays - 1 : 0));
                data['end_date'] = `${await this.DateTimeFormat(new Date(startDate), 'YYYY-MM-DD','','',1)} 23:59:59`;
            }
            if(data.map.based_on === 1 && data.map.startdate) {
                data['start_date'] = await this.DateTimeFormat(new Date(data.map.startdate), 'YYYY-MM-DD HH:mm:ss','','',1);
            }
            if((data.map.based_on === 1 || data.map.based_on ===2) && data.map.enddate){
                data.end_date = `${await this.DateTimeFormat(new Date(data.map.enddate), 'YYYY-MM-DD','','',1)} 23:59:59`;
            }
            if (data.map.based_on === 3) {
                let fRange = data.map.f_range ||  1;
                let totalactivity = 0;
                data['mb'].forEach((item) => {
                    if (item['ma']) {
                        totalactivity += item['ma'].length;
                    }
                });
                let totalDays: number = Math.ceil(totalactivity / fRange);
                let startDate: any = await this.DateTimeFormat(data['start_date'], 'timestamp','YYYY-MM-DD HH:mm:ss');
                switch (data['map']['frequency_base']) {
                    case 0:
                        startDate = ((startDate * 1000) + (totalDays - 1) * 24 * 60 * 60 * 1000) / 1000;
                        break;
                    case 1:
                        startDate = ((startDate * 1000) + (totalDays * 7 - 1) * 24 * 60 * 60 * 1000) / 1000;
                        break;
                    case 2:
                        startDate = new Date(startDate * 1000);
                        startDate.setMonth(startDate.getMonth() + totalDays);
                        startDate = await this.DateTimeFormat(startDate, 'timestamp');
                        startDate = ((startDate * 1000) - 24 * 60 * 60 * 1000) / 1000;
                        break;
                    case 3:
                        startDate = new Date(startDate * 1000);
                        startDate.setMonth(startDate.getMonth() + (totalDays * 4));
                        startDate = await this.DateTimeFormat(startDate, 'timestamp');
                        startDate = ((startDate * 1000) - 24 * 60 * 60 * 1000) / 1000;
                        break;
                    case 4:
                        startDate = new Date(startDate * 1000);
                        startDate.setFullYear(startDate.getFullYear() + totalDays);
                        startDate = await this.DateTimeFormat(startDate, 'timestamp');
                        startDate = ((startDate * 1000) - 24 * 60 * 60 * 1000) / 1000;
                        break;
                }
                data['end_date'] = `${await this.DateTimeFormat(startDate,'tstodate','YYYY-MM-DD')} 23:59:59`;
            }
            return data;
        }catch(err){
            throw new Error(err.message);
        }
    }

    async countActDataEvent(activityDone, actStartDate, actEndDate,assignActivity = {}) {
        try{
            let date: any = '',totalStep = 0;
            for (let i = 0; i < activityDone.length; i++) {
                const value = activityDone[i];
                let valueDate = await this.DateTimeFormat(value.log_date_tmp,'timestamp','YYYY-MM-DD');
                if ((!date || assignActivity['grater_than'] > 0) && actStartDate <= valueDate && valueDate <= actEndDate) {
                    if (assignActivity['type'] === 0 || (assignActivity['type'] === 1 && value.ev_attend_status === 1)) {
                        totalStep++;
                        date = await this.DateTimeFormat(value.log_date_tmp, 'MM-DD-YYYY', 'YYYY-MM-DD');
                    }
                }
            }
            let result = {
                total_account: totalStep,
                date: date
            };
            return result;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async countActDataStep(activityDone, actStartDate, actEndDate, field, table, assignActivity = {}) {
        try{
            let date: any = '',totalStep: number = 0;
            let step_increment: number = assignActivity['f_type'] === 2 ? 1 : 0;
            let assignType = assignActivity['type'];
            let s_range = assignActivity['s_range'];
            let e_range = assignActivity['e_range'];
            activityDone = Array.isArray(activityDone) || activityDone === null ? activityDone : [activityDone];
            for (let i: number = 0; i < activityDone.length && !date; i++) {
                let value = activityDone[i];
                let valueDate = await this.DateTimeFormat(value['log_date_tmp'],'timestamp','YYYY-MM-DD');
                if (actStartDate <= valueDate && valueDate <= actEndDate) {
                    totalStep += field === 'waters' ? value[field] : (step_increment || value[field]);
                    if ((assignType === 0 && totalStep >= s_range && totalStep <= e_range) ||
                        (assignType === 1 && totalStep < s_range) ||
                        (assignType === 2 && totalStep > s_range)) {
                        date = await this.DateTimeFormat(value.log_date_tmp, 'MM-DD-YYYY','YYYY-MM-DD');
                        break;
                    }
                }
            }
            let result = {
                total_account: totalStep,
                date: date
            };
            return result;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async countActDataStepFrequency(activityDone, actStartDate, actEndDate, field = null, table = null, AssignActivity = [], totalDays) {
        try{
            let date = '',totalStep: any = {},monthTotalStep: any = {};
            let currentDate, monthTmp;
            for(let i = 0; i < activityDone.length; i++) {
                let value = activityDone[i];
                currentDate = await this.DateTimeFormat(value['log_date_tmp'],'timestamp','YYYY-MM-DD');
                if(actStartDate <= currentDate && currentDate <= actEndDate) {
                    monthTmp = await this.DateTimeFormat(currentDate,'tstodate','YYYY-MM');
                    if(AssignActivity['maa']['is_month'] === 2){
                        monthTmp = await this.DateTimeFormat(currentDate,'tstodate','YYYYWW');
                    } else if(AssignActivity['maa']['is_month'] === 3){
                        monthTmp = await this.DateTimeFormat(currentDate,'tstodate','YYYY-MM-DD');
                    }
                    if(totalStep.hasOwnProperty(value['log_date_tmp'])) {
                        totalStep[value['log_date_tmp']] += (AssignActivity['f_range'] === 2) ? 1 : value[field];
                    } else {
                        totalStep[value['log_date_tmp']] = (AssignActivity['f_range'] === 2) ? 1 : value[field];
                    }
                    date = value['log_date_tmp'];
                    if(AssignActivity['f_range'] > 0 && totalStep[value['log_date_tmp']] >= AssignActivity['f_range'] && !monthTotalStep.hasOwnProperty([monthTmp][value['log_date_tmp']])) {
                        if (!monthTotalStep.hasOwnProperty(monthTmp)) {
                            monthTotalStep[monthTmp] = {};
                        }
                        monthTotalStep[monthTmp][value['log_date_tmp']] = totalStep[value['log_date_tmp']];
                    }
                }
            }
            if(AssignActivity['maa']['is_month'] == 1) {
                for(let mkey in monthTotalStep) {
                    let mvalue = monthTotalStep[mkey] || [];
                    let days = await this.getDaysInMonth(mkey)
                    if(days == Object.keys(mvalue).length) {
                        totalStep = new Array(totalDays + 1).fill(AssignActivity['f_range']);
                        break;
                    }
                }
            } else if(AssignActivity['maa']['is_month'] == 2) {
                for(let mkey in monthTotalStep) {
                    let mvalue = monthTotalStep[mkey];
                    if(Object.keys(mvalue).length === 7) {
                        totalStep = Array(totalDays+1).fill(AssignActivity['f_range']);
                        break;
                    }
                }
            } else if(AssignActivity['maa']['is_month'] == 3){
                let status = await this.hasConsecutiveDates(monthTotalStep, AssignActivity['maa']['is_month_days'])
                if ((Object.keys(monthTotalStep).length > 0 && AssignActivity['maa']['is_month_days'] < 2) || status) {
                    totalStep = Array(totalDays+1).fill(AssignActivity['f_range']);
                }
            }
            let result = {};
            result['total_account'] = Object.keys(totalStep).length;
            result['date'] = (totalDays >= Object.keys(totalStep).length) ? date : '';
            return result;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async hasConsecutiveDates(monthTotalStep,isMonthOption) {
        try{
            let dates = Object.keys(monthTotalStep);
            let timestamps = dates.map(date => this.DateTimeFormat(date,'timestamp','YYYY-MM-DD'));
            let consecutive = []
            for (let i = 0; i < timestamps.length - (isMonthOption-1); i++) {
                if(timestamps.length === isMonthOption){
                    consecutive = timestamps;
                }else{
                    consecutive = timestamps.slice(i, i + isMonthOption);
                }
                let diff = consecutive.map((value, index) => {
                    if (index < consecutive.length - 1) {
                        return consecutive[index + 1] - value;
                    }
                });
                diff.pop();
                if (Math.max(...diff) === 86400) {
                    return true;
                }
            }
            return false;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async calculateTotalTimeinArray(timeArray: any = []) {
        try{
            let totalDuration = moment.duration(); // Start with a zero duration
            timeArray.forEach(item => {
                const duration = moment.duration(item); // Parse each duration string
                totalDuration.add(duration); // Add each duration to the total
            });
            const totalHours = Math.floor(totalDuration.asHours());
            const totalMinutes = totalDuration.minutes();
            const totalSeconds = totalDuration.seconds();
            return totalHours.toString().padStart(2, '0')+':'+totalMinutes.toString().padStart(2, '0')+':'+totalSeconds.toString().padStart(2, '0');
        }catch(err){
            throw new Error(err.message);
        }
    }
    async commonActivityFunction(userTimeZone,myActivity,myPlan,tempLinks,req,interLinksData) {
        try{
            let result: any = {'categoryStatus': 0,'startMarkComplete': 0,'endMarkComplete': 0,'activityButtonText': null,'uploadText': null}
            let categoryId: number = Number(myActivity['ac']['category_id']) || 0;
            let ActivityId: number = Number(myActivity['ac']['id']) || 0;
            result['buttonStatus'] = null;
            result['activityName'] = myActivity['maa']['name'] || myActivity['ac']['activity_name'];
            if(result['activityName']){
                let customName = await this.frontendReadTranslation(req.lang,`activity_name_${myActivity['assign_block_id']}_${myActivity['maa']['id']}_${req?.tokenUser?.org_id}`,`/LC_MESSAGES/MyPlan/MyPlan/${req?.tokenUser?.org_id}/${myPlan['map']['id']}`,`dynamic`);
                result['activityName'] = (customName == '' || customName == `activity_name_${myActivity['assign_block_id']}_${myActivity['maa']['id']}_${req?.tokenUser?.org_id}`) ? result['activityName'] : customName;
            }
            result['description'] = myActivity['description'];
            result['buttonText'] = myActivity['button_text'];
            result['internalLink'] = '';
            result['mca'] = {
                'notes': myActivity['mca']?.['notes'] || null,
                'image': myActivity['mca']?.['image'] ? `${S3_URL}${myActivity['mca']?.['image']}` : null,
                'status': myActivity['mca']?.['status'] || null,
                'user_id': myActivity['mca']?.['user_id'] || null,
                'custom_id': myActivity['mca']?.['custom_id'] || null,
            }
            userTimeZone = await this.DateTimeFormat(userTimeZone,'timestamp','YYYY-MM-DD HH:mm:ss');
            let activityStartDate = await this.DateTimeFormat(myActivity['start_date'],'timestamp','YYYY-MM-DD HH:mm:ss');
            let activityEndDate = await this.DateTimeFormat(myActivity['end_date'],'timestamp','YYYY-MM-DD HH:mm:ss');
            if((userTimeZone <= activityEndDate) && (userTimeZone >= activityStartDate) || myPlan['map']['based_on'] == 3){
                let displayButtonData = true;
                if ([2].includes(categoryId) && [6,10].includes(ActivityId)) {
                    if (myActivity['ac']['id'] == '10') {
                        result['activityDescription'] = `${await this.frontendReadTranslation(req?.headers?.x_lang,'Log your water', `/LC_MESSAGES/MyPlan/MyPlan`,`static`)}`;
                    }
                    if (myActivity['ac']['id'] == '6') {
                        result['activityDescription'] = `${await this.frontendReadTranslation(req?.headers?.x_lang,'Log your food', `/LC_MESSAGES/MyPlan/MyPlan`,`static`)}`;
                    }
                }
                if ([21,36,40,43,8].includes(categoryId)) {
                    let categoryTab = {21:1,36:2,40:3,43:4,8:5}
                    result['categoryStatus'] = categoryTab[categoryId]
                    displayButtonData = false;
                } else if ([5905,4887,6,10].includes(ActivityId)) {
                    let activityTab: any = {5905:6,4887:7}
                    if ([2, 3].includes(categoryId)) {
                        activityTab = {10:11,6:12}
                        result['categoryStatus'] = activityTab[ActivityId];
                    } else if ([4887].includes(ActivityId)) {
                        displayButtonData = false;
                    }
                    result['categoryStatus'] = activityTab[ActivityId];
                } else if (categoryId === 10 && [1, 58].includes(ActivityId)) {
                    result['categoryStatus'] = 8;
                    displayButtonData = false;
                } else if ((categoryId === 10 && ActivityId === 2) || (categoryId === 9 && ActivityId === 3) || (categoryId === 1 && [4,5].includes(ActivityId))) {
                    result['categoryStatus'] = 9
                    displayButtonData = false;
                } else if ([2, 4, 5].includes(categoryId) && [7, 9, 11, 15, 16, 17, 18, 24].includes(ActivityId)) {
                    result['categoryStatus'] = 10;
                } else if (categoryId === 9 && ActivityId === 7717) {
                    result['categoryStatus'] = 13;
                    result['customCompletion'] = 1;
                    if (myActivity['add_image'] === 0) {
                        result['uploadText'] = `<p><b>${await this.frontendReadTranslation(req?.headers?.x_lang,'Please submit a screenshot for this activity to be marked as complete', `/LC_MESSAGES/MyPlan/MyPlan`,`static`)}</b></p>`;
                        if (myActivity['upload_text']) {
                            let customName = await this.frontendReadTranslation(req?.headers?.x_lang,`upload_text_${myActivity['assign_block_id']}_${myActivity['maa']?.['id']}_${req?.tokenUser?.org_id}`, `/LC_MESSAGES/MyPlan/MyPlan/${req?.tokenUser?.org_id}/${myPlan['id']}`,`dynamic`);
                            myActivity['button_text'] = `<p><b>${(customName == '' || customName == `upload_text_${myActivity['assign_block_id']}_${myActivity['maa']?.['id']}_${req?.tokenUser?.org_id}`) ? myActivity['button_text'] : customName}</b></p>`;
                        }
                    }
                } else if ([6, -3].includes(categoryId)) {
                    result['categoryStatus'] = 14;
                }else {
                    if(userTimeZone > activityEndDate){
                        result['endMarkComplete'] = 1;
                    }
                    if(userTimeZone < activityStartDate){
                        result['startMarkComplete'] = 1;
                    }
                    result['buttonText'] = `${await this.frontendReadTranslation(req?.headers?.x_lang,'Mark as complete', `/LC_MESSAGES/MyPlan/MyPlan`,`static`)}`;
                    result['categoryStatus'] = 15;
                }
                if (![2,3,4,5,8,10,21,36,40,43,71].includes(categoryId)) {
                    result['buttonStatus'] = 1;
                    if (myActivity['link_type'] == 0) {
                        if (myActivity['link'] != '') {
                            result['internalLink'] = await this.manageAllURL('plan',{'url': myActivity['link']},interLinksData)
                            result['activityButtonText'] = `${await this.frontendReadTranslation(req?.headers?.x_lang,'Link', `/LC_MESSAGES/MyPlan/MyPlan`,`static`)}`
                            if (displayButtonData && myActivity['button_text'] != 'Click here' && myActivity['button_text']) {
                                let customName = await this.frontendReadTranslation(req?.headers?.x_lang,`button_text_${myActivity['assign_block_id']}_${myActivity['maa']?.['id']}_${req?.tokenUser?.org_id}`,`/LC_MESSAGES/MyPlan/MyPlan/${req?.tokenUser?.org_id}/${myPlan['map']['id']}`,`dynamic`);
                                myActivity['button_text'] = (customName == '' || customName == `button_text_${myActivity['assign_block_id']}_${myActivity['maa']?.['id']}_${req?.tokenUser?.org_id}`) ? myActivity['button_text'] : customName;
                                result['activityButtonText'] = myActivity['button_text']
                            }
                        }
                    } else {
                        if (tempLinks && tempLinks[myActivity['link_id']]) {
                            result['internalLike'] = tempLinks[myActivity['link_id']];
                            result['internalLink'] = await this.manageAllURL('plan',{'inLinkId': myActivity['link_id']},tempLinks)
                            result['activityButtonText'] = `${await this.frontendReadTranslation(req?.headers?.x_lang,tempLinks[myActivity['link_id']]['linktitle'], `/LC_MESSAGES/MyPlan/MyPlan`,`static`)}`
                            if (displayButtonData && myActivity['button_text'] != 'Click here' && myActivity['button_text']) {
                                let customName = await this.frontendReadTranslation(req?.headers?.x_lang,`button_text_${myActivity['assign_block_id']}_${myActivity['maa']?.['id']}_${req?.tokenUser?.org_id}`,`/LC_MESSAGES/MyPlan/MyPlan/${req?.tokenUser?.org_id}/${myPlan['map']['id']}`,`dynamic`);
                                myActivity['button_text'] = (customName == '' || customName == `button_text_${myActivity['assign_block_id']}_${myActivity['maa']?.['id']}_${req?.tokenUser?.org_id}`) ? myActivity['button_text'] : customName;
                                result['activityButtonText'] = myActivity['button_text']
                            }
                        }
                    }
                } else {
                    if (myActivity['link_type'] == 0) {
                        if (myActivity['link'] != '') {
                            result['internalLink'] = await this.manageAllURL('plan',{'url': myActivity['link']},interLinksData)
                        }
                    } else {
                        if (tempLinks && tempLinks[myActivity['link_id']]) {
                            result['internalLink'] = await this.manageAllURL('plan',{'inLinkId': myActivity['link_id']},tempLinks)
                        }
                    }
                }
            }
            return result;
        }catch(err){
            throw new Error(err.message);
        }
    }

    timeToMinutes(time) {
        try{
            const [hours, minutes] = time.split(':').map(Number);
            return (hours * 60) + minutes;
        }catch(err){
            throw new Error(err.message);
        }
    }
    minutesToTime(minutes) {
        try{
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            const formattedHours = String(hours).padStart(2, '0');
            const formattedMinutes = String(remainingMinutes).padStart(2, '0');
            return `${formattedHours}:${formattedMinutes}`;
        }catch(err){
            throw new Error(err.message);
        }
    }
    minutesToTimeWithSeconds(minutes) {
        try {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            const formattedHours = String(hours).padStart(2, '0');
            const formattedMinutes = String(remainingMinutes).padStart(2, '0');
            const formattedSeconds = '00';
            return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
        } catch (err) {
            throw new Error(err.message);
        }
    }
    timeToSeconds(time) {
        const parts = time.split(':').map(Number);
        if (parts.length === 1) {
            return parts[0]; // SS
        }
        if (parts.length === 2) {
            const [minutes, seconds] = parts; // MM:SS
            return (minutes * 60) + seconds;
        }
        if (parts.length === 3) {
            const [hours, minutes, seconds] = parts; // HH:MM:SS
            return (hours * 3600) + (minutes * 60) + seconds;
        }
        throw new Error("Invalid time format");
    }
    secondsToTime(seconds: number): string {
        if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
            throw new Error('Invalid seconds value');
        }
        const hrs = Math.floor(seconds / 3600);
        const min = Math.floor((seconds % 3600) / 60);
        const sec = Math.floor(seconds % 60);
        const pad = (n: number) => n.toString().padStart(2, '0');
        if (hrs > 0) {
            return `${hrs}:${pad(min)}:${pad(sec)}`;
        } else {
            return `${min}:${pad(sec)}`;
        }
    }
    convertSecondsToHoursAndMinutesAndSeconds(
        seconds: number,
        format: 'object' | 'string' | 'array',
        labels: { hour?: string; min?: string; sec?: string } = {}
    ): { hour: number; min: number; sec: number } | string {
        const h =
            labels?.hour === 'hr' ?
                'Hr' :
                (labels.hour || 'Hr');
        const m =
            labels?.min === 'min' ?
                'Min' :
                (labels.min || 'Min');
        const s =
            labels?.sec === 'sec' ?
                'Sec' :
                (labels.sec || 'Sec');
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (format === 'object' || format === 'array') {
            return { hour: hours, min: minutes, sec: secs };
        }
        const parts: string[] = [];
        if (hours > 0) parts.push(`${hours} ${h}`);
        if (minutes > 0 || hours > 0) parts.push(`${minutes} ${m}`); // show minutes if hours exist or minutes > 0
        if (secs > 0 || seconds === 0) parts.push(`${secs} ${s}`);   // always show seconds if total is 0
        return parts.join(' ') || `0 ${s}`;
    }
    async convertToHoursAndMinutes(totalMinutes: number,req) {
        try{
            let hours = Math.floor(totalMinutes / 60);  
            let minutes = totalMinutes % 60;          
            return `${hours} ${await this.frontendReadTranslation(req.lang, "Hr")} ${minutes} ${await this.frontendReadTranslation(req.lang, "Min")}`;
        }catch(err){
            throw new Error(err.message);
        }
    }
    isValidDate(dateString: string) {
        try{
            const formats = ['YYYY-MM-DD', 'MM-DD-YYYY', 'MMM DD, YYYY', 'MMMM DD, YYYY', 'MM/DD/YYYY', 'MMM D, YYYY', 'MMMM D, YYYY'];
            return moment(dateString, formats, true).isValid();  
        }catch(err){
            throw new Error(err.message);
        }
    }
    isValidDateActivity(date) {
        try{
            if (date instanceof Date && !isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }
            if (
                typeof date === 'string' &&
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(date)
            ) {
                const parsedDate = new Date(date);
                if (!isNaN(parsedDate.getTime())) {
                    return parsedDate.toISOString().split('T')[0];
                }
            }
            if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
                const parsedDate = new Date(date);
                if (!isNaN(parsedDate.getTime())) {
                    return parsedDate.toISOString().split('T')[0];
                }
            }
            return null;
        }catch (error) {
            throw new Error(error.message); 
        }
    }

    async getTimezoneFromZipcode(zipcode: string, country: string): Promise<string> {
        try{
            let query = '';
            let formattedZip = zipcode.padStart(5, '0'); // Ensure it's at least 5 digits
            if (country === 'United States') {
                query = `
                    SELECT t.timezone_name 
                    FROM c_us_timezones us
                    LEFT JOIN c_timezones t ON t.id = us.zone_id
                    WHERE 
                    (LENGTH(us.zipcode) = 3 AND CONCAT('00', us.zipcode) = ?) OR
                    (LENGTH(us.zipcode) = 4 AND CONCAT('0', us.zipcode) = ?) OR
                    us.zipcode = ?
                    LIMIT 1
                `;
            } else if (country === 'Canada') {
                query = `
                    SELECT t.timezone_name 
                    FROM c_ca_timezones ca
                    LEFT JOIN c_timezones t ON t.id = ca.zone_id
                    WHERE 
                    (LENGTH(ca.postalcode) = 3 AND CONCAT('00', ca.postalcode) = ?) OR
                    (LENGTH(ca.postalcode) = 4 AND CONCAT('0', ca.postalcode) = ?) OR
                    ca.postalcode = ?
                    LIMIT 1
                `;
            } else {
                return 'UTC';
            }
            const result = await this.dataSource.query(query, [formattedZip, formattedZip, formattedZip]);
            return result.length > 0 ? result[0].timezone_name : 'UTC';
        }catch(err){
            throw new Error(err.message);
        }
    }
    async manageAllURL(type:any = 'generate', otherDatas:any = {},linkTitles: any = []) {
        try{
            let inLinkId:any = otherDatas.inLinkId || null;
            let pluginName:any = otherDatas.pluginName || '';
            let controllerName:any = otherDatas.controllerName || '';
            let actionName:any = otherDatas.actionName || '';
            let itemId:any = otherDatas.itemId || '';
            let url:any = otherDatas.url || null;
            let pageEndPoint:any = otherDatas.pageEndPoint || '';
            let path = '';
            if(type == 'replace'){
                const parsedUrl = new URL(url);
                const domain = parsedUrl.hostname;
                const isAllowedDomain = appConstant.DOMAINS.some(allowedDomain => domain.endsWith(allowedDomain));
                const isTargetUrl = url.includes('documentmanagement/documentmanagement/downloads/');
                if(isAllowedDomain && isTargetUrl){
                    path = url.replace('https://' + domain +'/documentmanagement/documentmanagement/downloads/', 'https://' + process.env.DOMAIN + '/download-document/');
                }
            }else if(type == 'g_internal_link' && inLinkId != null){
                const item = linkTitles.find((entry) => entry.id === Number(inLinkId));
                path = (item) ? item.newlink : '';
                if(pageEndPoint == 'activities'){
                    path = (item && (item.newlink != '/activities' && item.newlink != 'activities')) ? item.newlink : '';
                }
            }else if(type == 'g_ac_plugin_link' && pluginName != null){
                const item = linkTitles.find((entry) => entry?.id === Number(itemId));
                path = (item) ? item.newlink : '';
                if(pageEndPoint == 'activities'){
                    path = (item && (item.newlink != '/activities' && item.newlink != 'activities')) ? item.newlink : '';
                }
            }else if(type == 'g_plugin_link' && pluginName != null){
                const item = linkTitles.find((entry) => entry?.plugin?.toLowerCase() === pluginName);
                path = (item) ? item.newlink : '';
                if(pageEndPoint == 'activities'){
                    path = (item && (item.newlink != '/activities' && item.newlink != 'activities')) ? item.newlink : '';
                }
            }else if (type == 'plan') {
                if (inLinkId) {
                    path = `https://${process.env.DOMAIN}/${linkTitles[inLinkId]?.newlink}`;
                } else {
                    if (!/^https?:\/\//.test(url)) {
                        url = `https://${url}`;
                    }
                    const parsedUrl = new URL(url);
                    let currentPath = parsedUrl.pathname;
                        const routeCurrentPath = "/" + currentPath.split("/").filter(Boolean).slice(0, 3).join("/");
                    const matchedRoute = linkTitles.find(route => {
                        const routePath = `/${route.plugin}/${route.controller}/${route.action}`;
                        return routePath?.toLowerCase() === routeCurrentPath?.toLowerCase();
                    });
                    if (typeof matchedRoute != 'undefined') {
                        let lastSegment = currentPath.substring(currentPath.lastIndexOf("/") + 1);
                        if (/^\d+$/.test(lastSegment)) {
                        } else {
                            const decodedURIComponent = decodeURIComponent(lastSegment);
                            try {
                                lastSegment = atob(decodedURIComponent);
                            } catch (error) {
                                console.error("Invalid base64 string:", decodedURIComponent);
                                return '';
                            }
                        }
                        if (routeCurrentPath === '/documentmanagement/documentmanagement/downloads') {
                            path = `https://${process.env.DOMAIN}/${matchedRoute.newlink}/15/${lastSegment || ''}`;
                        } else {
                            path = `https://${process.env.DOMAIN}/${matchedRoute.newlink}/${lastSegment || ''}`;
                        }
                    }
                }
            }
            return path;
        }catch(err){
            throw new Error(err.message);
        }
    }
    normalizeDates(field, format = 'MM-DD-YYYY') { 
        const parsed = moment(field, [
        'YYYY-MM-DD HH:mm:ss',
        'YYYY-MM-DD',
        'MM-DD-YYYY',
        'MM/DD/YYYY',
        'YYYY/MM/DD',
        ], true); // true for strict parsing
        if (parsed.isValid()) {
            return parsed.format(format);
        }
    }
    getDateFormateChange(date = null, format = null) {
        try{
            const dobMoment = moment(date, 'MM-DD-YYYY', true);                          
            let formatDate;
            if(date){
                if(format){
                    formatDate = dobMoment.format(format);
                }else{
                    formatDate = dobMoment.year();
                }
            }
            else{
                formatDate = moment();
            }
            return  formatDate;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    getYearFromDate(date: string | Date | null = null, format: string | string[] | null = null): number {
        try {
            let momentDate;
            if (date) {
                if (format) {
                    momentDate = moment(date, format, true);
                } else {
                    momentDate = moment(date);
                }
            } else {
                momentDate = moment();
            }
            if (!momentDate.isValid()) {
                throw new Error("Invalid date format or value.");
            }
            return momentDate.year();
        } catch (err: any) {
            throw new Error(err.message);
        }
    }
    async getWhereCondition(OrgTimezone = "UTC",field = null, start_date: any = null, end_date: any = null,sendExtraData: any = {}) {
        try{
            start_date = this.DateTimeFormat(start_date).format("YYYY-MM-DD") + " 00:00:00";
            end_date = this.DateTimeFormat(end_date).format("YYYY-MM-DD") + " 23:59:59";
            let {
                conType = "",
                useType = "",
                secondField = "",
                dateChackedFormat = "",
                alias = "",
            } = sendExtraData;
            let conTypeCondition = `= '${this.DateTimeFormat(start_date).format("YYYY-MM-DD")}'`;
            if (conType == "BETWEEN") {
                conTypeCondition = `BETWEEN "${start_date}" AND "${end_date}"`;
            }
            let checkDateFormat = "%Y-%m-%d";
            if (dateChackedFormat == "fullDate") {
                checkDateFormat = "%Y-%m-%d %H:%i:%s";
            }
            let useField = `${alias}\`.\`${field}`;
            if (useType === "joins") {
                useField = `CONCAT(DATE_FORMAT(\`${alias}\`.\`${field}\`,'%Y-%m-%d '),DATE_FORMAT(\`${alias}\`.\`${secondField}\`,'%H:%i:%s'))`;
            }
            const returnCondition = `DATE_FORMAT(CONVERT_TZ(\`${useField}\`,"${OrgTimezone}",CASE WHEN \`user\`.\`timezone\` != "" THEN \`user\`.\`timezone\` ELSE "${OrgTimezone}" END),"${checkDateFormat}") ${conTypeCondition}`;
            return returnCondition;
        } catch (err: any) {
            throw new Error(err.message);
        }
    }
    getTimezoneOffsetValue(timezone: string, dateTime = moment()): string {
        try {
            const momentObj = moment.tz(dateTime, timezone)
            return momentObj.format("Z");
        } catch (err: any) {
            throw new Error(`Invalid timezone or input: ${err.message}`);
        }
    }

}
