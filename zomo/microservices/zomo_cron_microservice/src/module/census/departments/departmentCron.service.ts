import {
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
} from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import * as path from 'path';
import { lastValueFrom } from 'rxjs';
import { DepartmentService } from '../../company/department.service';
import { ImportUserRequestService } from '../../user/importuserrequest/importuserrequest.service';
@Injectable()
export class DepartmentCronService {
    constructor(
        private readonly importUserRequestService: ImportUserRequestService,
        private readonly departmentService: DepartmentService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
    ) {}
    async importUserProcessDepartment(postData: any) {
        try {
            let recordDetails: any,
                sheetData: any,
                echoTime = '',
                allDepartmentNameSheet = [];
            const startTime = new Date().getTime();
            if (postData?.id) {
                recordDetails = await this.importUserRequestService.findOne(
                    {
                        hash: postData?.id,
                        status: '0',
                        flage: '4',
                        requeststep: '4',
                        source_type: '2',
                    },
                    null,
                    ['hash', 'org_id', 'mapped_header', 'origional_file', 'id'],
                );
            } else {
                recordDetails = await this.importUserRequestService.findOne(
                    {
                        status: '0',
                        flage: '4',
                        requeststep: '4',
                        source_type: '1',
                    },
                    { request_date: 'ASC' },
                    ['hash', 'org_id', 'mapped_header', 'origional_file', 'id'],
                );
            }
            if (!recordDetails) {
                throw new Error('ERR_RECORD_NOT_FOUND');
            }
            echoTime = 'Department\n';
            echoTime += `First ${(new Date().getTime() - startTime) / 1000}\n`;
            const directory = `userimport/${recordDetails?.org_id}/${recordDetails?.id}`;
            await this.importUserRequestService.update(
                { id: recordDetails?.id },
                { status: '0', flage: '1' },
            );
            const fileName: string = `census_created_update_${recordDetails?.hash}_${recordDetails?.org_id}.json`;
            let dataFileRead = await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'get_file' },
                    { path: `${directory}/${fileName}`, userBucket: 'private' },
                ),
            );
            let departmentData = Buffer.from(
                dataFileRead.Body,
                'base64',
            ).toString('utf-8');
            sheetData = JSON.parse(departmentData);
            sheetData = sheetData
                .map((row) =>
                    Object.fromEntries(
                        Object.entries(row)
                            .map(([key, value]) => [
                                key,
                                typeof value === 'string'
                                    ? value.trim()
                                    : value,
                            ])
                            .filter(
                                ([, value]) =>
                                    value !== null &&
                                    value !== undefined &&
                                    value !== '',
                            ),
                    ),
                )
                .filter((row) => Object.keys(row).length > 0);
            if (sheetData && sheetData.length > 0) {
                allDepartmentNameSheet = sheetData
                    .map((row) =>
                        this.commonService.sanitize(row['department_id']),
                    )
                    .filter(
                        (value) =>
                            typeof value === 'string' && value.trim() !== '',
                    );
            }
            const companyId = recordDetails?.org_id;
            let checkexistcondition = `department.company_id = ${companyId} AND department.status != 2 AND (department.default_dept = 'Yes'`;
            if (allDepartmentNameSheet && allDepartmentNameSheet.length > 0) {
                allDepartmentNameSheet = [
                    ...new Set(
                        allDepartmentNameSheet.map((name) =>
                            name.replace(/\s+/g, ' '),
                        ),
                    ),
                ];
                allDepartmentNameSheet.forEach((name, index) => {
                    checkexistcondition += ` OR department.dept_name LIKE '%${name}%'`;
                });
            }
            checkexistcondition += `)`;
            let all_exists_departments =
                await this.departmentService.listRecordCustom(
                    checkexistcondition,
                    ['department'],
                );
            const existingSet = new Set(
                all_exists_departments.map((dep) =>
                    dep.dept_name.toLowerCase(),
                ),
            );
            let generateDepartments = Array.from(
                new Set(
                    allDepartmentNameSheet
                        .map((dep) => dep.toLowerCase())
                        .filter((dep) => !existingSet.has(dep)),
                ),
            );
            echoTime += `Second ${(new Date().getTime() - startTime) / 1000}\n`;
            if (generateDepartments) {
                const codeCheck = async () => {
                    let verifyCode: any = '';
                    const code =
                        this.commonService.userDepartmentValidDefaultCode(1);
                    const deptCodeCheck = await this.departmentService.findOne({
                        code: code,
                        deleted: 0,
                    });
                    if (!deptCodeCheck) {
                        verifyCode = code;
                        return true;
                    } else {
                        verifyCode = await codeCheck();
                    }
                    return verifyCode;
                };
                for (const advalue of generateDepartments) {
                    const departmentAdd: any = {
                        companytype_id: '3',
                        dept_name: advalue,
                        company_id: companyId,
                        default_dept: 'NO',
                        dept_desc: '',
                        code: await codeCheck(),
                    };
                    const saveResult =
                        await this.departmentService.save(departmentAdd);
                    const deptID = saveResult.identifiers[0].id;
                    if (deptID) {
                        let deptCode = this.commonService.generateCode(
                            'D',
                            deptID,
                        );
                        await this.departmentService.update(
                            { id: deptID },
                            { code: deptCode },
                        );
                    }
                }
                await this.departmentService.update(
                    { code: 'DDDDDD' },
                    { code: this.commonService.generateCode('D', companyId) },
                );
            }
            all_exists_departments =
                await this.departmentService.listRecordCustom(
                    checkexistcondition,
                    ['department'],
                );
            echoTime += `Third ${(new Date().getTime() - startTime) / 1000}\n`;
            if (Object.keys(all_exists_departments).length > 0) {
                const columnDataArr = all_exists_departments.map((obj) => ({
                    DepartmentID: obj.id.toString(),
                    DepartmentName: obj.dept_name,
                    IsDefault: obj.default_dept,
                }));
                this.commonFileService.writeFile(
                    `${directory}`,
                    JSON.stringify(columnDataArr),
                    'departments.json',
                );
                await this.commonFileService.createJsonToFile(
                    1,
                    `${directory}/departments.json`,
                    'pythonjsontocsv.py',
                );
                await lastValueFrom(
                    this.commonMicroservice.send(
                        { cmd: 'upload_file' },
                        {
                            path: path.resolve(`${directory}/departments.csv`),
                            filename: `${directory}/departments.csv`,
                            userBucket: 'private',
                        },
                    ),
                );
                await lastValueFrom(
                    this.commonMicroservice.send(
                        { cmd: 'upload_file' },
                        {
                            path: path.resolve(`${directory}/departments.json`),
                            filename: `${directory}/departments.json`,
                            userBucket: 'private',
                        },
                    ),
                );
            }
            await this.importUserRequestService.update(
                { id: recordDetails?.id },
                { requeststep: '1' },
            );
            echoTime += `Four ${(new Date().getTime() - startTime) / 1000}\n`;
            /* Time Checking */
            this.commonFileService.writeFile(
                `${directory}`,
                echoTime,
                'time.txt',
            );
            await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'upload_file' },
                    {
                        path: path.resolve(`${directory}/time.txt`),
                        filename: `${directory}/time.txt`,
                        userBucket: 'private',
                    },
                ),
            );
            /* Time Checking */
            return {
                id: recordDetails?.hash,
                next_step: 'import-user-process-location',
            };
        } catch (error) {
            return false;
        }
    }
}
