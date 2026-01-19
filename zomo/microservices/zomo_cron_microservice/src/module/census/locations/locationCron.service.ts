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
import { In } from 'typeorm';
import { CompanyService } from '../../company/company.service';
import { LocationServices } from '../../company/location.service';
import { ImportUserRequestService } from '../../user/importuserrequest/importuserrequest.service';
@Injectable()
export class LocationCronService {
    constructor(
        @Inject('POSTCODES_SERVICE')
        private client: ClientProxy,
        private readonly importUserRequestService: ImportUserRequestService,
        private readonly locationService: LocationServices,
        private readonly companyService: CompanyService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
    ) {}
    async importUserProcessLocation(postData: any) {
        try {
            let recordDetails: any,
                sheetData: any,
                echoTime = '',
                workZipPostalCode = [],
                allExistsLocations: any[] = [],
                timeZoneDataUS = [],
                timeZoneDataCA = [],
                locationExistData = [],
                getDefaultLocation = {};
            const dLocation: { [key: string]: any } = {};
            const startTime = new Date().getTime();
            if (postData?.id) {
                recordDetails = await this.importUserRequestService.findOne(
                    {
                        hash: postData?.id,
                        status: '0',
                        flage: '1',
                        requeststep: '1',
                        source_type: '2',
                    },
                    null,
                    ['hash', 'org_id', 'mapped_header', 'origional_file', 'id'],
                );
            } else {
                recordDetails = await this.importUserRequestService.findOne(
                    {
                        status: '0',
                        flage: '1',
                        requeststep: '1',
                        source_type: '1',
                    },
                    { request_date: 'ASC' },
                    ['hash', 'org_id', 'mapped_header', 'origional_file', 'id'],
                );
            }
            if (!recordDetails) {
                throw new Error('ERR_RECORD_NOT_FOUND');
            }
            echoTime = 'Location\n';
            echoTime += `First ${(new Date().getTime() - startTime) / 1000}\n`;
            await this.importUserRequestService.update(
                { id: recordDetails?.id },
                { status: '0', flage: '2' },
            );
            const directory = `userimport/${recordDetails?.org_id}/${recordDetails?.id}`;
            const fileName: string = `census_created_update_${recordDetails?.hash}_${recordDetails?.org_id}.json`;
            let dataFileRead = await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'get_file' },
                    { path: `${directory}/${fileName}`, userBucket: 'private' },
                ),
            );
            let locationData = Buffer.from(
                dataFileRead.Body,
                'base64',
            ).toString('utf-8');
            sheetData = JSON.parse(locationData);
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
                workZipPostalCode = sheetData
                    .map((row) => this.commonService.sanitize(row['work_zip']))
                    .filter(
                        (value) =>
                            value !== null &&
                            value !== undefined &&
                            value !== '',
                    );
            }
            const escapeLookup = {
                '\\': '\\\\',
                '\0': '\\0',
                '\n': '\\n',
                '\r': '\\r',
                "'": "\\'",
                '"': '\\"',
                '\x1a': '\\Z',
            };
            const escapedPostalCodes = [
                ...new Set(
                    workZipPostalCode.map((code) =>
                        String(code).replace(
                            /\\|\0|\n|\r|'|"|\x1a/g,
                            (match) => escapeLookup[match] || match,
                        ),
                    ),
                ),
            ];
            if (escapedPostalCodes?.length > 0) {
                try {
                    timeZoneDataUS = await lastValueFrom(
                        this.client.send({ cmd: 'find_postcode' }, [
                            { zipcode: escapedPostalCodes, countrycode: 'US' },
                        ]),
                    );
                    if (timeZoneDataUS) {
                        timeZoneDataUS = timeZoneDataUS.reduce((obj, item) => {
                            obj[item.postalcode] = item;
                            return obj;
                        }, {});
                    }
                } catch (error) {
                    throw new Error(
                        `An error occurred US: ${JSON.stringify(error)}`,
                    );
                }
                try {
                    timeZoneDataCA = await lastValueFrom(
                        this.client.send({ cmd: 'find_postcode' }, [
                            {
                                postalcode: escapedPostalCodes,
                                countrycode: 'CA',
                            },
                        ]),
                    );
                    if (timeZoneDataCA) {
                        timeZoneDataCA = timeZoneDataCA.reduce((obj, item) => {
                            obj[item.postalcode] = item;
                            return obj;
                        }, {});
                    }
                } catch (error) {
                    throw new Error(
                        `An error occurred CA: ${JSON.stringify(error)}`,
                    );
                }
            }
            echoTime += `Second ${(new Date().getTime() - startTime) / 1000}\n`;
            const companyId = recordDetails?.org_id;
            if (sheetData.length > 0) {
                for (const locationData of sheetData) {
                    echoTime += `Start Third ${(new Date().getTime() - startTime) / 1000}\n`;
                    if (locationData?.['work_zip']) {
                        locationData['work_zip'] = this.commonService.sanitize(
                            locationData?.['work_zip'],
                            'start_zero_replace',
                        );
                    }
                    if (
                        locationData?.['work_zip'] &&
                        (timeZoneDataUS[locationData?.['work_zip']] ||
                            timeZoneDataCA[locationData?.['work_zip']]) &&
                        locationData?.['location'] &&
                        locationData?.['work_address_1']
                    ) {
                        let locationCity = '',
                            locationState = '',
                            locationCountry = '',
                            locationTimeZone = '';
                        if (timeZoneDataUS[locationData?.['work_zip']]) {
                            locationCountry = 'United States';
                            locationState =
                                timeZoneDataUS[locationData?.['work_zip']]
                                    .statecode;
                            locationCity =
                                timeZoneDataUS[locationData?.['work_zip']].city;
                            locationTimeZone =
                                timeZoneDataUS[locationData?.['work_zip']]
                                    .timezone;
                        } else if (timeZoneDataCA[locationData?.['work_zip']]) {
                            locationCountry = 'Canada';
                            locationState =
                                timeZoneDataCA[locationData?.['work_zip']]
                                    .provincecode;
                            locationCity =
                                timeZoneDataCA[locationData?.['work_zip']].city;
                            locationTimeZone =
                                timeZoneDataCA[locationData?.['work_zip']]
                                    .timezone;
                        }
                        let locationsData = {};
                        if (
                            locationData?.['work_address_2'] !== undefined &&
                            locationData?.['work_address_2'] !== null &&
                            locationData?.['work_address_2'] !== ''
                        ) {
                            locationsData = await this.locationService.findOne({
                                lname: this.commonService.sanitize(
                                    locationData?.['location'],
                                ),
                                address1: this.commonService.sanitize(
                                    locationData?.['work_address_1'],
                                ),
                                address2: this.commonService.sanitize(
                                    locationData?.['work_address_2'],
                                ),
                                city: locationCity,
                                state: locationState,
                                zip: locationData?.['work_zip'],
                                country: locationCountry,
                                company_id: companyId,
                            });
                        } else {
                            locationsData = await this.locationService.findOne({
                                lname: this.commonService.sanitize(
                                    locationData?.['location'],
                                ),
                                address1: this.commonService.sanitize(
                                    locationData?.['work_address_1'],
                                ),
                                city: locationCity,
                                state: locationState,
                                zip: locationData?.['work_zip'],
                                country: locationCountry,
                                company_id: companyId,
                            });
                        }
                        if (
                            locationsData &&
                            !locationExistData.includes(
                                locationsData['location_name'],
                            )
                        ) {
                            locationExistData.push(
                                locationsData['location_name'],
                            );
                        } else {
                            const locationAdd: Record<string, any> = {
                                lname: this.commonService.sanitize(
                                    locationData?.['location'],
                                ),
                                address1: this.commonService.sanitize(
                                    locationData?.['work_address_1'],
                                ),
                                address2:
                                    this.commonService.sanitize(
                                        locationData?.['work_address_2'],
                                    ) ?? ' ',
                                city: locationCity,
                                state: locationState,
                                zip: locationData?.['work_zip'],
                                country: locationCountry,
                            };
                            locationAdd.location_name =
                                Object.values(locationAdd).join(', ');
                            if (
                                !locationExistData.includes(
                                    locationAdd.location_name,
                                )
                            ) {
                                const generateUniqueCode =
                                    async (): Promise<string> => {
                                        const code =
                                            this.commonService.userLocationValidDefaultCode(
                                                1,
                                            );
                                        const exists =
                                            await this.locationService.findOne({
                                                code,
                                            });
                                        return exists
                                            ? await generateUniqueCode()
                                            : code;
                                    };
                                Object.assign(locationAdd, {
                                    company_id: companyId,
                                    companytype_id: 3,
                                    code: await generateUniqueCode(),
                                });
                                const saveResult =
                                    await this.locationService.save([
                                        locationAdd,
                                    ]);
                                const locationID =
                                    saveResult.identifiers?.[0]?.id;
                                if (locationID) {
                                    const locationCode =
                                        this.commonService.generateCode(
                                            'L',
                                            locationID,
                                        );
                                    await this.locationService.update(
                                        { id: locationID },
                                        { code: locationCode },
                                    );
                                }
                                locationExistData.push(
                                    locationAdd.location_name,
                                );
                            }
                        }
                    }
                    echoTime += `End Third ${(new Date().getTime() - startTime) / 1000}\n`;
                }
            }
            echoTime += `Four ${(new Date().getTime() - startTime) / 1000}\n`;
            await this.locationService.update(
                { code: 'LLLLLL' },
                { code: this.commonService.generateCode('L', companyId) },
            );
            echoTime += `Five ${(new Date().getTime() - startTime) / 1000}\n`;
            if (locationExistData) {
                locationExistData = await this.locationService.listRecord(
                    [
                        'id',
                        'lname',
                        'address1',
                        'address2',
                        'city',
                        'state',
                        'zip',
                        'country',
                        'is_default',
                    ],
                    {
                        location_name: In(locationExistData),
                        company_id: companyId,
                    },
                );
                if (locationExistData) {
                    allExistsLocations = locationExistData.map((item) => item);
                }
            }
            getDefaultLocation = await this.locationService.findOne({
                company_id: companyId,
                is_default: 1,
            });
            if (getDefaultLocation) {
                // const { Company, Companytype, ...getDefaultLocation } = getDefaultLocation;
            } else {
                const dfLocation: { [key: string]: any } = {},
                    addLocation: { [key: string]: any } = {};
                const companyDetails = await this.companyService.findOne({
                    id: companyId,
                });
                dLocation.companytype_id = companyDetails['companytype_id'];
                dLocation.company_id = companyId;
                dLocation.code = companyDetails['code'];
                dLocation.lname =
                    dfLocation.lname =
                    addLocation.lname =
                        companyDetails['street_address'];
                dLocation.address1 =
                    dfLocation.address1 =
                    addLocation.address1 =
                        companyDetails['street_address'];
                dLocation.address2 = dfLocation.address2 = '';
                dLocation.city =
                    dfLocation.city =
                    addLocation.city =
                        companyDetails['city'];
                dLocation.state =
                    dfLocation.state =
                    addLocation.state =
                        companyDetails['state'];
                dLocation.zip =
                    dfLocation.zip =
                    addLocation.zip =
                        companyDetails['zip'];
                dLocation.country =
                    dfLocation.country =
                    addLocation.country =
                        companyDetails['country'];
                dLocation.is_default = dfLocation.is_default = 1;
                dLocation.location_name = Object.values(addLocation).join(', ');
                let lastID = await this.locationService.save(dLocation);
                lastID = lastID.identifiers[0]['id'];
                if (lastID) {
                    getDefaultLocation = {
                        id: lastID,
                        ...dfLocation,
                        ...getDefaultLocation,
                    };
                }
            }
            allExistsLocations = [getDefaultLocation, ...allExistsLocations];
            echoTime += `Six ${(new Date().getTime() - startTime) / 1000}\n`;
            if (Object.keys(allExistsLocations).length > 0) {
                const columnDataArr = allExistsLocations.map((obj) => ({
                    LocationID: obj.id,
                    LocationLname: obj.lname,
                    LocationAddress1: obj.address1,
                    LocationAddress2: obj.address2 ? obj.address2 : '',
                    LocationCity: obj.city,
                    LocationState: obj.state,
                    LocationZip: obj.zip,
                    LocationCountry: obj.country,
                    IsDefault: obj.is_default ? '1' : '0',
                }));
                this.commonFileService.writeFile(
                    `${directory}`,
                    JSON.stringify(columnDataArr),
                    'locations.json',
                );
                await this.commonFileService.createJsonToFile(
                    1,
                    `${directory}/locations.json`,
                    'pythonjsontocsv.py',
                );
                await lastValueFrom(
                    this.commonMicroservice.send(
                        { cmd: 'upload_file' },
                        {
                            path: path.resolve(`${directory}/locations.csv`),
                            filename: `${directory}/locations.csv`,
                            userBucket: 'private',
                        },
                    ),
                );
                await lastValueFrom(
                    this.commonMicroservice.send(
                        { cmd: 'upload_file' },
                        {
                            path: path.resolve(`${directory}/locations.json`),
                            filename: `${directory}/locations.json`,
                            userBucket: 'private',
                        },
                    ),
                );
            }
            echoTime += `Seven ${(new Date().getTime() - startTime) / 1000}\n`;
            await this.importUserRequestService.update(
                { id: recordDetails?.id },
                { requeststep: '2' },
            );
            echoTime += `Eight ${(new Date().getTime() - startTime) / 1000}\n`;
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
            return {
                id: recordDetails?.hash,
                next_step: 'import-user-process-system',
            };
        } catch (error) {
            return false;
        }
    }
}
