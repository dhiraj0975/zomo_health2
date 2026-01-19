import {
    AgeActivityEntity,
    appConstant,
    AuthorizationsEntity,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    CommunicationTemplateTextsEntity,
    CompaniesEntity,
    DentistsEntity,
    DiseasesEntity,
    DownloadFormsEntity,
    FormInstructionsEntity,
    PhysicianTempsEntity,
    tableConstant,
    UserEntity,
    ZipDownloadsEntity,
    CacheService,
} from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import Handlebars from 'handlebars';
import * as path from 'path';
import { lastValueFrom } from 'rxjs';
import { In, Repository } from 'typeorm';
import { promisify } from 'util';
import { CronCommonService } from 'src/common';
const readFileAsync = promisify(fs.readFile);
const pdf = require('html-pdf-node');
const axios = require('axios');
const S3_URL = process.env.S3_URL_PROD;
const secretKey = Buffer.from(process.env.SECRET_KEY_PROD.slice(0, 32));
const iv = process.env.SECRET_KEY_PROD;
@Injectable()
export class DownloadFormsService {
    constructor(
        @InjectRepository(
            DownloadFormsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaDownloadFormsRepository: Repository<DownloadFormsEntity>,
        @InjectRepository(DownloadFormsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaDownloadFormsRepository: Repository<DownloadFormsEntity>,
        @InjectRepository(
            CompaniesEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaCompanyRepository: Repository<CompaniesEntity>,
        @InjectRepository(CompaniesEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCompanyRepository: Repository<CompaniesEntity>,
        @InjectRepository(
            FormInstructionsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaFormInstructionsRepository: Repository<FormInstructionsEntity>,
        @InjectRepository(
            FormInstructionsEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaFormInstructionsRepository: Repository<FormInstructionsEntity>,
        @InjectRepository(UserEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaUserRepository: Repository<UserEntity>,
        @InjectRepository(UserEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaUserRepository: Repository<UserEntity>,
        @InjectRepository(
            AuthorizationsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaAuthorizationsRepository: Repository<AuthorizationsEntity>,
        @InjectRepository(AuthorizationsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAuthorizationsRepository: Repository<AuthorizationsEntity>,
        @InjectRepository(
            AgeActivityEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaAgeActivityRepository: Repository<AgeActivityEntity>,
        @InjectRepository(AgeActivityEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAgeActivityRepository: Repository<AgeActivityEntity>,
        @InjectRepository(
            DentistsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaDentistsRepository: Repository<DentistsEntity>,
        @InjectRepository(DentistsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaDentistsRepository: Repository<DentistsEntity>,
        @InjectRepository(
            PhysicianTempsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaPhysicianTempsRepository: Repository<PhysicianTempsEntity>,
        @InjectRepository(PhysicianTempsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaPhysicianTempsRepository: Repository<PhysicianTempsEntity>,
        @InjectRepository(
            CommunicationTemplateTextsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaCommunicationTemplateTextsRepository: Repository<CommunicationTemplateTextsEntity>,
        @InjectRepository(
            CommunicationTemplateTextsEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaCommunicationTemplateTextsRepository: Repository<CommunicationTemplateTextsEntity>,
        @InjectRepository(
            ZipDownloadsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaZipDownloadsRepository: Repository<ZipDownloadsEntity>,
        @InjectRepository(ZipDownloadsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaZipDownloadsRepository: Repository<ZipDownloadsEntity>,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
        @InjectRepository(
            DiseasesEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaDiseaseRepository: Repository<DiseasesEntity>,
        @InjectRepository(DiseasesEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaDiseaseRepository: Repository<DiseasesEntity>,
        private readonly cacheService: CacheService,
        private readonly cronCommonService: CronCommonService,
    ) {}
    async download_form_process() {
        try {
            let FormdownloadRequest =
                await this.readReplicaDownloadFormsRepository
                    .createQueryBuilder('downloadforms')
                    .where('downloadforms.status = 0')
                    .orderBy('downloadforms.request_date', 'ASC')
                    .limit(1)
                    .getMany();
            if (FormdownloadRequest.length > 0) {
                let filesarray = [];
                let pdfFormDownload;
                for (let element of FormdownloadRequest) {
                    // FormdownloadRequest.map(async element => {
                    let companyId = element.org_id;
                    let request_id = element.id;
                    let company = await this.readReplicaCompanyRepository
                        .createQueryBuilder('company')
                        .leftJoinAndMapOne(
                            'company.companySetting',
                            tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
                            'companySetting',
                            `companySetting.org_id = company.id`,
                        )
                        .leftJoinAndMapMany(
                            'company.departments',
                            tableConstant.COMPANIES.TBL_DEPARTMENT,
                            'departments',
                            `departments.company_id = company.id AND departments.deleted = 0`,
                        )
                        .leftJoinAndMapMany(
                            'company.locations',
                            tableConstant.COMPANIES.TBL_LOCATION,
                            'locations',
                            `locations.company_id = company.id AND locations.deleted = 0 AND locations.location_name != ''`,
                        )
                        .select([
                            'company',
                            'companySetting',
                            'departments.id',
                            'departments.dept_name',
                            'departments.default_dept',
                            'locations.id',
                            'locations.location_name',
                            'locations.is_default',
                        ])
                        .where(`company.id = ${companyId}`)
                        .getOne();
                    let companyName = company.company_name;
                    let year = this.commonDateService
                        .getTodayDate()
                        .format('YYYY'); // get current year
                    let searchby = Number(element.form_type);
                    let program_selections = element.form_selection.split(',');
                    let daterange = element.condition ?? '';
                    let membership_code = element.membership_code;
                    let errMsg = 'Data Not Found';
                    let zipCreate = false;
                    let departments = element.s_department
                        ? element.s_department.split(',')
                        : [];
                    let locations = element.s_location
                        ? element.s_location.split(',')
                        : [];
                    let forminstructionsData: any =
                        await this.readReplicaFormInstructionsRepository.findOne(
                            { where: { company_id: companyId } },
                        );
                    let Physician = await this.templetextsRecord(
                        companyId,
                        null,
                        'Physician',
                    );
                    let AgeActivity =
                        await this.readReplicaAgeActivityRepository.find({
                            where: { org_id: In([0, companyId]), status: 1 },
                            order: { id: 'ASC' },
                        });
                    Physician.preventative_care_list = AgeActivity;
                    let diseases_list = [];
                    let disease_ids =
                        forminstructionsData?.disease_ids
                            ?.split(',')
                            .map(Number) || [];
                    diseases_list =
                        await this.readReplicaDiseaseRepository.find({
                            where: { id: In(disease_ids) },
                        });
                    Physician.diseases_list = Object.values(diseases_list);
                    let Dentist = await this.templetextsRecord(
                        companyId,
                        null,
                        'Dentist',
                    );
                    let Optometrist = await this.templetextsRecord(
                        companyId,
                        null,
                        'Optometrist',
                    );
                    let Tobacco = await this.templetextsRecord(
                        companyId,
                        null,
                        'Tobacco',
                    );
                    let Disease = await this.templetextsRecord(
                        companyId,
                        null,
                        'Disease',
                    );
                    if (companyId == 804) {
                        /* theme query*/
                    }
                    /* departments */
                    if (searchby == 1) {
                        if (departments.length == 0) {
                            departments = company['departments'].map(
                                (dept) => dept.id,
                            );
                        }
                        let where = `department_id IN (${departments.join(',')}) AND membership_code = '${membership_code}' AND user.status = 1 AND role_id IN (2,16) ${daterange}`;
                        let user = await this.readReplicaUserRepository
                            .createQueryBuilder('user')
                            .leftJoinAndMapOne(
                                'user.department',
                                tableConstant.COMPANIES.TBL_DEPARTMENT,
                                'department',
                                `department.id = user.department_id`,
                            )
                            .leftJoinAndMapOne(
                                'user.location',
                                tableConstant.COMPANIES.TBL_LOCATION,
                                'location',
                                `location.id = user.location`,
                            )
                            .where(where)
                            .select(['user', 'department', 'location'])
                            .getManyAndCount();
                        const [results, total] = user;
                        if (total == 0) {
                            errMsg = 'No user available for this department';
                            zipCreate = false;
                        }
                        if (results.length > 0) {
                            zipCreate = true;
                            const allUsers = results.map((user) => {
                                return `${user.id}`;
                            });
                            let formData =
                                await this.getFormOtherData(allUsers);
                            let Authorization = formData['Physician'] ?? [];
                            let Authorizationdvf = formData['Dental'] ?? [];
                            let Authorizationovf =
                                formData['Optometrist'] ?? [];
                            let Authorizationta = formData['Tabacco'] ?? [];
                            for (let user of results) {
                                let departmentName = user?.['department']?.[
                                    'dept_name'
                                ]
                                    ? user?.['department']?.[
                                          'dept_name'
                                      ].replace(/[^A-Za-z0-9\-]/g, '_')
                                    : '';
                                // let userName = user.last_name + ' ' + user.first_name + '_' + user.code;
                                if (!filesarray[departmentName]) {
                                    filesarray[departmentName] = [];
                                }
                                if (program_selections) {
                                    for (let program of program_selections) {
                                        if (program == '1') {
                                            forminstructionsData = {
                                                ...forminstructionsData,
                                                Physician: Physician,
                                            };
                                            let Authorization_data =
                                                Authorization?.find(
                                                    (auth) =>
                                                        auth.user_id == user.id,
                                                );
                                            if (Authorization_data) {
                                                pdfFormDownload =
                                                    await this.getGeneratepdf(
                                                        company,
                                                        user,
                                                        Authorization_data,
                                                        forminstructionsData,
                                                        'save',
                                                        departmentName,
                                                        '',
                                                        'zipRequest',
                                                    );
                                            } else {
                                                pdfFormDownload =
                                                    await this.getGeneratepdf(
                                                        company,
                                                        user,
                                                        0,
                                                        forminstructionsData,
                                                        'save',
                                                        departmentName,
                                                        '',
                                                        'zipRequest',
                                                    );
                                            }
                                            filesarray[departmentName].push(
                                                pdfFormDownload,
                                            );
                                        }
                                        if (program == '2') {
                                            forminstructionsData = {
                                                ...forminstructionsData,
                                                Dentist: Dentist,
                                            };
                                            let Authorizationdvf_data =
                                                Authorizationdvf?.find(
                                                    (auth) =>
                                                        auth.user_id == user.id,
                                                );
                                            if (Authorizationdvf_data) {
                                                pdfFormDownload =
                                                    await this.getGeneratepdf_dvf(
                                                        company,
                                                        user,
                                                        Authorizationdvf_data,
                                                        forminstructionsData,
                                                        'save',
                                                        departmentName,
                                                        'zipRequest',
                                                    );
                                            } else {
                                                pdfFormDownload =
                                                    await this.getGeneratepdf_dvf(
                                                        company,
                                                        user,
                                                        0,
                                                        forminstructionsData,
                                                        'save',
                                                        departmentName,
                                                        'zipRequest',
                                                    );
                                            }
                                            filesarray[departmentName].push(
                                                pdfFormDownload,
                                            );
                                        }
                                        if (program == '3') {
                                            forminstructionsData = {
                                                ...forminstructionsData,
                                                Optometrist: Optometrist,
                                            };
                                            let Authorizationovf_data =
                                                Authorizationovf?.find(
                                                    (auth) =>
                                                        auth.user_id == user.id,
                                                );
                                            if (Authorizationovf_data) {
                                                pdfFormDownload =
                                                    await this.getGeneratepdf_ovf(
                                                        company,
                                                        user,
                                                        Authorizationovf_data,
                                                        forminstructionsData,
                                                        'save',
                                                        departmentName,
                                                        'zipRequest',
                                                    );
                                            } else {
                                                pdfFormDownload =
                                                    await this.getGeneratepdf_ovf(
                                                        company,
                                                        user,
                                                        0,
                                                        forminstructionsData,
                                                        'save',
                                                        departmentName,
                                                        'zipRequest',
                                                    );
                                            }
                                            filesarray[departmentName].push(
                                                pdfFormDownload,
                                            );
                                        }
                                        if (program == '4') {
                                            forminstructionsData = {
                                                ...forminstructionsData,
                                                Tobacco: Tobacco,
                                            };
                                            let Authorizationta_data =
                                                Authorizationta?.find(
                                                    (auth) =>
                                                        auth.user_id == user.id,
                                                );
                                            if (Authorizationta_data) {
                                                pdfFormDownload =
                                                    await this.getGeneratepdf_ta(
                                                        company,
                                                        user,
                                                        Authorizationta_data,
                                                        forminstructionsData,
                                                        'save',
                                                        departmentName,
                                                        'zipRequest',
                                                    );
                                            } else {
                                                pdfFormDownload =
                                                    await this.getGeneratepdf_ta(
                                                        company,
                                                        user,
                                                        0,
                                                        forminstructionsData,
                                                        'save',
                                                        departmentName,
                                                        'zipRequest',
                                                    );
                                            }
                                            filesarray[departmentName].push(
                                                pdfFormDownload,
                                            );
                                        }
                                    }
                                }
                            }
                        }
                    }
                    /* departments */
                    /* locations */
                    if (searchby == 2) {
                        let userslocation = company['locations'];
                        if (userslocation.length > 0) {
                            if (locations.length == 0) {
                                locations = company['locations'].map(
                                    (loc) => loc.id,
                                );
                            }
                            let where = `location IN (${locations.join(',')}) AND membership_code = '${membership_code}' AND user.status = 1 AND role_id IN (2,16) ${daterange}`;
                            let user = await this.readReplicaUserRepository
                                .createQueryBuilder('user')
                                .leftJoinAndMapOne(
                                    'user.location',
                                    tableConstant.COMPANIES.TBL_LOCATION,
                                    'location',
                                    `location.id = user.location`,
                                )
                                .leftJoinAndMapOne(
                                    'user.department',
                                    tableConstant.COMPANIES.TBL_DEPARTMENT,
                                    'department',
                                    `department.id = user.department_id`,
                                )
                                .where(where)
                                .select(['user', 'location', 'department'])
                                .getManyAndCount();
                            const [results, total] = user;
                            if (total == 0) {
                                errMsg =
                                    'The User does not exist for this location';
                                zipCreate = false;
                            }
                            if (results.length > 0) {
                                zipCreate = true;
                                const allUsers = results.map((user) => {
                                    return `${user.id}`;
                                });
                                let formData =
                                    await this.getFormOtherData(allUsers);
                                let Authorization = formData['Physician'] ?? [];
                                let Authorizationdvf = formData['Dental'] ?? [];
                                let Authorizationovf =
                                    formData['Optometrist'] ?? [];
                                let Authorizationta = formData['Tabacco'] ?? [];
                                for (let user of results) {
                                    // let departmentName = user?.['department']?.['dept_name'] ? user?.['department']?.['dept_name'].replace(/[^A-Za-z0-9\-]/g, '_') : '';
                                    // let userName = user.last_name + ' ' + user.first_name + '_' + user.code;
                                    let locId = user.location['id'];
                                    if (!filesarray[locId]) {
                                        filesarray[locId] = [];
                                    }
                                    if (program_selections) {
                                        for (let program of program_selections) {
                                            if (program == '1') {
                                                forminstructionsData = {
                                                    ...forminstructionsData,
                                                    Physician: Physician,
                                                };
                                                let Authorization_data =
                                                    Authorization.find(
                                                        (auth) =>
                                                            auth.user_id ==
                                                            user.id,
                                                    );
                                                if (Authorization_data) {
                                                    pdfFormDownload =
                                                        await this.getGeneratepdf(
                                                            company,
                                                            user,
                                                            Authorization_data,
                                                            forminstructionsData,
                                                            'save',
                                                            String(locId),
                                                            '',
                                                            'zipRequest',
                                                        );
                                                } else {
                                                    pdfFormDownload =
                                                        await this.getGeneratepdf(
                                                            company,
                                                            user,
                                                            0,
                                                            forminstructionsData,
                                                            'save',
                                                            String(locId),
                                                            '',
                                                            'zipRequest',
                                                        );
                                                }
                                                filesarray[locId].push(
                                                    pdfFormDownload,
                                                );
                                            }
                                            if (program == '2') {
                                                forminstructionsData = {
                                                    ...forminstructionsData,
                                                    Dentist: Dentist,
                                                };
                                                let Authorizationdvf_data =
                                                    Authorizationdvf.find(
                                                        (auth) =>
                                                            auth.user_id ==
                                                            user.id,
                                                    );
                                                if (Authorizationdvf_data) {
                                                    pdfFormDownload =
                                                        await this.getGeneratepdf_dvf(
                                                            company,
                                                            user,
                                                            Authorizationdvf_data,
                                                            forminstructionsData,
                                                            'save',
                                                            String(locId),
                                                            'zipRequest',
                                                        );
                                                } else {
                                                    pdfFormDownload =
                                                        await this.getGeneratepdf_dvf(
                                                            company,
                                                            user,
                                                            0,
                                                            forminstructionsData,
                                                            'save',
                                                            String(locId),
                                                            'zipRequest',
                                                        );
                                                }
                                                filesarray[locId].push(
                                                    pdfFormDownload,
                                                );
                                            }
                                            if (program == '3') {
                                                forminstructionsData = {
                                                    ...forminstructionsData,
                                                    Optometrist: Optometrist,
                                                };
                                                let Authorizationovf_data =
                                                    Authorizationovf.find(
                                                        (auth) =>
                                                            auth.user_id ==
                                                            user.id,
                                                    );
                                                if (Authorizationovf_data) {
                                                    pdfFormDownload =
                                                        await this.getGeneratepdf_ovf(
                                                            company,
                                                            user,
                                                            Authorizationovf_data,
                                                            forminstructionsData,
                                                            'save',
                                                            String(locId),
                                                            'zipRequest',
                                                        );
                                                } else {
                                                    pdfFormDownload =
                                                        await this.getGeneratepdf_ovf(
                                                            company,
                                                            user,
                                                            0,
                                                            forminstructionsData,
                                                            'save',
                                                            String(locId),
                                                            'zipRequest',
                                                        );
                                                }
                                                filesarray[locId].push(
                                                    pdfFormDownload,
                                                );
                                            }
                                            if (program == '4') {
                                                forminstructionsData = {
                                                    ...forminstructionsData,
                                                    Tobacco: Tobacco,
                                                };
                                                let Authorizationta_data =
                                                    Authorizationta.find(
                                                        (auth) =>
                                                            auth.user_id ==
                                                            user.id,
                                                    );
                                                if (Authorizationta_data) {
                                                    pdfFormDownload =
                                                        await this.getGeneratepdf_ta(
                                                            company,
                                                            user,
                                                            Authorizationta_data,
                                                            forminstructionsData,
                                                            'save',
                                                            String(locId),
                                                            'zipRequest',
                                                        );
                                                } else {
                                                    pdfFormDownload =
                                                        await this.getGeneratepdf_ta(
                                                            company,
                                                            user,
                                                            0,
                                                            forminstructionsData,
                                                            'save',
                                                            String(locId),
                                                            'zipRequest',
                                                        );
                                                }
                                                filesarray[locId].push(
                                                    pdfFormDownload,
                                                );
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            errMsg =
                                'Currently Location not available in user details';
                            zipCreate = false;
                        }
                    }
                    /* locations */
                    /* departments by locations */
                    if (searchby == 3) {
                        let locname: any = [];
                        if (locations && locations.length > 0) {
                            locname = locations[0];
                        }
                        if (locname || locname.trim() != '') {
                            let where = `location IN (${locations.join(',')}) AND membership_code = '${membership_code}' AND user.status = 1 AND role_id IN (2,16) ${daterange}`;
                            if (departments.length != 0) {
                                where += ` AND department_id IN (${departments.join(',')})`;
                            }
                            let user = await this.readReplicaUserRepository
                                .createQueryBuilder('user')
                                .leftJoinAndMapOne(
                                    'user.location',
                                    tableConstant.COMPANIES.TBL_LOCATION,
                                    'location',
                                    `location.id = user.location`,
                                )
                                .leftJoinAndMapOne(
                                    'user.department',
                                    tableConstant.COMPANIES.TBL_DEPARTMENT,
                                    'department',
                                    `department.id = user.department_id`,
                                )
                                .where(where)
                                .select(['user', 'location', 'department'])
                                .getManyAndCount();
                            const [results, total] = user;
                            if (total == 0) {
                                errMsg =
                                    'The User does not exist for this location';
                                zipCreate = false;
                            }
                            if (results.length > 0) {
                                zipCreate = true;
                                const allUsers = results.map((user) => {
                                    return `${user.id}`;
                                });
                                let formData =
                                    await this.getFormOtherData(allUsers);
                                let Authorization = formData['Physician'] ?? [];
                                let Authorizationdvf = formData['Dental'] ?? [];
                                let Authorizationovf =
                                    formData['Optometrist'] ?? [];
                                let Authorizationta = formData['Tabacco'] ?? [];
                                for (let user of results) {
                                    let departmentName = user?.['department']?.[
                                        'dept_name'
                                    ]
                                        ? user?.['department']?.[
                                              'dept_name'
                                          ].replace(/[^A-Za-z0-9\-]/g, '_')
                                        : '';
                                    // let userName = user.last_name + ' ' + user.first_name + '_' + user.code;
                                    if (!filesarray[departmentName]) {
                                        filesarray[departmentName] = [];
                                    }
                                    if (program_selections) {
                                        for (let program of program_selections) {
                                            if (program == '1') {
                                                forminstructionsData = {
                                                    ...forminstructionsData,
                                                    Physician: Physician,
                                                };
                                                let Authorization_data =
                                                    Authorization.find(
                                                        (auth) =>
                                                            auth.user_id ==
                                                            user.id,
                                                    );
                                                if (Authorization_data) {
                                                    pdfFormDownload =
                                                        await this.getGeneratepdf(
                                                            company,
                                                            user,
                                                            Authorization_data,
                                                            forminstructionsData,
                                                            'save',
                                                            departmentName,
                                                            '',
                                                            'zipRequest',
                                                        );
                                                } else {
                                                    pdfFormDownload =
                                                        await this.getGeneratepdf(
                                                            company,
                                                            user,
                                                            0,
                                                            forminstructionsData,
                                                            'save',
                                                            departmentName,
                                                            '',
                                                            'zipRequest',
                                                        );
                                                }
                                                filesarray[departmentName].push(
                                                    pdfFormDownload,
                                                );
                                            }
                                            if (program == '2') {
                                                forminstructionsData = {
                                                    ...forminstructionsData,
                                                    Dentist: Dentist,
                                                };
                                                let Authorizationdvf_data =
                                                    Authorizationdvf.find(
                                                        (auth) =>
                                                            auth.user_id ==
                                                            user.id,
                                                    );
                                                if (Authorizationdvf_data) {
                                                    pdfFormDownload =
                                                        await this.getGeneratepdf_dvf(
                                                            company,
                                                            user,
                                                            Authorizationdvf_data,
                                                            forminstructionsData,
                                                            'save',
                                                            departmentName,
                                                            'zipRequest',
                                                        );
                                                } else {
                                                    pdfFormDownload =
                                                        await this.getGeneratepdf_dvf(
                                                            company,
                                                            user,
                                                            0,
                                                            forminstructionsData,
                                                            'save',
                                                            departmentName,
                                                            'zipRequest',
                                                        );
                                                }
                                                filesarray[departmentName].push(
                                                    pdfFormDownload,
                                                );
                                            }
                                            if (program == '3') {
                                                forminstructionsData = {
                                                    ...forminstructionsData,
                                                    Optometrist: Optometrist,
                                                };
                                                let Authorizationovf_data =
                                                    Authorizationovf.find(
                                                        (auth) =>
                                                            auth.user_id ==
                                                            user.id,
                                                    );
                                                if (Authorizationovf_data) {
                                                    pdfFormDownload =
                                                        await this.getGeneratepdf_ovf(
                                                            company,
                                                            user,
                                                            Authorizationovf_data,
                                                            forminstructionsData,
                                                            'save',
                                                            departmentName,
                                                            'zipRequest',
                                                        );
                                                } else {
                                                    pdfFormDownload =
                                                        await this.getGeneratepdf_ovf(
                                                            company,
                                                            user,
                                                            0,
                                                            forminstructionsData,
                                                            'save',
                                                            departmentName,
                                                            'zipRequest',
                                                        );
                                                }
                                                filesarray[departmentName].push(
                                                    pdfFormDownload,
                                                );
                                            }
                                            if (program == '4') {
                                                forminstructionsData = {
                                                    ...forminstructionsData,
                                                    Tobacco: Tobacco,
                                                };
                                                let Authorizationta_data =
                                                    Authorizationta.find(
                                                        (auth) =>
                                                            auth.user_id ==
                                                            user.id,
                                                    );
                                                if (Authorizationta_data) {
                                                    pdfFormDownload =
                                                        await this.getGeneratepdf_ta(
                                                            company,
                                                            user,
                                                            Authorizationta_data,
                                                            forminstructionsData,
                                                            'save',
                                                            departmentName,
                                                            'zipRequest',
                                                        );
                                                } else {
                                                    pdfFormDownload =
                                                        await this.getGeneratepdf_ta(
                                                            company,
                                                            user,
                                                            0,
                                                            forminstructionsData,
                                                            'save',
                                                            departmentName,
                                                            'zipRequest',
                                                        );
                                                }
                                                filesarray[departmentName].push(
                                                    pdfFormDownload,
                                                );
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            errMsg =
                                'Currently location not available for departments';
                            zipCreate = false;
                        }
                    }
                    /* departments by locations */
                    /* employee name */
                    if (searchby == 5) {
                        let empname = element.s_employee;
                        let empnameplites = empname ? empname.split(' ') : [];
                        let conditions = [];
                        let where = `membership_code = '${membership_code}' AND user.status = 1 AND role_id IN (2,16) ${daterange}`;
                        if (empnameplites.length > 0) {
                            empnameplites.map((name) => {
                                conditions.push(
                                    `(user.first_name LIKE '%${name}%' OR user.last_name LIKE '%${name}%')`,
                                );
                            });
                            where += ` AND (${conditions.join(' AND ')})`;
                        }
                        let user = await this.readReplicaUserRepository
                            .createQueryBuilder('user')
                            .leftJoinAndMapOne(
                                'user.location',
                                tableConstant.COMPANIES.TBL_LOCATION,
                                'location',
                                `location.id = user.location`,
                            )
                            .leftJoinAndMapOne(
                                'user.department',
                                tableConstant.COMPANIES.TBL_DEPARTMENT,
                                'department',
                                `department.id = user.department_id`,
                            )
                            .where(where)
                            .select(['user', 'location', 'department'])
                            .getManyAndCount();
                        const [results, total] = user;
                        if (total == 0) {
                            errMsg =
                                'The User does not exist for this location';
                            zipCreate = false;
                        }
                        if (results.length > 0) {
                            zipCreate = true;
                            const allUsers = results.map((user) => {
                                return `${user.id}`;
                            });
                            let formData =
                                await this.getFormOtherData(allUsers);
                            let Authorization = formData['Physician'] ?? [];
                            let Authorizationdvf = formData['Dental'] ?? [];
                            let Authorizationovf =
                                formData['Optometrist'] ?? [];
                            let Authorizationta = formData['Tabacco'] ?? [];
                            for (let user of results) {
                                let departmentName = user?.['department']?.[
                                    'dept_name'
                                ]
                                    ? user?.['department']?.[
                                          'dept_name'
                                      ].replace(/[^A-Za-z0-9\-]/g, '_')
                                    : '';
                                // let userName = user.last_name + ' ' + user.first_name + '_' + user.code;
                                if (!filesarray[departmentName]) {
                                    filesarray[departmentName] = [];
                                }
                                if (program_selections) {
                                    for (let program of program_selections) {
                                        if (program == '1') {
                                            forminstructionsData = {
                                                ...forminstructionsData,
                                                Physician: Physician,
                                            };
                                            let Authorization_data =
                                                Authorization.find(
                                                    (auth) =>
                                                        auth.user_id == user.id,
                                                );
                                            if (Authorization_data) {
                                                pdfFormDownload =
                                                    await this.getGeneratepdf(
                                                        company,
                                                        user,
                                                        Authorization_data,
                                                        forminstructionsData,
                                                        'save',
                                                        departmentName,
                                                        '',
                                                        'zipRequest',
                                                    );
                                            } else {
                                                pdfFormDownload =
                                                    await this.getGeneratepdf(
                                                        company,
                                                        user,
                                                        0,
                                                        forminstructionsData,
                                                        'save',
                                                        departmentName,
                                                        '',
                                                        'zipRequest',
                                                    );
                                            }
                                            filesarray[departmentName].push(
                                                pdfFormDownload,
                                            );
                                        }
                                        if (program == '2') {
                                            forminstructionsData = {
                                                ...forminstructionsData,
                                                Dentist: Dentist,
                                            };
                                            let Authorizationdvf_data =
                                                Authorizationdvf.find(
                                                    (auth) =>
                                                        auth.user_id == user.id,
                                                );
                                            if (Authorizationdvf_data) {
                                                pdfFormDownload =
                                                    await this.getGeneratepdf_dvf(
                                                        company,
                                                        user,
                                                        Authorizationdvf_data,
                                                        forminstructionsData,
                                                        'save',
                                                        departmentName,
                                                        'zipRequest',
                                                    );
                                            } else {
                                                pdfFormDownload =
                                                    await this.getGeneratepdf_dvf(
                                                        company,
                                                        user,
                                                        0,
                                                        forminstructionsData,
                                                        'save',
                                                        departmentName,
                                                        'zipRequest',
                                                    );
                                            }
                                            filesarray[departmentName].push(
                                                pdfFormDownload,
                                            );
                                        }
                                        if (program == '3') {
                                            forminstructionsData = {
                                                ...forminstructionsData,
                                                Optometrist: Optometrist,
                                            };
                                            let Authorizationovf_data =
                                                Authorizationovf.find(
                                                    (auth) =>
                                                        auth.user_id == user.id,
                                                );
                                            if (Authorizationovf_data) {
                                                pdfFormDownload =
                                                    await this.getGeneratepdf_ovf(
                                                        company,
                                                        user,
                                                        Authorizationovf_data,
                                                        forminstructionsData,
                                                        'save',
                                                        departmentName,
                                                        'zipRequest',
                                                    );
                                            } else {
                                                pdfFormDownload =
                                                    await this.getGeneratepdf_ovf(
                                                        company,
                                                        user,
                                                        0,
                                                        forminstructionsData,
                                                        'save',
                                                        departmentName,
                                                        'zipRequest',
                                                    );
                                            }
                                            filesarray[departmentName].push(
                                                pdfFormDownload,
                                            );
                                        }
                                        if (program == '4') {
                                            forminstructionsData = {
                                                ...forminstructionsData,
                                                Tobacco: Tobacco,
                                            };
                                            let Authorizationta_data =
                                                Authorizationta.find(
                                                    (auth) =>
                                                        auth.user_id == user.id,
                                                );
                                            if (Authorizationta_data) {
                                                pdfFormDownload =
                                                    await this.getGeneratepdf_ta(
                                                        company,
                                                        user,
                                                        Authorizationta_data,
                                                        forminstructionsData,
                                                        'save',
                                                        departmentName,
                                                        'zipRequest',
                                                    );
                                            } else {
                                                pdfFormDownload =
                                                    await this.getGeneratepdf_ta(
                                                        company,
                                                        user,
                                                        0,
                                                        forminstructionsData,
                                                        'save',
                                                        departmentName,
                                                        'zipRequest',
                                                    );
                                            }
                                            filesarray[departmentName].push(
                                                pdfFormDownload,
                                            );
                                        }
                                    }
                                }
                            }
                        }
                    }
                    /* employee name */
                    let Templatetext =
                        await this.readReplicaCommunicationTemplateTextsRepository.findOne(
                            {
                                where: { org_id: In([companyId, 0]), type: 24 },
                                order: { id: 'DESC' },
                            },
                        );
                    if (Templatetext) {
                        Templatetext['new_text'] =
                            (await this.cronCommonService.onmapUrlContent(
                                Templatetext?.['new_text'],
                                'mailTemplate',
                            )) || Templatetext?.['text'];
                    }
                    let userid = element.user_id;
                    let usersdata =
                        await this.readReplicaUserRepository.findOne({
                            where: { id: userid },
                        });
                    if (zipCreate && zipCreate == true) {
                        let encrypted = this.commonService.generateMD5(
                            request_id.toString(),
                        );
                        let zipfilename = encrypted + '.zip';
                        await this.commonFileService.zipFolder(
                            filesarray,
                            'uploads/tmp_zip',
                            zipfilename,
                        );
                        let bucketPath = `hform/ziprequest/${companyId.toString()}/${request_id.toString()}/${zipfilename}`;
                        let localPath = path.join(
                            `uploads/tmp_zip`,
                            zipfilename,
                        );
                        let filepath = await lastValueFrom(
                            this.commonMicroservice.send(
                                { cmd: 'upload_file' },
                                {
                                    path: path.resolve(localPath),
                                    filename: bucketPath,
                                    userBucket: 'private',
                                },
                            ),
                        );
                        if (filepath) {
                            await this.writeReplicaDownloadFormsRepository.update(
                                { id: element.id },
                                { status: 1, file_name: bucketPath },
                            );
                            for (const folderName in filesarray) {
                                const files = filesarray[folderName];
                                if (files.length) {
                                    let folderPath = files[0]['path']
                                        .split('\\')
                                        .slice(0, -1)
                                        .join('\\');
                                    for (const file of files) {
                                        fs.rmSync(file.path);
                                    }
                                    const folderStat = fs.lstatSync(folderPath);
                                    if (folderStat.isDirectory()) {
                                        fs.rmSync(folderPath, {
                                            recursive: true,
                                        });
                                    }
                                }
                            }
                        }
                        companyName = companyName ?? 'ZomoHealth';
                        // let URL = encodezipfilename ?? '';
                        let URL = bucketPath ?? '';
                        try {
                            let emailDetails = {
                                receiver: element.email,
                                subject: 'Export Download URL',
                                template:
                                    Templatetext['new_text'] ||
                                    Templatetext?.['text'],
                                content: {
                                    type: 24,
                                    First_Name:
                                        usersdata.first_name.toUpperCase(),
                                    Company_Name: companyName,
                                    Link: URL,
                                },
                            };
                            const response = await lastValueFrom(
                                this.commonMicroservice.send(
                                    { cmd: 'send_email' },
                                    emailDetails,
                                ),
                            );
                        } catch (err) {
                            console.error('Error calling common service:', err);
                        }
                    } else {
                        await this.writeReplicaDownloadFormsRepository.update(
                            { id: element.id },
                            { status: 2, file_name: errMsg },
                        );
                        try {
                            let emailDetails = {
                                receiver: element.email,
                                subject: 'Export Download URL',
                                template:
                                    Templatetext['new_text'] ||
                                    Templatetext?.['text'],
                                content: {
                                    type: 24,
                                    First_Name:
                                        usersdata.first_name.toUpperCase(),
                                    Company_Name: companyName,
                                    Link: errMsg,
                                },
                            };
                            const response = await lastValueFrom(
                                this.commonMicroservice.send(
                                    { cmd: 'send_email' },
                                    emailDetails,
                                ),
                            );
                        } catch (err) {
                            console.error('Error calling common service:', err);
                        }
                    }
                    // });
                }
            }
            return true;
        } catch (error) {
            console.error('Error in download_process:', error);
            throw error;
        }
    }
    async getFormOtherData(users: any) {
        try {
            let user_ids = users.join(',');
            let formData = await this.readReplicaAuthorizationsRepository
                .createQueryBuilder('authorizations')
                .where(`authorizations.user_id IN (${user_ids})`)
                .orderBy('authorizations.id', 'DESC')
                .groupBy('authorizations.user_id')
                .getMany();
            const groupedData = formData?.reduce((acc, item) => {
                if (!acc[item.type_of_form]) {
                    acc[item.type_of_form] = [];
                }
                acc[item.type_of_form].push(item);
                return acc;
            }, {});
            return groupedData;
        } catch (error) {
            throw error;
        }
    }
    async templetextsRecord(
        companyId: any,
        orderBy: any = null,
        form_type: any = null,
    ) {
        try {
            let formType = {
                1: 'Physician',
                2: 'Dentist',
                3: 'Optometrist',
                4: 'Tobacco',
                5: 'Disease',
            };
            let form_type_id = Object.keys(formType).find(
                (key) => formType[key] === form_type,
            );
            let fields = ['forminstructions', `${form_type}`];
            if (!orderBy) {
                orderBy = { id: 'DESC' };
            }
            let query = this.readReplicaFormInstructionsRepository
                .createQueryBuilder('forminstructions')
                .leftJoinAndMapMany(
                    `forminstructions.${form_type}`,
                    tableConstant.HEALTH_CHECKUP
                        .TBL_HC_FORM_INSTRUCTIONS_TEMPLATE_TEXTS,
                    `${form_type}`,
                    `${form_type}.form_type IN (0,${form_type_id}) AND ${form_type}.org_id IN (forminstructions.company_id,0)`,
                );
            if (form_type == 'Physician' || form_type == 'Disease') {
                fields = [...fields, 'diseases', 'diseasesforms', 'coverpages'];
                query = query
                    .leftJoinAndMapMany(
                        'forminstructions.diseases',
                        tableConstant.DISEASE_MANAGEMENT.TBL_DS_DISEASES,
                        'diseases',
                        `FIND_IN_SET(diseases.id, forminstructions.assign_disease_ids)`,
                    )
                    .leftJoinAndMapMany(
                        'forminstructions.diseasesforms',
                        tableConstant.DISEASE_MANAGEMENT.TBL_DS_FORMS,
                        'diseasesforms',
                        `FIND_IN_SET(diseasesforms.disease_id, forminstructions.disease_ids) AND diseasesforms.status = 1`,
                    )
                    .leftJoinAndMapMany(
                        'forminstructions.coverpages',
                        tableConstant.DISEASE_MANAGEMENT.TBL_DS_COVER_PAGES,
                        'coverpages',
                        `coverpages.form_id = diseasesforms.id  AND coverpages.org_id = forminstructions.company_id`,
                    );
            }
            let data = await query
                .select(fields)
                .where({ company_id: companyId })
                .orderBy(
                    `forminstructions.${Object.keys(orderBy)[0]}`,
                    orderBy[Object.keys(orderBy)[0]],
                )
                .getOne();
            const global_dynamic_data = data?.[form_type].filter(
                (item) => item.org_id === 0,
            );
            const company_dynamic_data = data?.[form_type].filter(
                (item) => item.org_id == companyId,
            );
            return await this.dynamic_company_global_data_merge(
                global_dynamic_data,
                company_dynamic_data,
                data,
            );
        } catch (error) {
            throw error;
        }
    }
    async dynamic_company_global_data_merge(
        global_text,
        company_text,
        forminstructions,
    ) {
        try {
            let main_option = {
                1: 'header_text',
                2: 'patient_information',
                3: 'billing_coding',
                4: 'privacy_information',
                5: 'footer_text',
                6: 'patient_health_information',
                7: 'fax_text_date',
                8: 'datatransmission',
                9: 'optionalsections',
                10: 'patient_data_form',
                11: 'phq_text',
                12: 'gad_text',
                13: 'identification_cover',
                14: 'dentist_one_text',
                15: 'dentist_two_text',
            };
            for (let ele of global_text) {
                const result = company_text.some(
                    (data) =>
                        data.main_option == ele.main_option &&
                        data.type == ele.type,
                );
                if (!result) {
                    company_text.push(ele);
                }
            }
            const company_data = company_text.sort((a, b) => a.order - b.order);
            const show_data = company_data.reduce((acc, item) => {
                const optionKey = main_option[item.main_option];
                if (!acc[optionKey]) {
                    acc[optionKey] = [];
                }
                if (
                    optionKey == 'datatransmission' ||
                    optionKey == 'optionalsections'
                ) {
                    item.selected = 0;
                    if (optionKey == 'datatransmission') {
                        if (
                            forminstructions.submition_option
                                .split(',')
                                .includes(item.type.toString())
                        ) {
                            item.selected = 1;
                        }
                    }
                    if (optionKey == 'optionalsections') {
                        if (
                            forminstructions.optionalpage
                                .split(',')
                                .includes(item.type.toString())
                        ) {
                            item.selected = 1;
                        }
                    }
                    acc[optionKey].push(item);
                } else {
                    acc[optionKey] = item.text;
                }
                return acc;
            }, {});
            return show_data;
        } catch (error) {
            throw error;
        }
    }
    async getImageAsBase64(imageUrl: string) {
        try {
            const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 5000,
            });
            return `data:image/${imageUrl.split('.').pop()};base64,${Buffer.from(response.data).toString('base64')}`;
        } catch (err) {
            console.error('Image load failed:', err.message);
            return '';
        }
    }
    async footer_replace_text(footer_text: any, dataFileRead: any) {
        try {
            return footer_text.replace(
                /<img[^>]*id=["']complogo["'][^>]*>/i,
                `<style>span.logo { 
                    content: url("${dataFileRead}"); 
                    width: 180px;
                    height: 50px;
                    right: 20px;
                    bottom: 30px;
                    position: absolute;
                    object-fit: contain;
                    object-position: right;
                    }</style><span class="logo"></span>`,
            );
        } catch (error) {
            throw error;
        }
    }
    async getGeneratepdf(
        company: any = null,
        users: any = null,
        Authorization: any = null,
        forminstructions: any = null,
        status: any = null,
        foldername: any = '',
        signup: any = null,
        filefilter = null,
        stdt = null,
        endt = null,
    ) {
        try {
            const pos = foldername.indexOf('+');
            if (pos !== -1) {
                foldername = foldername.replace(/\+/g, '/');
            }
            let complogo = '';
            let dynamic_data = forminstructions.Physician;
            let companyId = company.id;
            let formtypecustom = 'PHYSICIAN VISIT PACKET';
            let formtypecustombiometric = 'BIOMETRIC SCREENING RESULTS';
            let formtypefirstdata,
                formtypesecondtdata = 'PATIENT DATA FORM';
            let formtypeagegenderdata =
                'AGE / GENDER APPROPRIATE PREVENTIVE CARE';
            let formtypetobaccodata = 'PHYSICIAN TOBACCO USE VERIFICATION';
            let preventative_care_list = dynamic_data.preventative_care_list;
            let diseases_list = dynamic_data.diseases_list;
            if (forminstructions.is_logo == 1) {
                if (company?.company_logo != '') {
                    complogo = `${S3_URL}companylogos/${company.id}/orginallogo/${company.company_logo}`;
                } else {
                    complogo = `${S3_URL}comn/img/zomo-health-logo-dark.png`;
                }
            }
            let companyname = company.company_name;
            if (forminstructions?.before_title != '') {
                formtypefirstdata = forminstructions.before_title;
            }
            if (forminstructions?.before_age_title != '') {
                formtypesecondtdata = forminstructions.before_age_title;
            }
            if (
                forminstructions?.program_custom_name &&
                forminstructions?.program_custom_name != ''
            ) {
                let program_custom_name = JSON.parse(
                    forminstructions.program_custom_name,
                );
                if (program_custom_name?.[1] && program_custom_name[1] != '') {
                    formtypecustom = program_custom_name[1];
                }
                if (program_custom_name?.[5] && program_custom_name[5] != '') {
                    formtypecustombiometric = program_custom_name[5];
                }
                if (program_custom_name?.[6] && program_custom_name[6] != '') {
                    formtypeagegenderdata = program_custom_name[6];
                }
            }
            if (companyId == 804) {
            } else {
                let currentDate = this.commonDateService.DateTimeFormat('now', 'MM-DD-YYYY');
                let year = this.commonDateService.DateTimeFormat('now', 'YYYY');
                if (forminstructions.forms_year == 2) {
                    year = this.commonDateService.getTodayDate().add(1, 'year').format('YYYY');
                } else if (forminstructions.forms_year == 3) {
                    year = year +' / ' +this.commonDateService.getTodayDate().add(1, 'year').format('YYYY');
                }
                if (company.companySetting.wellnessprog_name != '') {
                    let formtext = company.companySetting.wellnessprog_name.toUpperCase();
                }
                let formfaxno = '1-713-714-2273';
                if (forminstructions?.fax_number != '') {
                    formfaxno = '1-' + forminstructions.fax_number;
                }
                let submition_option = [0];
                if (!forminstructions.submition_option) {
                    submition_option = forminstructions.submition_option.split(',');
                }
                let user_id = users.id;
                let uname = users.first_name + ' ' + users.last_name;
                let name = users.last_name + ' ' + users.first_name;
                let department = users?.department?.dept_name;
                let location ='';
                let location_name = '';
                if (users?.location) {
                    location = '_' + users?.location;
                    location_name = users?.location?.location_name;
                }
                let user_code = users.code;
                let user_email = users.email;
                let user_wphone = users.wphone;
                let employeeid = users.employeeid;
                let SERVER_URL = 'https://' + process.env.DOMAIN + '/';
                let link = SERVER_URL + 'physicians/add';
                let link2 = SERVER_URL + 'user/user/user_forms';
                const physician_filename = (name + '_' + user_code + '_' + companyname + '_' + department + '_Physician_Forms_' + currentDate ).replace(/[^A-Za-z0-9\-]/g, '_') + '.pdf';
                let start_date, end_date, fax_date;
                if (stdt && endt) {
                    let diff = 0;
                    start_date = this.commonDateService.getTodayDate(stdt).format('MM-DD-YYYY');
                    end_date = this.commonDateService.getTodayDate(endt).format('MM-DD-YYYY');
                    if (forminstructions.date_range === 2) {
                        diff = Math.abs(
                            this.commonDateService
                                .getTodayDate(forminstructions.fax_date)
                                .diff(
                                    this.commonDateService.getTodayDate(
                                        forminstructions.end_date,
                                    ),
                                    'days',
                                ),
                        );
                    } else {
                        if (forminstructions.pf_fax_date !== '0000-00-00 00:00:00' ) {
                            diff = Math.abs(
                                this.commonDateService
                                    .getTodayDate(forminstructions.pf_fax_date)
                                    .diff(
                                        this.commonDateService.getTodayDate(
                                            forminstructions.pf_end_date,
                                        ),
                                        'days',
                                    ),
                            );
                        }
                    }
                    fax_date = this.commonDateService.getTodayDate(endt).add(diff, 'days').format('MM-DD-YYYY');
                } else {
                    if (forminstructions['date_range'] == 2) {
                        start_date = this.commonDateService.getTodayDate(forminstructions.start_date).format('MM-DD-YYYY');
                        end_date = this.commonDateService.getTodayDate(forminstructions.end_date).format('MM-DD-YYYY');
                        fax_date = this.commonDateService.getTodayDate(forminstructions.fax_date).format('MM-DD-YYYY');
                    } else {
                        start_date = this.commonDateService.getTodayDate(forminstructions.pf_start_date).format('MM-DD-YYYY');
                        end_date = this.commonDateService.getTodayDate(forminstructions.pf_end_date).format('MM-DD-YYYY');
                        fax_date = this.commonDateService.getTodayDate(forminstructions.pf_fax_date).format('MM-DD-YYYY');
                    }
                }
                let signature, date_completed = '';
                if (Authorization) {
                    signature = Authorization.signature;
                    date_completed = this.commonDateService.getTodayDate(Authorization.date_completed).format('MM-DD-YYYY');
                }
                let fax_text, faxed_text = ' return to the patient for submission';
                if (submition_option.includes(2)) {
                    fax_text = `fax the forms to ${formfaxno}`;
                    faxed_text = `faxed to ${formfaxno}`;
                }
                let html = '';
                let header_text = dynamic_data.header_text;
                let footer_text = dynamic_data.footer_text;
                if (foldername && foldername != '' && status != 'EmailPdf') {
                    html += dynamic_data.identification_cover;
                    html += '<div class="page-break"></div>';
                }
                if (
                    forminstructions.physician_text &&
                    forminstructions?.physician_text != ''
                ) {
                    html += forminstructions.physician_text;
                    html += '<div class="page-break"></div>';
                }
                if (dynamic_data.patient_information) {
                    html += dynamic_data.patient_information;
                }
                if (dynamic_data.datatransmission) {
                    for (let record of dynamic_data.datatransmission) {
                        if (record.selected == 1) {
                            if (record.type == 4 || record.type == 5) {
                                html += `</n><b>${record.text}</b>`;
                            } else {
                                html += record.text;
                            }
                        }
                    }
                }
                if (dynamic_data.billing_coding) {
                    html += dynamic_data.billing_coding;
                }
                if (dynamic_data.privacy_information) {
                    html += dynamic_data.privacy_information;
                    html += '<div class="page-break"></div>';
                }
                let bio_data_field = forminstructions.bio_data_field.split(',');
                let aas_form_prog = forminstructions.aas_form_prog.split(',');
                let disease_id = forminstructions.disease_ids.split(',');
                let formcolumnsize = '50%';
                let extrahtmlused =
                    '<td width="50%" style="border:1px solid #000;">&nbsp;</td>';
                let extrahtmluseddiff =
                    '<td width="50%" style="border:1px solid #000;">&nbsp;</td>';
                let extrahtmluseddiffNA =
                    '<td width="50%" style="border:1px solid #000;">&nbsp;</td>';
                if (dynamic_data.optionalsections) {
                    for (let record of dynamic_data.optionalsections) {
                        if (record.selected == 1) {
                            if (record.type == 1) {
                                html += record.text;
                            }
                            if (record.type == 2) {
                                html += record.text;
                                html += `<table width="100%"><tbody><tr>
                                    <td style="width: 75%; border-style: hidden;" width="75%"><h3>${formtypecustombiometric}</h3></td>
                                    <td style="width: 25%; border-style: hidden; text-align: right;" align="right" width="25%"><h4>Patient ID-${user_code}</h4></td>
                                    </tr></tbody></table><table style="line-height:3.3px;" cellspacing="0" cellpadding="10" width="100%">`;
                                if (bio_data_field.includes('1')) {
                                    html += `<tr>
                                        <td width="50%" style="border:1px solid #000;">Height</td>                                        
                                        <td width="50%" style="border:1px solid #000;">&nbsp;</td>
                                    </tr>`;
                                }
                                if (bio_data_field.includes('2')) {
                                    html += `<tr>
                                        <td width="50%" style="border:1px solid #000;">Weight</td>
                                        <td width="50%" style="border:1px solid #000;">&nbsp;</td>
                                    </tr>`;
                                }
                                if (bio_data_field.includes('3')) {
                                    html += `<tr>
                                        <td width="50%" style="border:1px solid #000;">Blood Pressure</td>
                                        <td width="50%" style="border:1px solid #000;">&nbsp;</td>
                                    </tr>`;
                                }
                                if (bio_data_field.includes('4')) {
                                    html += `<tr>
                                        <td width="50%" style="border:1px solid #000;">Total Cholesterol</td>
                                        <td width="50%" style="border:1px solid #000;">&nbsp;</td>
                                    </tr>`;
                                }
                                if (bio_data_field.includes('5')) {
                                    html += `<tr>
                                        <td width="50%" style="border:1px solid #000;">HDL Cholesterol</td>
                                        <td width="50%" style="border:1px solid #000;">&nbsp;</td>
                                    </tr>`;
                                }
                                if (
                                    bio_data_field.includes('7') &&
                                    companyId == 1131
                                ) {
                                    html += `<tr>
                                        <td width="50%" style="border:1px solid #000;">LDL Cholesterol</td>
                                        <td width="50%" style="border:1px solid #000;">&nbsp;</td>
                                    </tr>`;
                                }
                                if (bio_data_field.includes('6')) {
                                    html += `<tr>`;
                                    if (companyId == 1131) {
                                        html += `<td width="50%" style="border:1px solid #000;">Blood Glucose Fasting</td>`;
                                    } else {
                                        html += `<td width="50%" style="border:1px solid #000;">Blood Glucose / A1C</td>`;
                                    }
                                    html += `<td width="50%" style="border:1px solid #000;">&nbsp;</td>
                                    </tr>`;
                                    html += `<tr>
                                        <td width="50%" style="border:1px solid #000;">Fasting or Non-Fasting (random)</td>
                                        <td width="50%" style="border:1px solid #000;">&nbsp;</td>
                                    </tr>`;
                                }
                                if (
                                    bio_data_field.includes('7') &&
                                    companyId != 1131
                                ) {
                                    html += `<tr>
                                        <td width="50%" style="border:1px solid #000;">LDL Cholesterol</td>
                                        <td width="50%" style="border:1px solid #000;">&nbsp;</td>
                                    </tr>`;
                                }
                                if (bio_data_field.includes('8')) {
                                    html += `<tr>
                                        <td width="50%" style="border:1px solid #000;">Triglycerides</td>
                                        <td width="50%" style="border:1px solid #000;">&nbsp;</td>
                                    </tr>`;
                                }
                                if (bio_data_field.includes('10')) {
                                    html += `<tr>
                                        <td width="50%" style="border:1px solid #000;">Waist Circumference</td>
                                        <td width="50%" style="border:1px solid #000;">&nbsp;</td>
                                    </tr>`;
                                }
                                if (bio_data_field.includes('9')) {
                                    html += `<tr>
                                    <td rowspan="2" width="22%" style="border:1px solid #000;">
                                    Cotinine Testing
                                    </td>
                                    <td width="39%" style="border:1px solid #000;" colspan="3">Cotinine Testing Method (check one):<br><br><img alt="logo" width="10" height="10" src="img/checkbox.png">&nbsp;&nbsp;Saliva&ensp;&ensp;&ensp;&ensp;&ensp;<img alt="logo" width="10" height="10" src="img/checkbox.png">&nbsp;&nbsp;Blood&ensp;&ensp;&ensp;&ensp;&ensp;<img alt="logo" width="10" height="10" src="img/checkbox.png">&nbsp;&nbsp;Urine</td><td width="39%" style="border:1px solid #000;">Date Obtained: </td>
                                    </tr><tr><td width="39%" style="border:1px solid #000;">Qualitative Results (Check one):<br><br><img alt="logo" width="10" height="10" src="img/checkbox.png">&nbsp;&nbsp;Positive&ensp;&ensp;&ensp;&ensp;&ensp;<img alt="logo" width="10" height="10" src="img/checkbox.png">&nbsp;&nbsp;Negative&ensp;&ensp;&ensp;&ensp;&ensp;</td><td width="39%" style="border:1px solid #000;">Quantitative Results: <br><br>Value (ng/ml):</td></tr>`;
                                }
                                html += `</table>`;
                                html += '<div class="page-break"></div>';
                            }
                            if (
                                record.type == 3 &&
                                this.commonDateService.getTodayDate().unix() >=
                                    this.commonDateService
                                        .getTodayDate(users.dob)
                                        .add(19, 'years')
                                        .unix()
                            ) {
                                html += record.text;
                                html += `<table cellspacing="0" cellpadding="9" width="100%">`;
                                for (let care_list of preventative_care_list) {
                                    if (
                                        aas_form_prog.includes(
                                            care_list.age_activity_id.toString(),
                                        )
                                    ) {
                                        let minAge =
                                            care_list.min_age != 0
                                                ? this.commonDateService
                                                      .getTodayDate(users.dob)
                                                      .add(
                                                          care_list.min_age,
                                                          'years',
                                                      )
                                                      .unix()
                                                : 0;
                                        let maxAge =
                                            care_list.max_age != 0
                                                ? this.commonDateService
                                                      .getTodayDate(users.dob)
                                                      .add(
                                                          care_list.max_age,
                                                          'years',
                                                      )
                                                      .unix()
                                                : 0;
                                        if (
                                            (minAge == 0 ||
                                                this.commonDateService
                                                    .getTodayDate()
                                                    .unix() >= minAge) &&
                                            (maxAge == 0 ||
                                                this.commonDateService
                                                    .getTodayDate()
                                                    .unix() < maxAge) &&
                                            (!care_list.gender ||
                                                ['o', users.gender].includes(
                                                    care_list?.gender,
                                                ))
                                        ) {
                                            html += `<tr>
                                            <td width="${formcolumnsize}" style="border:1px solid #000;">${care_list.title}</td>
                                            ${care_list.extrahtmlused == 1 ? extrahtmlused : care_list.extrahtmlused == 2 ? extrahtmluseddiff : extrahtmluseddiffNA}
                                            </tr>`;
                                        }
                                    }
                                }
                                html += `</table>`;
                                html += '<div class="page-break"></div>';
                                if (
                                    aas_form_prog.includes('81') ||
                                    aas_form_prog.includes('82') ||
                                    aas_form_prog.includes('83')
                                ) {
                                    html += dynamic_data.phq_text;
                                    html += '<div class="page-break"></div>';
                                }
                                if (
                                    aas_form_prog.includes('85') ||
                                    aas_form_prog.includes('86') ||
                                    aas_form_prog.includes('87')
                                ) {
                                    html += dynamic_data.gad_text;
                                    html += '<div class="page-break"></div>';
                                }
                            }
                            if (record.type == 4) {
                                html += record.text;
                                html += '<div class="page-break"></div>';
                            }
                            if (
                                record.type == 5 &&
                                disease_id?.length > 0 &&
                                diseases_list?.length > 0
                            ) {
                                html += record.text;
                                html += `<table cellspacing="0" cellpadding="9" width="100%">`;
                                for (let dis_list of diseases_list) {
                                    if (
                                        disease_id.includes(
                                            dis_list.id.toString(),
                                        )
                                    ) {
                                        html += `<tr>
                                            <td width="50%" style="border:1px solid #000;">${dis_list.title}</td>
                                            <td width="50%" style="border:1px solid #000;text-align:center;"><img width="8" height="8" src="${S3_URL}comn/assets/img/unchecked.png"></td>
                                        </tr>`;
                                    }
                                }
                                html += `</table>`;
                                html += '<div class="page-break"></div>';
                            }
                        }
                    }
                }
                if (dynamic_data.patient_health_information) {
                    html += dynamic_data.patient_health_information;
                }
                const context = {
                    year: year,
                    company_name: companyname,
                    complogo: complogo,
                    custom_form_title: formtypecustom,
                    formtypefirstdata: formtypefirstdata,
                    formtypesecondtdata: formtypesecondtdata,
                    formtypetobaccodata: formtypetobaccodata,
                    formtypeagegenderdata: formtypeagegenderdata,
                    signature: signature,
                    date_completed: date_completed,
                    start_date: start_date,
                    end_date: end_date,
                    fax_date: fax_date,
                    fax_text: fax_text,
                    faxed_text: faxed_text,
                    fax_number: formfaxno,
                    user_code: user_code,
                    employeeid: employeeid,
                    user_wphone: user_wphone,
                    user_email: user_email,
                    uname: uname,
                    department: department,
                    location_name: location_name,
                    link: link,
                    link2: link2,
                    server_url: SERVER_URL,
                };
                if (footer_text) {
                    let dataFileRead = this.cacheService.getCache(
                        `complogo/${companyId}`,
                    );
                    if (!dataFileRead) {
                        dataFileRead = await this.getImageAsBase64(complogo);
                        this.cacheService.setCache(
                            `complogo/${companyId}`,
                            JSON.stringify(dataFileRead),
                            60000,
                        );
                    }
                    footer_text = await this.footer_replace_text(
                        footer_text,
                        dataFileRead,
                    );
                }
                if (status == 'preview') {
                    let pdf = await this.createPDF(
                        html,
                        header_text,
                        footer_text,
                        physician_filename,
                        status,
                    );
                    return { file_name: physician_filename, pdf: pdf };
                }
                header_text = header_text
                    .replace(/\[/g, '{{')
                    .replace(/\]/g, '}}');
                footer_text = footer_text
                    .replace(/\[/g, '{{')
                    .replace(/\]/g, '}}');
                html = html.replace(/\[/g, '{{').replace(/\]/g, '}}');
                const header_text_compiled = Handlebars.compile(header_text);
                const footer_text_compiled = Handlebars.compile(footer_text);
                const compiledTemplate = Handlebars.compile(html);
                const new_html = compiledTemplate(context);
                const header = header_text_compiled(context);
                const footer = footer_text_compiled(context);
                if (status == 'open') {
                    let pdf = await this.createPDF(
                        new_html,
                        header,
                        footer,
                        physician_filename,
                        status,
                    );
                    return { file_name: physician_filename, pdf: pdf };
                }
                let savepath = `uploads/tmp_physician_forms/`;
                if (foldername != '') {
                    const fullPath = path.join(savepath, foldername);
                    if (!fs.existsSync(fullPath)) {
                        fs.mkdirSync(fullPath, {
                            mode: 0o777,
                            recursive: true,
                        });
                    }
                    savepath = path.join(savepath, foldername, '/');
                } else {
                    const fullPath = path.join(savepath);
                    if (!fs.existsSync(fullPath)) {
                        fs.mkdirSync(fullPath, {
                            mode: 0o777,
                            recursive: true,
                        });
                    }
                }
                const outputPath = path.join(savepath, physician_filename);
                if (status == 'save' || status == 'EmailPdf') {
                    let pdf = await this.createPDF(
                        new_html,
                        header,
                        footer,
                        outputPath,
                        status,
                    );
                    if (filefilter == 'zipRequest') {
                        return {
                            filename: physician_filename,
                            path: outputPath,
                        };
                    }
                    if (status == 'EmailPdf') {
                        const temp_path = path.join(
                            'tmp_physician_forms',
                            physician_filename,
                        );
                        return {
                            filename: physician_filename,
                            path: path.resolve(outputPath),
                            temp_path: temp_path,
                        };
                    }
                }
            }
            return true;
        } catch (error) {
            console.error('Error in getGeneratepdf:', error);
            throw new Error(error);
        }
    }
    async getGeneratepdf_dvf(
        company: any = null,
        users: any = null,
        Authorizationdvf: any = null,
        forminstructions: any = null,
        status: any = null,
        foldername: any = '',
        filefilter = null,
        stdt = null,
        endt = null,
    ) {
        try {
            const pos = foldername.indexOf('+');
            if (pos !== -1) {
                foldername = foldername.replace(/\+/g, '/');
            }
            let dynamic_data = forminstructions.Dentist;
            let dentist_info;
            let startDate, endDate;
            if (stdt && endt) {
                startDate = this.commonDateService.getTodayDate(stdt).unix();
                endDate = this.commonDateService.getTodayDate(endt).unix();
            } else {
                startDate = this.commonDateService
                    .getTodayDate(forminstructions.dvf_start_date)
                    .unix();
                endDate = this.commonDateService
                    .getTodayDate(forminstructions.dvf_end_date)
                    .unix();
            }
            let dvf='',
                dentist_name = '',
                dentist_wphone = '',
                dentist_email = '',
                dentist_signature = '',
                date1 = '',
                date2 = '',
                dentures = '';
            let id = users.id;
            let users_dental = await this.readReplicaDentistsRepository.findBy({
                userid: id,
            });
            if (users_dental.length > 0) {
                if (users_dental[0].date_completed) {
                    let date_1 = this.commonDateService
                        .getTodayDate(users_dental[0].date_completed)
                        .unix();
                    if (date_1 >= startDate && date_1 <= endDate) {
                        date1 = this.commonDateService
                            .getTodayDate(users_dental[0].date_completed)
                            .format('MM-DD-YYYY');
                    }
                }
                if (users_dental[1]?.date_completed) {
                    let date_2 = this.commonDateService
                        .getTodayDate(users_dental[1].date_completed)
                        .unix();
                    if (date_2 >= startDate && date_2 <= endDate) {
                        date2 = this.commonDateService
                            .getTodayDate(users_dental[1].date_completed)
                            .format('MM-DD-YYYY');
                    }
                }
                if (
                    users_dental.length &&
                    users_dental[0].physician_id &&
                    users_dental[0].physician_id !== 0
                ) {
                    dentist_info = await this.readReplicaUserRepository
                        .createQueryBuilder('user')
                        .leftJoinAndMapOne(
                            'user.user_settings',
                            tableConstant.TBL_USERS_SETTINGS,
                            'user_settings',
                            `user_settings.user_id = user.id`,
                        )
                        .where(`user.id = ${users_dental[0].physician_id}`)
                        .select(['user', 'user_settings'])
                        .getOne();
                }
            }
            if (dentist_info) {
                dentist_name = dentist_info['user'] ? dentist_info['user'].full_name : (dentist_info.full_name || '');
                dentist_wphone = dentist_info['user_settings'] ? dentist_info['user_settings'].wphone : (dentist_info.wphone || '');
                dentist_email = dentist_info['user'] ? dentist_info['user'].email : (dentist_info.email || '');
                dentist_signature = dentist_info['user_settings'] ? dentist_info['user_settings'].dentist_signature : (dentist_info.dentist_signature || '');
            } else {
                dentist_info =
                    await this.readReplicaPhysicianTempsRepository.findOneBy({
                        user_id: id,
                    });
                if (dentist_info) {
                    dentist_name =
                        (dentist_info.first_name || '') + ' ' + (dentist_info.last_name || '');
                    dentist_wphone = dentist_info.wphone || '';
                    dentist_email = dentist_info.email || '';
                    dentist_signature = dentist_info.dentist_signature || '';
                }
            }
            if (forminstructions.yearly_opts == 2) {
                dentist_name = dentist_name;
                dentist_wphone = dentist_wphone;
                dentist_email = dentist_email;
                dentist_signature = dentist_signature;
                date1 = date1;
                dvf = dynamic_data.dentist_one_text;
            } else if (forminstructions.yearly_opts == 1) {
                dentist_name = dentist_name;
                dentist_wphone = dentist_wphone;
                dentist_email = dentist_email;
                dentist_signature = dentist_signature;
                if (date1 == '' && date2 != '') {
                    date1 = date2;
                    date2 = '';
                }
                dvf = dynamic_data.dentist_two_text;
            }
            let complogo = '';
            if (forminstructions.is_logo == 1) {
                if (company?.company_logo != '') {
                    complogo = `${S3_URL}companylogos/${company.id}/orginallogo/${company.company_logo}`;
                } else {
                    complogo = `${S3_URL}comn/img/zomo-health-logo-dark.png`;
                }
            }
            let companyname = company.company_name;
            let companyId = company.id;
            let currentDate = this.commonDateService
                .getTodayDate()
                .format('MM-DD-YYYY');
            let year = this.commonDateService.getTodayDate().format('YYYY');
            if (forminstructions.forms_year == 2) {
                year = this.commonDateService
                    .getTodayDate()
                    .add(1, 'year')
                    .format('YYYY');
            } else if (forminstructions.forms_year == 3) {
                year =
                    year +
                    ' / ' +
                    this.commonDateService
                        .getTodayDate()
                        .add(1, 'year')
                        .format('YYYY');
            }
            let formtypecustom = 'DENTAL VISIT PACKET';
            if (
                forminstructions?.program_custom_name &&
                forminstructions?.program_custom_name != ''
            ) {
                let program_custom_name = JSON.parse(
                    forminstructions.program_custom_name,
                );
                if (program_custom_name?.[2] && program_custom_name[2] != '') {
                    formtypecustom = program_custom_name[2];
                }
            }
            if (company.companySetting.wellnessprog_name != '') {
                let formtext =
                    company.companySetting.wellnessprog_name.toUpperCase();
            }
            let formfaxno = '713-714-2273';
            if (forminstructions?.fax_number != '') {
                formfaxno = forminstructions.fax_number;
            }
            let submition_option = [0];
            if (!forminstructions.submition_option) {
                submition_option = forminstructions.submition_option.split(',');
            }
            let fax_text = ' return to the patient for submission';
            if (submition_option.includes(2)) {
                fax_text = `fax the forms to ${formfaxno}`;
            }
            let uname = users.first_name + ' ' + users.last_name;
            let name = users.last_name + ' ' + users.first_name;
            let department = users?.department?.dept_name;
            let location,
                location_name = '';
            if (users?.location) {
                location = '_' + users?.location;
                location_name = users?.location?.location_name;
            }
            let user_code = users.code;
            let user_email = users.email;
            let user_wphone = users.wphone;
            let employeeid = users.employeeid;
            let SERVER_URL = 'https://' + process.env.DOMAIN + '/';
            let link = SERVER_URL + 'physicians/add';
            let link2 = SERVER_URL + 'user/user/user_forms';
            const dentist_filename =
                (
                    name +
                    '_' +
                    user_code +
                    '_' +
                    companyname +
                    '_' +
                    department +
                    '_Dentist_Forms_' +
                    currentDate
                ).replace(/[^A-Za-z0-9\-]/g, '_') + '.pdf';
            let start_date, end_date, fax_date;
            if (stdt && endt) {
                let diff = 0;
                start_date = this.commonDateService
                    .getTodayDate(stdt)
                    .format('MM-DD-YYYY');
                end_date = this.commonDateService
                    .getTodayDate(endt)
                    .format('MM-DD-YYYY');
                if (forminstructions.date_range === 2) {
                    diff = Math.abs(
                        this.commonDateService
                            .getTodayDate(forminstructions.fax_date)
                            .diff(
                                this.commonDateService.getTodayDate(
                                    forminstructions.end_date,
                                ),
                                'days',
                            ),
                    );
                } else {
                    if (
                        forminstructions.dvf_fax_date !== '0000-00-00 00:00:00'
                    ) {
                        diff = Math.abs(
                            this.commonDateService
                                .getTodayDate(forminstructions.dvf_fax_date)
                                .diff(
                                    this.commonDateService.getTodayDate(
                                        forminstructions.dvf_end_date,
                                    ),
                                    'days',
                                ),
                        );
                    }
                }
                fax_date = this.commonDateService
                    .getTodayDate(endt)
                    .add(diff, 'days')
                    .format('MM-DD-YYYY');
            } else {
                if (forminstructions['date_range'] == 2) {
                    start_date = this.commonDateService
                        .getTodayDate(forminstructions.start_date)
                        .format('MM-DD-YYYY');
                    end_date = this.commonDateService
                        .getTodayDate(forminstructions.end_date)
                        .format('MM-DD-YYYY');
                    fax_date = this.commonDateService
                        .getTodayDate(forminstructions.fax_date)
                        .format('MM-DD-YYYY');
                } else {
                    start_date = this.commonDateService
                        .getTodayDate(forminstructions.dvf_start_date)
                        .format('MM-DD-YYYY');
                    end_date = this.commonDateService
                        .getTodayDate(forminstructions.dvf_end_date)
                        .format('MM-DD-YYYY');
                    fax_date = this.commonDateService
                        .getTodayDate(forminstructions.dvf_fax_date)
                        .format('MM-DD-YYYY');
                }
            }
            let signature,
                date_completed = '';
            if (Authorizationdvf) {
                signature = Authorizationdvf.signature;
                date_completed = this.commonDateService
                    .getTodayDate(Authorizationdvf.date_completed)
                    .format('MM-DD-YYYY');
            }
            let html = '';
            let header_text = dynamic_data.header_text;
            let footer_text = dynamic_data.footer_text;
            if (foldername && foldername != '' && status != 'EmailPdf') {
                html += dynamic_data.identification_cover;
                html += '<div class="page-break"></div>';
            }
            if (
                forminstructions.dentists_text &&
                forminstructions?.dentists_text != ''
            ) {
                html += forminstructions.dentists_text;
                html += '<div class="page-break"></div>';
            }
            if (dynamic_data.patient_information) {
                html += dynamic_data.patient_information;
            }
            if (dynamic_data.datatransmission) {
                for (let record of dynamic_data.datatransmission) {
                    if (record.selected == 1) {
                        if (record.type == 4 || record.type == 5) {
                            html += `</n><b>${record.text}</b>`;
                        } else {
                            html += record.text;
                        }
                    }
                }
            }
            if (dynamic_data.billing_coding) {
                html += dynamic_data.billing_coding;
            }
            if (dynamic_data.privacy_information) {
                html += dynamic_data.privacy_information;
            }
            if (dynamic_data?.patient_data_form) {
                if (forminstructions.dentures == 1) {
                    dentures = `<br><br><img alt="logo" width="10" height="10" src="${S3_URL}comn/assets/img/unchecked.png">&nbsp;&nbsp;Please check here if the patient wears dentures.<br><br>`;
                }
                html += '<div class="page-break"></div>';
                html += await this.commonFileService.replacePlaceholders(
                    dynamic_data.patient_data_form,
                    { dentures, dvf, user_code },
                );
            }
            if (dynamic_data?.patient_health_information) {
                html += '<div class="page-break"></div>';
                html += dynamic_data.patient_health_information;
            }
            const context = {
                year: year,
                company_name: companyname,
                custom_form_title: formtypecustom,
                signature: signature,
                date_completed: date_completed,
                start_date: start_date,
                end_date: end_date,
                fax_date: fax_date,
                fax_text: fax_text,
                fax_number: formfaxno,
                user_code: user_code,
                employeeid: employeeid,
                user_wphone: user_wphone,
                user_email: user_email,
                uname: uname,
                department: department,
                location_name: location_name,
                link: link,
                link2: link2,
                server_url: SERVER_URL,
                dentist_name: dentist_name,
                dentist_wphone: dentist_wphone,
                dentist_email: dentist_email,
                dentist_signature: dentist_signature,
                date1: date1,
                date2: date2 ||'',
            };
            // console.log('Context prepared:', JSON.stringify({ ...context, signature: '...', dentist_signature: '...' }));
            if (footer_text) {
                // let dataFileRead = await this.getImageAsBase64(complogo);
                // if(dataFileRead){
                //     footer_text = await this.footer_replace_text(footer_text, dataFileRead);
                // }
                let dataFileRead = this.cacheService.getCache(
                    `complogo/${companyId}`,
                );
                if (!dataFileRead) {
                    dataFileRead = await this.getImageAsBase64(complogo);
                    this.cacheService.setCache(
                        `complogo/${companyId}`,
                        JSON.stringify(dataFileRead),
                        60000,
                    );
                }
                footer_text = await this.footer_replace_text(
                    footer_text,
                    dataFileRead,
                );
            }
            if (status == 'preview') {
                let pdf = await this.createPDF(
                    html,
                    header_text,
                    footer_text,
                    null,
                    status,
                );
                return { file_name: dentist_filename, pdf: pdf };
            }
            header_text = (header_text || '').replace(/\[/g, '{{').replace(/\]/g, '}}');
            footer_text = (footer_text || '').replace(/\[/g, '{{').replace(/\]/g, '}}');
            html = (html || '').replace(/\[/g, '{{').replace(/\]/g, '}}');
            const header_text_compiled = Handlebars.compile(header_text);
            const footer_text_compiled = Handlebars.compile(footer_text);
            const compiledTemplate = Handlebars.compile(html);
            const new_html = compiledTemplate(context);
            const header = header_text_compiled(context);
            const footer = footer_text_compiled(context);
            if (status == 'open') {
                let pdf = await this.createPDF(
                    new_html,
                    header,
                    footer,
                    null,
                    status,
                );
                return { file_name: dentist_filename, pdf: pdf };
            }
            let savepath = `uploads/tmp_dentalvisit_forms/`;
            if (foldername != '') {
                const fullPath = path.join(savepath, foldername);
                if (!fs.existsSync(fullPath)) {
                    fs.mkdirSync(fullPath, { mode: 0o777, recursive: true });
                }
                savepath = path.join(savepath, foldername, '/');
            } else {
                const fullPath = path.join(savepath);
                if (!fs.existsSync(fullPath)) {
                    fs.mkdirSync(fullPath, { mode: 0o777, recursive: true });
                }
            }
            const outputPath = path.join(savepath, dentist_filename);
            if (status == 'save' || status == 'EmailPdf') {
                let pdf = await this.createPDF(
                    new_html,
                    header,
                    footer,
                    outputPath,
                    status,
                );
                if (filefilter == 'zipRequest') {
                    return { filename: dentist_filename, path: outputPath };
                }
                if (status == 'EmailPdf') {
                    const temp_path = path.join(
                        'tmp_dentalvisit_forms',
                        dentist_filename,
                    );
                    return {
                        filename: dentist_filename,
                        path: path.resolve(outputPath),
                        temp_path: temp_path,
                    };
                }
            }
            return true;
        } catch (error) {
            console.error('Error in getGeneratepdf_dvf:', error);
            throw new Error(error);
        }
    }
    async getGeneratepdf_ovf(
        company: any = null,
        users: any = null,
        Authorizationovf: any = null,
        forminstructions: any = null,
        status: any = null,
        foldername: any = '',
        filefilter = null,
        stdt = null,
        endt = null,
    ) {
        try {
            const pos = foldername.indexOf('+');
            if (pos !== -1) {
                foldername = foldername.replace(/\+/g, '/');
            }
            let dynamic_data = forminstructions.Optometrist;
            let complogo = '';
            if (forminstructions.is_logo == 1) {
                if (company?.company_logo != '') {
                    complogo = `${S3_URL}companylogos/${company.id}/orginallogo/${company.company_logo}`;
                } else {
                    complogo = `${S3_URL}comn/img/zomo-health-logo-dark.png`;
                }
            }
            let companyname = company.company_name;
            let companyId = company.id;
            let currentDate = this.commonDateService
                .getTodayDate()
                .format('MM-DD-YYYY');
            let year = this.commonDateService.getTodayDate().format('YYYY');
            if (forminstructions.forms_year == 2) {
                year = this.commonDateService
                    .getTodayDate()
                    .add(1, 'year')
                    .format('YYYY');
            } else if (forminstructions.forms_year == 3) {
                year =
                    year +
                    ' / ' +
                    this.commonDateService
                        .getTodayDate()
                        .add(1, 'year')
                        .format('YYYY');
            }
            let formtypecustom = 'OPTOMETRIST / OPHTHALMOLOGIST VISIT PACKET';
            if (
                forminstructions?.program_custom_name &&
                forminstructions?.program_custom_name != ''
            ) {
                let program_custom_name = JSON.parse(
                    forminstructions.program_custom_name,
                );
                if (program_custom_name?.[3] && program_custom_name[3] != '') {
                    formtypecustom = program_custom_name[3];
                }
            }
            if (company.companySetting.wellnessprog_name != '') {
                let formtext =
                    company.companySetting.wellnessprog_name.toUpperCase();
            }
            let formfaxno = '713-714-2273';
            if (forminstructions?.fax_number != '') {
                formfaxno = forminstructions.fax_number;
            }
            let submition_option = [0];
            if (!forminstructions.submition_option) {
                submition_option = forminstructions.submition_option.split(',');
            }
            let fax_text = ' return to the patient for submission';
            if (submition_option.includes(2)) {
                fax_text = `fax the forms to ${formfaxno}`;
            }
            let user_id = users.id;
            let uname = users.first_name + ' ' + users.last_name;
            let name = users.last_name + ' ' + users.first_name;
            let department = users?.department?.dept_name;
            let location,
                location_name = '';
            if (users?.location) {
                location = '_' + users?.location;
                location_name = users?.location?.location_name;
            }
            let user_code = users.code;
            let user_email = users.email;
            let user_wphone = users.wphone;
            let employeeid = users.employeeid;
            let SERVER_URL = 'https://' + process.env.DOMAIN + '/';
            let link = SERVER_URL + 'physicians/add';
            let link2 = SERVER_URL + 'user/user/user_forms';
            const optometrist_filename =
                (
                    name +
                    '_' +
                    user_code +
                    '_' +
                    companyname +
                    '_' +
                    department +
                    '_Optometrist_Forms_' +
                    currentDate
                ).replace(/[^A-Za-z0-9\-]/g, '_') + '.pdf';
            let start_date, end_date, fax_date;
            if (stdt && endt) {
                let diff = 0;
                start_date = this.commonDateService
                    .getTodayDate(stdt)
                    .format('MM-DD-YYYY');
                end_date = this.commonDateService
                    .getTodayDate(endt)
                    .format('MM-DD-YYYY');
                if (forminstructions.date_range === 2) {
                    diff = Math.abs(
                        this.commonDateService
                            .getTodayDate(forminstructions.fax_date)
                            .diff(
                                this.commonDateService.getTodayDate(
                                    forminstructions.end_date,
                                ),
                                'days',
                            ),
                    );
                } else {
                    if (
                        forminstructions.ovf_fax_date !== '0000-00-00 00:00:00'
                    ) {
                        diff = Math.abs(
                            this.commonDateService
                                .getTodayDate(forminstructions.ovf_fax_date)
                                .diff(
                                    this.commonDateService.getTodayDate(
                                        forminstructions.ovf_end_date,
                                    ),
                                    'days',
                                ),
                        );
                    }
                }
                fax_date = this.commonDateService
                    .getTodayDate(endt)
                    .add(diff, 'days')
                    .format('MM-DD-YYYY');
            } else {
                if (forminstructions['date_range'] == 2) {
                    start_date = this.commonDateService
                        .getTodayDate(forminstructions.start_date)
                        .format('MM-DD-YYYY');
                    end_date = this.commonDateService
                        .getTodayDate(forminstructions.end_date)
                        .format('MM-DD-YYYY');
                    fax_date = this.commonDateService
                        .getTodayDate(forminstructions.fax_date)
                        .format('MM-DD-YYYY');
                } else {
                    start_date = this.commonDateService
                        .getTodayDate(forminstructions.ovf_start_date)
                        .format('MM-DD-YYYY');
                    end_date = this.commonDateService
                        .getTodayDate(forminstructions.ovf_end_date)
                        .format('MM-DD-YYYY');
                    fax_date = this.commonDateService
                        .getTodayDate(forminstructions.ovf_fax_date)
                        .format('MM-DD-YYYY');
                }
            }
            let signature = '';
            let completiondate = '';
            if (Authorizationovf) {
                signature = Authorizationovf.signature;
                completiondate = this.commonDateService.DateTimeFormat(Authorizationovf.date_completed, 'MM-DD-YYYY');
                // console.log(' [OPTOMETRIST DEBUG] Authorizationovf found:', {
                //     date_completed: Authorizationovf.date_completed,
                //     completiondate: completiondate
                // });
            } else {
                // console.log(' [OPTOMETRIST DEBUG] Authorizationovf is NULL or EMPTY');
            }
            let html = '';
            let header_text = dynamic_data.header_text;
            let footer_text = dynamic_data.footer_text;
            if (foldername && foldername != '' && status != 'EmailPdf') {
                html += dynamic_data.identification_cover;
                html += '<div class="page-break"></div>';
            }
            if (
                forminstructions.optometrists_text &&
                forminstructions?.optometrists_text != ''
            ) {
                html += forminstructions.optometrists_text;
                html += '<div class="page-break"></div>';
            }
            if (dynamic_data.patient_information) {
                html += dynamic_data.patient_information;
            }
            if (dynamic_data.datatransmission) {
                for (let record of dynamic_data.datatransmission) {
                    if (record.selected == 1) {
                        if (record.type == 4 || record.type == 5) {
                            html += `</n><b>${record.text}</b>`;
                        } else {
                            html += record.text;
                        }
                    }
                }
            }
            if (dynamic_data.billing_coding) {
                html += dynamic_data.billing_coding;
            }
            if (dynamic_data.privacy_information) {
                html += dynamic_data.privacy_information;
            }
            if (dynamic_data?.patient_data_form) {
                html += '<div class="page-break"></div>';
                html += dynamic_data.patient_data_form;
            }
            if (dynamic_data?.patient_health_information) {
                html += '<div class="page-break"></div>';
                html += dynamic_data.patient_health_information;
            }
            const context = {
                year: year,
                company_name: companyname,
                custom_form_title: formtypecustom,
                signature: signature,
                start_date: start_date,
                end_date: end_date,
                fax_date: fax_date,
                fax_text: fax_text,
                fax_number: formfaxno,
                user_code: user_code,
                employeeid: employeeid,
                user_wphone: user_wphone,
                user_email: user_email,
                uname: uname,
                department: department,
                location_name: location_name,
                link: link,
                link2: link2,
                server_url: SERVER_URL,
                cdate: completiondate
            };
            if (footer_text) {
                let dataFileRead = await this.getImageAsBase64(complogo);
                if (dataFileRead) {
                    footer_text = await this.footer_replace_text(
                        footer_text,
                        dataFileRead,
                    );
                }
            }
            if (status == 'preview') {
                let pdf = await this.createPDF(
                    html,
                    header_text,
                    footer_text,
                    null,
                    status,
                );
                return { file_name: optometrist_filename, pdf: pdf };
            }
            header_text = header_text.replace(/\[/g, '{{').replace(/\]/g, '}}');
            footer_text = footer_text.replace(/\[/g, '{{').replace(/\]/g, '}}');
            html = html.replace(/\[/g, '{{').replace(/\]/g, '}}');

            // FIX: Inject date into form body if missing (Dynamic workaround)
            if (!html.includes('{{cdate}}') && html.includes('Completed Date:')) {
                html = html.replace('Completed Date:', 'Completed Date: {{cdate}}');
                // console.log('✅ [OPTOMETRIST FIX] Injected date into HTML body (Completed Date field)');
            }

            const header_text_compiled = Handlebars.compile(header_text);
            const footer_text_compiled = Handlebars.compile(footer_text);
            const compiledTemplate = Handlebars.compile(html);
            const new_html = compiledTemplate(context);
            const header = header_text_compiled(context);
            const footer = footer_text_compiled(context);
            if (status == 'open') {
                let pdf = await this.createPDF(
                    new_html,
                    header,
                    footer,
                    null,
                    status,
                );
                return { file_name: optometrist_filename, pdf: pdf };
            }
            let savepath = `uploads/tmp_optometristvisit_forms/`;
            if (foldername != '') {
                const fullPath = path.join(savepath, foldername);
                if (!fs.existsSync(fullPath)) {
                    fs.mkdirSync(fullPath, { mode: 0o777, recursive: true });
                }
                savepath = path.join(savepath, foldername, '/');
            } else {
                const fullPath = path.join(savepath);
                if (!fs.existsSync(fullPath)) {
                    fs.mkdirSync(fullPath, { mode: 0o777, recursive: true });
                }
            }
            const outputPath = path.join(savepath, optometrist_filename);
            if (status == 'save' || status == 'EmailPdf') {
                let pdf = await this.createPDF(
                    new_html,
                    header,
                    footer,
                    outputPath,
                    status,
                );
                if (filefilter == 'zipRequest') {
                    return { filename: optometrist_filename, path: outputPath };
                }
                if (status == 'EmailPdf') {
                    const temp_path = path.join(
                        'tmp_optometristvisit_forms',
                        optometrist_filename,
                    );
                    return {
                        filename: optometrist_filename,
                        path: path.resolve(outputPath),
                        temp_path: temp_path,
                    };
                }
            }
            return true;
        } catch (error) {
            console.error('Error in getGeneratepdf_ovf:', error);
            throw new Error(error);
        }
    }
    async getGeneratepdf_ta(
        company: any = null,
        users: any = null,
        Authorizationta: any = null,
        forminstructions: any = null,
        status: any = null,
        foldername: any = '',
        filefilter = null,
        stdt = null,
        endt = null,
    ) {
        try {
            const pos = foldername.indexOf('+');
            if (pos !== -1) {
                foldername = foldername.replace(/\+/g, '/');
            }
            let dynamic_data = forminstructions.Tobacco;
            let complogo = '';
            if (forminstructions.is_logo == 1) {
                if (company?.company_logo != '') {
                    complogo = `${S3_URL}companylogos/${company.id}/orginallogo/${company.company_logo}`;
                } else {
                    complogo = `${S3_URL}comn/img/zomo-health-logo-dark.png`;
                }
            }
            let companyname = company.company_name;
            let companyId = company.id;
            let currentDate = this.commonDateService
                .getTodayDate()
                .format('MM-DD-YYYY');
            let year = this.commonDateService.getTodayDate().format('YYYY');
            if (forminstructions.forms_year == 2) {
                year = this.commonDateService
                    .getTodayDate()
                    .add(1, 'year')
                    .format('YYYY');
            } else if (forminstructions.forms_year == 3) {
                year =
                    year +
                    ' / ' +
                    this.commonDateService
                        .getTodayDate()
                        .add(1, 'year')
                        .format('YYYY');
            }
            let formtypecustom = 'TOBACCO AFFIDAVIT';
            if (
                forminstructions?.program_custom_name &&
                forminstructions?.program_custom_name != ''
            ) {
                let program_custom_name = JSON.parse(
                    forminstructions.program_custom_name,
                );
                if (program_custom_name?.[4] && program_custom_name[4] != '') {
                    formtypecustom = program_custom_name[4];
                }
            }
            if (company.companySetting.wellnessprog_name != '') {
                let formtext =
                    company.companySetting.wellnessprog_name.toUpperCase();
            }
            let uname = users.first_name + ' ' + users.last_name;
            let name = users.last_name + ' ' + users.first_name;
            let department = users?.department?.dept_name;
            let location,
                location_name = '';
            if (users?.location) {
                location = '_' + users?.location;
                location_name = users?.location?.location_name;
            }
            let user_code = users.code;
            let user_email = users.email;
            let user_wphone = users.wphone;
            let employeeid = users.employeeid;
            let SERVER_URL = 'https://' + process.env.DOMAIN + '/';
            let link = SERVER_URL + 'physicians/add';
            const tobacco_filename =
                (
                    name +
                    '_' +
                    user_code +
                    '_' +
                    companyname +
                    '_' +
                    department +
                    '_TobaccoAffidavit_Forms_' +
                    currentDate
                ).replace(/[^A-Za-z0-9\-]/g, '_') + '.pdf';
            let start_date, end_date, fax_date;
            if (stdt && endt) {
                let diff = 0;
                start_date = this.commonDateService
                    .getTodayDate(stdt)
                    .format('MM-DD-YYYY');
                end_date = this.commonDateService
                    .getTodayDate(endt)
                    .format('MM-DD-YYYY');
                if (forminstructions.date_range === 2) {
                    diff = Math.abs(
                        this.commonDateService
                            .getTodayDate(forminstructions.fax_date)
                            .diff(
                                this.commonDateService.getTodayDate(
                                    forminstructions.end_date,
                                ),
                                'days',
                            ),
                    );
                } else {
                    if (
                        forminstructions.ta_fax_date !== '0000-00-00 00:00:00'
                    ) {
                        diff = Math.abs(
                            this.commonDateService
                                .getTodayDate(forminstructions.ta_fax_date)
                                .diff(
                                    this.commonDateService.getTodayDate(
                                        forminstructions.ta_end_date,
                                    ),
                                    'days',
                                ),
                        );
                    }
                }
                fax_date = this.commonDateService
                    .getTodayDate(endt)
                    .add(diff, 'days')
                    .format('MM-DD-YYYY');
            } else {
                if (forminstructions['date_range'] == 2) {
                    start_date = this.commonDateService
                        .getTodayDate(forminstructions.start_date)
                        .format('MM-DD-YYYY');
                    end_date = this.commonDateService
                        .getTodayDate(forminstructions.end_date)
                        .format('MM-DD-YYYY');
                    fax_date = this.commonDateService
                        .getTodayDate(forminstructions.fax_date)
                        .format('MM-DD-YYYY');
                } else {
                    start_date = this.commonDateService
                        .getTodayDate(forminstructions.ta_start_date)
                        .format('MM-DD-YYYY');
                    end_date = this.commonDateService
                        .getTodayDate(forminstructions.ta_end_date)
                        .format('MM-DD-YYYY');
                    fax_date = this.commonDateService
                        .getTodayDate(forminstructions.ta_fax_date)
                        .format('MM-DD-YYYY');
                }
            }
            let submition_option = [0];
            if (forminstructions?.submition_option) {
                submition_option = forminstructions.submition_option.split(',');
            }
            let fax_text = ' return to the patient for submission ';
            if (submition_option.map(Number).includes(2)) {
                fax_text =
                    ' fax this completed Tobacco Affidavit form to 713-714-2273 ';
            }
            let signature,
                date_completed,
                is_tobacco_user = '';
            if (Authorizationta) {
                let tobaccoCompleted = Authorizationta.date_completed;
                if (
                    tobaccoCompleted == '' ||
                    this.commonDateService
                        .getTodayDate(tobaccoCompleted)
                        .unix() <
                        this.commonDateService
                            .getTodayDate(start_date)
                            .unix() ||
                    this.commonDateService
                        .getTodayDate(tobaccoCompleted)
                        .unix() >
                        this.commonDateService.getTodayDate(end_date).unix()
                ) {
                    signature = '';
                    date_completed = '';
                    is_tobacco_user = '';
                } else {
                    signature = Authorizationta.signature;
                    date_completed = this.commonDateService
                        .getTodayDate(Authorizationta.date_completed)
                        .format('MM-DD-YYYY');
                    is_tobacco_user = Authorizationta.is_tobacco_user;
                }
            }
            let html = '';
            let header_text = dynamic_data.header_text;
            let footer_text = dynamic_data.footer_text;
            if (foldername && foldername != '' && status != 'EmailPdf') {
                html += dynamic_data.identification_cover;
                html += '<div class="page-break"></div>';
            }
            if (
                forminstructions.tobacco_text &&
                forminstructions?.tobacco_text != ''
            ) {
                html += forminstructions.tobacco_text;
                html += '<div class="page-break"></div>';
            }
            if (dynamic_data.fax_text_date) {
                html += dynamic_data.fax_text_date;
            }
            if (forminstructions?.tobacco_para1) {
                html += forminstructions.tobacco_para1;
            }
            if (Number(is_tobacco_user) == 1) {
                html +=
                    '<p>I Hereby Certify That I Am A : Non-tobacco user</p>';
            } else if (Number(is_tobacco_user) == 2) {
                html += '<p>I Hereby Certify That I Am A : Tobacco user</p>';
            } else if (Number(is_tobacco_user) == 3) {
                html +=
                    '<p>I Hereby Certify That I Am A : Tobacco user planning on participating in a tobacco cessation program</p>';
            } else {
                if (dynamic_data?.patient_data_form) {
                    let cessation = '';
                    if (forminstructions?.tobacco_cessation_text) {
                        cessation = forminstructions.tobacco_cessation_text;
                        html += '<div class="page-break"></div>';
                    }
                    html += await this.commonFileService.replacePlaceholders(
                        dynamic_data.patient_data_form,
                        { cessation },
                    );
                }
            }
            if (dynamic_data?.patient_health_information) {
                // html += '<div class="page-break"></div>';
                html += dynamic_data.patient_health_information;
            }
            const context = {
                year: year,
                company_name: companyname,
                custom_form_title: formtypecustom,
                signature: signature,
                date_completed: date_completed,
                start_date: start_date,
                end_date: end_date,
                fax_date: fax_date,
                fax_text: fax_text,
                user_code: user_code,
                employeeid: employeeid,
                user_wphone: user_wphone,
                user_email: user_email,
                uname: uname,
                department: department,
                location_name: location_name,
                link: link,
            };
            if (footer_text) {
                let dataFileRead = await this.getImageAsBase64(complogo);
                if (dataFileRead) {
                    footer_text = await this.footer_replace_text(
                        footer_text,
                        dataFileRead,
                    );
                }
            }
            if (status == 'preview') {
                let pdf = await this.createPDF(
                    html,
                    header_text,
                    footer_text,
                    null,
                    status,
                );
                return { file_name: tobacco_filename, pdf: pdf };
            }
            header_text = header_text.replace(/\[/g, '{{').replace(/\]/g, '}}');
            footer_text = footer_text.replace(/\[/g, '{{').replace(/\]/g, '}}');
            html = html.replace(/\[/g, '{{').replace(/\]/g, '}}');
            const header_text_compiled = Handlebars.compile(header_text);
            const footer_text_compiled = Handlebars.compile(footer_text);
            const compiledTemplate = Handlebars.compile(html);
            const new_html = compiledTemplate(context);
            const header = header_text_compiled(context);
            const footer = footer_text_compiled(context);
            if (status == 'open') {
                let pdf = await this.createPDF(
                    new_html,
                    header,
                    footer,
                    null,
                    status,
                );
                return { file_name: tobacco_filename, pdf: pdf };
            }
            let savepath = `uploads/tmp_tobaccoaffidavit_forms/`;
            if (foldername != '') {
                const fullPath = path.join(savepath, foldername);
                if (!fs.existsSync(fullPath)) {
                    fs.mkdirSync(fullPath, { mode: 0o777, recursive: true });
                }
                savepath = path.join(savepath, foldername, '/');
            } else {
                const fullPath = path.join(savepath);
                if (!fs.existsSync(fullPath)) {
                    fs.mkdirSync(fullPath, { mode: 0o777, recursive: true });
                }
            }
            const outputPath = path.join(savepath, tobacco_filename);
            if (status == 'save' || status == 'EmailPdf') {
                let pdf = await this.createPDF(
                    new_html,
                    header,
                    footer,
                    outputPath,
                    status,
                );
                if (filefilter == 'zipRequest') {
                    return { filename: tobacco_filename, path: outputPath };
                }
                if (status == 'EmailPdf') {
                    const temp_path = path.join(
                        'tmp_tobaccoaffidavit_forms',
                        tobacco_filename,
                    );
                    return {
                        filename: tobacco_filename,
                        path: path.resolve(outputPath),
                        temp_path: temp_path,
                    };
                }
            }
            return true;
        } catch (error) {
            console.error('Error in getGeneratepdf_ta:', error);
            throw new Error(error);
        }
    }
    /* Pranay Html-Pdf-Node*/
    async createPDF(
        bodyContent: string,
        headerContent: string,
        footerContent: string,
        outputPath: string,
        status: string,
        options = { pdfOptions: {} },
    ) {
        try {
            // Combine header, body, and footer into one HTML structure
            const htmlContent = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body {
                            font-family: Helvetica, Arial, sans-serif;
                            font-size: 13.5px;
                            line-height: 17px;                            
                        }
                        table {
                            border-collapse: collapse;
                            width: 100%;
                            border-color: #000000;
                        }
                        th, td {
                            border: 1px solid black;
                            padding: 8px;
                            text-align: left;
                        }  
                        .no-border {
                            border: 0 !important;
                        } 
                        .no-border th,.no-border td{
                            border: 0 !important;
                        }                           
                        h1, h4 {
                            color: #333;
                        }                        
                        .page-break {
                            page-break-before: always;
                        }   
                        #header.span {
                            padding: 5px 20px;
                        }    
                        p, b, strong{
                            margin-bottom: 10px !important;
                        }                                       
                    </style>
                </head>
                <body>                
                    <div class="body-content">
                        ${bodyContent}
                    </div>                                       
                </body>
                </html>
                `;
            // Define PDF options
            const pdfOptions = {
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '33mm',
                    right: '5mm',
                    bottom: '30mm',
                    left: '5mm',
                },
                displayHeaderFooter: true,
                headerTemplate: `<div style="padding: 5px 20px; width: 100%;">${headerContent}</div>`,
                footerTemplate: `<div style="padding: 5px 20px; width: 100%;">${footerContent}</div>`,
                ...options.pdfOptions,
            };
            // Create the file object for html-pdf-node
            const file = { content: htmlContent };
            // Generate the PDF
            const pdfBuffer = await pdf.generatePdf(file, pdfOptions);
            const fs = require('fs');
            let base64String;
            if (status === 'open' || status === 'preview') {
                base64String = Buffer.from(pdfBuffer).toString('base64');
            } else {
                fs.writeFileSync(outputPath, pdfBuffer);
            }
            return base64String;
        } catch (error) {
            console.error('Error during PDF generation:', error);
            throw error;
        }
    }
    /* Pranay Html-Pdf-Node*/
}
