import { appConstant, CommonFileService, CommonService } from '@common-constants';
import * as path from 'path';
import { lastValueFrom } from 'rxjs';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { existsSync, readFileSync } from 'fs';
import { ImportUserRequestService } from '../module/importuserrequest/importuserrequest.service';
import { ActivityLogService } from '../module/master/activitylog/activitylog.service';
import * as fs from 'fs';
export class CensusCommonService {
    constructor(
        private readonly commonFileService: CommonFileService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
        private readonly commonService: CommonService,
        private readonly activityLogService: ActivityLogService,
        private readonly importUserRequestService: ImportUserRequestService,
        @Inject('POSTCODES_SERVICE') private client: ClientProxy,
    ) {}

    // Inside CensusCommonService class

    async fetchAndValidateRecord(
        postData: any,
        flage: string,
        requeststep: string,
    ) {
        const filter = {
            status: '0',
            flage,
            requeststep,
            source: '1',
            ...(postData?.id
                ? { hash: postData.id, source_type: '2' }
                : { source_type: '1' }),
        };

        const recordDetails = await this.importUserRequestService.findOne(
            filter,
            postData?.id ? null : { request_date: 'ASC' },
        );

        if (!recordDetails) throw new Error('ERR_RECORD_NOT_FOUND');
        const backupDirectory = `${appConstant.CENSUS_FILE_PATH}${recordDetails.org_id}/${recordDetails.id}`;
        await this.prepareLocalLogFile(backupDirectory);
        return { recordDetails, backupDirectory };
    }

    async updateRecordProgress(
        hashId: string,
        updateData: Partial<{ flage: string; requeststep: string }>,
    ) {
        await this.importUserRequestService.update(
            { hash: hashId },
            updateData,
        );
    }
    async logElapsedTime(backupDir: string, label: string, startTime: number) {
        const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
        const logMessage = `=== ${label} ===\n${elapsedSeconds} seconds\n\n`;
        await this.logTime(backupDir, logMessage);
    }
    async logTime(directory: string, content: string): Promise<void> {
        try {
            await this.ensureDirectoryExists(directory);
            const filePath = path.join(directory, 'time.txt');
            await fs.promises.appendFile(filePath, content);
        } catch (error) {
            console.error('Error appending to time.txt:', error);
        }
    }

    async loadJsonFile(filePath: string): Promise<any> {
        return await this.getFile({ original_file: filePath });
    }

    async writeJsonFile(dir: string, data: any, fileName: string) {
        await this.writeJsonToFile(dir, data, fileName);
        await this.uploadFileInBucket(dir + '/' + fileName);
    }

    // This one is generic, inject services through constructor or class properties
    async getCachedId(
        key: string,
        meta: any,
        cacheMap: Record<string, number>,
        serviceFindOne: (query: any) => Promise<any>,
        serviceSave: (data: any) => Promise<any>,
        serviceUpdate: (filter: any, update: any) => Promise<any>,
        generateDefaultCode: () => string,
        generateFinalCode: (id: number) => string,
    ) {
        if (cacheMap[key]) return cacheMap[key];

        const existing = await serviceFindOne(meta);
        if (existing) {
            cacheMap[key] = existing.id;
            return existing.id;
        }

        const defaultCode = generateDefaultCode();
        const saved = await serviceSave({ ...meta, code: defaultCode });
        const id = saved?.identifiers?.[0]?.id;

        if (id) {
            const finalCode = generateFinalCode(id);
            await serviceUpdate({ id }, { code: finalCode });
            cacheMap[key] = id;
            return id;
        }

        return undefined;
    }

    async prepareLocalLogFile(directory: string): Promise<void> {
        const filePath = path.join(directory, 'time.txt');
        if (fs.existsSync(filePath)) {
            // Local file already exists, no action needed
            return;
        }

        try {
            const bucketPath =
                directory.replace(/^\.\/public\//, '') + '/time.txt';
            const rawFile = await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'get_file' },
                    {
                        path: bucketPath,
                        userBucket: 'private',
                    },
                ),
            );

