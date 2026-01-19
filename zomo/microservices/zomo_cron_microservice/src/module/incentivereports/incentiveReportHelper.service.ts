import {
    appConstant,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    tableConstant,
} from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { CompanyService } from '../company/company.service';
import { IncentiveReportsService } from './incentivereports.service';
import { ActivityFeedService } from '../tracker/activityfeeds.service';
import { FoodFeedService } from '../tracker/foodfeeds.service';
const moment = require('moment-timezone');
const S3_URL = process.env.S3_URL_PROD;
const path = require('path');
const argon2 = require('argon2');
const { spawn } = require('child_process');
@Injectable()
export class IncentiveReportHelperService {
    constructor(
        private readonly foodFeedsService: FoodFeedService,
        private readonly activityFeedsService: ActivityFeedService,
        private readonly companyService: CompanyService,
        private readonly commonService: CommonService,
        private readonly commonHealthService: CommonHealthService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly incentiveReportsService: IncentiveReportsService,
        private readonly commonArrayService: CommonArrayService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
    ) { }
    
    async createMultisheetReportlsx(fileName = null, directory = '', sheetData: any[], fileDir = false) {
        let filePath
        try {
            let fileData;
            filePath = path.join(directory, fileName);
            const finalData = {
                filename: fileName.replace('.json', '.xlsx'),
                sequence: sheetData
            };
            const scriptPath = path.resolve('src/python', 'pythoncreatestyleexcel.py');
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

    async createSheetReportlsx(fileName = null, directory = '', sheetData: any[], fileDir = false) {
        let filePath
        try {
            let fileData;
            filePath = path.join(directory, fileName);
            const finalData = {
                filename: fileName.replace('.json', '.xlsx'),
                sequence: sheetData
            };
            const scriptPath = path.resolve('src/python', 'pythoncreateexcel.py');
            await this.commonFileService.writeFile(directory, JSON.stringify(finalData), fileName);

            // Wait for the Python script to finish
            await new Promise<void>((resolve, reject) => {
                const pyProcess = spawn('python', [scriptPath, path.resolve(filePath)]);
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

            const excelFilePath = filePath.replace('.json', '.xlsx');
            if (fileDir) {
                return { file_dir: excelFilePath };
            }
            if (await this.commonFileService.fileExist(excelFilePath)) {
                fileData = await this.commonFileService.FileToBase64(excelFilePath);
                // await this.commonFileService.removeFileFromLocal(filePath);
                // await this.commonFileService.removeFileFromLocal(excelFilePath);
            } else {
                throw new Error(`Excel file does not exist at ${excelFilePath}`);
            }

            return { file_data: fileData, file_name: fileName.replace('.json', ''), extension: 'xlsx' };
        } catch (error) {
            // await this.commonFileService.removeFileFromLocal(filePath);
            throw new Error(`An error occurred: ${error}`);
        }
    }
}
