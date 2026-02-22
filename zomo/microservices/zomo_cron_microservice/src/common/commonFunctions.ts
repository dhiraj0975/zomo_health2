import {
    appConstant,
    CommonDateService,
    CommonFileService
} from '@common-constants';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import * as path from 'path';
import { lastValueFrom } from 'rxjs';
import { UserSheetData } from 'src/module/challenge/input';
import { ActivityLogService } from '../module/master/activitylog/activitylog.service';
const { spawn } = require('child_process');
const moment = require('moment-timezone');
export class CronCommonService {
    constructor(
        private readonly activityLogService: ActivityLogService,
        @Inject('TIMEZONE_SERVICE')
        private timeZoneMicroservice: ClientProxy,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
    ) {}

    async errorLog(
        user_id: number = 0,
        endPoint: any = '',
        message: any = '',
        log: any = '',
        req: any = '',
    ): Promise<void> {
        this.activityLogService.errorLog(user_id, endPoint, message, log, req);
    }

    async onmapUrlContent(
        content: string | null | undefined,
        type: string = '',
    ): Promise<string> {
        if (!content) return '';
        let userDomain: string = 'https://' + process.env.DOMAIN;
        let domains: string[] = appConstant.DOMAINS_LIST;
        if (type == 'mailTemplate') {
            domains.push('{{IMAGE_BASE_URL}}');
        }
        // Create one regex pattern to match all domains
        const pattern = new RegExp(
            '(' +
                domains
                    .map((domain) =>
                        domain.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'),
                    ) // Escape special characters
                    .join('|') +
                ')',
            'gi',
        );
        return content.replace(pattern, userDomain);
    }

    async stateList(statecode, req: any, stateArray: string[] = []){
        try {
            let stateData;
            let where = { countrycode: 'US' };
            if (statecode) {
                where['statecode'] = statecode;
            }
            if (stateArray.length) {
                where['state'] = stateArray.join("','");
            }
            let timezoneData = await lastValueFrom(
                this.timeZoneMicroservice.send({ cmd: 'state_list' }, [where]),
            );
            stateData = timezoneData;
            where['countrycode'] = 'CA';
            timezoneData = await lastValueFrom(
                this.timeZoneMicroservice.send({ cmd: 'state_list' }, [where]),
            );
            stateData = [...stateData, ...timezoneData];
            return stateData;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    
    async createReportXlSX(fileDetails, sheetData: UserSheetData[], fileName = null, fileDir = false) {
        let filePath
        try {
            let fileData;
            const directory = path.join(appConstant.COMPANY_REPORT, fileDetails?.path ?? '');
            let prefix = fileDetails?.prefix ?? `Report_`;
            if (!fileName) {
                fileName = `${prefix}${fileDetails?.custom_cname?.replace(/[^A-Za-z0-9\-]/g, '_')}_${moment().format('YYYYMMDD_HHmmss')}_${await this.commonDateService.DateTimeFormat('now', 'timestamp')}.json`;
            }
            filePath = path.join(directory, fileName);
            const finalData = {
                filename: fileName.replace('.json', '.xlsx'),
                sequence: sheetData
            };
            const scriptPath = path.resolve('src/python', 'pythoncreateexcel.py');
            await this.commonFileService.writeFile(directory, JSON.stringify(finalData), fileName);

            // Wait for the Python script to finish
            await new Promise<void>((resolve, reject) => {
                const pyProcess = spawn('python3', [scriptPath, path.resolve(filePath)]);
                pyProcess.stdout.on('data', (data) => {
                    console.log(`Python: ${data.toString()}`);
                });
                pyProcess.stderr.on('data', (data) => {
                    console.error(`Python Error: ${data.toString()}`);
                });
                pyProcess.on('close', async (code) => {
                    console.log(`Python script exited with code ${code}`);
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(new Error(`Python script exited with code ${code}`));
                    }
                });
            });

            // Now check if the Excel file exists and return its base64
            const excelFilePath = filePath.replace('.json', '.xlsx');
            if (fileDir) {
                return { file_dir: excelFilePath };
            }
            if (await this.commonFileService.fileExist(excelFilePath)) {
                fileData = await this.commonFileService.FileToBase64(excelFilePath);
                await this.commonFileService.removeFileFromLocal(filePath);
                await this.commonFileService.removeFileFromLocal(excelFilePath);
            } else {
                throw new Error(`Excel file does not exist at ${excelFilePath}`);
            }

            return { file_data: fileData, file_name: fileName.replace('.json', ''), extension: 'xlsx' };

        } catch (error) {
            await this.commonFileService.removeFileFromLocal(filePath);
            throw new Error(`An error occurred: ${error}`);
        }
    }
}