            if (rawFile?.Body) {
                const fileContent = Buffer.from(
                    rawFile.Body,
                    'base64',
                ).toString('utf-8');
                await this.ensureDirectoryExists(directory);
                await this.commonFileService.writeFile(
                    directory,
                    fileContent,
                    'time.txt',
                );
                console.log(
                    '[prepareLocalLogFile] Recovered and wrote time.txt locally',
                );
            } else {
                console.warn(
                    '[prepareLocalLogFile] No Body found in bucket response',
                );
            }
        } catch (error) {
            console.error(
                '[prepareLocalLogFile] Failed to recover time.txt from bucket:',
                error,
            );
        }
    }

    async ensureDirectoryExists(directory: string): Promise<void> {
        try {
            if (!fs.existsSync(directory)) {
                fs.mkdirSync(directory, { recursive: true });
                console.log(
                    `[ensureDirectoryExists] Created directory: ${directory}`,
                );
            }
        } catch (error) {
            console.error(
                `[ensureDirectoryExists] Failed to create directory: ${directory}`,
                error,
            );
            throw error;
        }
    }
    async writeJsonToFile(directory: string, data: any, filename: string) {
        try {
            const result = await this.commonFileService.writeFile(
                directory,
                JSON.stringify(data),
                filename,
            );
            if (result?.status !== 'success') {
                throw new Error('Failed to write JSON file.');
            }
        } catch (error) {
            throw new Error(`writeJsonToFile error: ${error.message}`);
        }
    }
    async uploadLogFile(directory: string) {
        try {
            const fullPath = path.resolve(`${directory}/time.txt`);
            await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'upload_file' },
                    {
                        path: fullPath,
                        filename: `${directory}/time.txt`,
                        userBucket: 'private',
                        isRemove: false,
                    },
                ),
            );
        } catch (error) {
            console.error('Error uploading log file:', error);
        }
    }
    async uploadFileInBucket(directory: string) {
        try {
            const fullPath = path.resolve(`${directory}`);
            directory = directory.replace(/^\.\/public\//, '');
            await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'upload_file' },
                    {
                        path: fullPath,
                        filename: `${directory}`,
                        userBucket: 'private',
                        isRemove: false,
                    },
                ),
            );
        } catch (error) {
            console.log('File No uploaded');
        }
    }
    async sanitizeAndTrim(
        value: string | null | undefined,
        mode: string | null = null,
    ): Promise<string> {
        if (typeof value !== 'string') return '';
        return this.commonService.sanitize(value, mode);
        //.replace(/\s+/g, ' ')
        //.trim();
    }

    async getFile(recordDetails: { original_file: string }): Promise<any> {
        try {
            const localJsonPath = recordDetails.original_file.replace(
                /\.(xlsx|csv)$/i,
                '.json',
            );

            if (existsSync(localJsonPath)) {
                console.log('[Local File Found]:', localJsonPath);
                const fileData = readFileSync(localJsonPath, 'utf-8');
                return JSON.parse(fileData);
            }

            const bucketPath = localJsonPath.replace(/^\.\/public\//, '');

            const rawFile = await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'get_file' },
                    {
                        path: bucketPath,
                        userBucket: 'private',
                    },
                ),
            );
            if (!rawFile?.Body) {
                console.log('bucketPath', bucketPath);
            }

            const fileContent = Buffer.from(rawFile.Body, 'base64').toString(
                'utf-8',
            );
            return JSON.parse(fileContent);
        } catch (error) {
            console.error('Error in getFile:', error);
            throw error;
        }
    }
    async getRoleId(role: any) {
        const lower = role?.toString().toLowerCase();
        if (lower === 'register' || lower === 'employee') return 2;
        if (lower === 'spouse' || lower === 'spouse / domestic partner')
            return 16;
        return Number(role);
    }

    async getGender(gender: any) {
        const g = gender?.toString().toLowerCase();
        return g === 'male'
            ? 'm'
            : g === 'female'
              ? 'f'
              : ['other', 'others'].includes(g)
                ? 'o'
                : g;
    }

    async normalizeCountry(country: string) {
        return country?.toString().toLowerCase() === 'usa'
            ? 'United States'
            : country;
    }

    async normalizeYesNo(value: any, yes = 'Yes', no = 'No') {
        const v = value?.toString().toLowerCase();
        return v === 'yes' || v === 'y'
            ? yes
            : v === 'no' || v === 'n'
              ? no
              : value;
    }

    async toBooleanFlag(value: any) {
        const v = value?.toString().toLowerCase();
        return v === 'yes' || v === 'y' ? 1 : 0;
    }

    formatYesNo = (val: string | number | null | undefined): string => {
        const v = val?.toString().toLowerCase();
        return v === 'yes' || v === 'y' || v === '1' ? 'Yes' : 'No';
    };

    // Helper: decode base64 if needed
    decodeSecurityCode = (code: string | null | undefined): string | null => {
        return code && code.length > 11
            ? Buffer.from(code, 'base64').toString().trim()
            : null;
    };
    async error_log(
        user_id: number = 0,
        endPoint: any = '',
        message: any = '',
        log: any = '',
        req: any = '',
    ): Promise<void> {
        this.activityLogService.error_log(user_id, endPoint, message, log, req);
    }
    async getTimeZoneDataFromZips(
        zipSet: Set<string>,
    ): Promise<Record<string, any>> {
        const timeZoneData: Record<string, any> = {};

        if (!zipSet || zipSet.size === 0) return timeZoneData;

        const postCodes = Array.from(zipSet);

        await Promise.all(
            ['US', 'CA'].map(async (country) => {
                const isUS = country === 'US';
                const payload = {
                    countrycode: country,
                    ...(isUS
                        ? { zipcode: postCodes }
                        : { postalcode: postCodes }),
                };

                try {
                    const response = await lastValueFrom(
                        this.client.send({ cmd: 'find_postcode' }, [payload]),
                    );

                    if (Array.isArray(response)) {
                        response.forEach((item: any) => {
                            const rawKey = item.zipcode ?? item.postalcode;
                            if (!rawKey) return;

                            timeZoneData[rawKey] = {
                                ...(isUS
                                    ? { zipcode: rawKey }
                                    : { postalcode: rawKey }),
                                ...item,
                            };
                        });
                    } else {
                        console.warn(
                            `Unexpected response format for ${country}:`,
                            response,
                        );
                    }
                } catch (err: any) {
                    console.warn(
                        `Failed postcode lookup for ${country}:`,
                        err?.message || err,
                    );
                }
            }),
        );
        return timeZoneData;
    }
}
