import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import * as moment from 'moment-timezone';
import { DataSource } from 'typeorm';
import { appConstant } from '../constant';
import { CommonService } from './common.service';
import { CommonDateService } from './commondate.service';
@Injectable()
export class CommonArrayService {
    constructor(
        // private readonly dataSource: DataSource
        @InjectDataSource(appConstant.READ_REPLICA.toLowerCase()) 
            private readonly dataSource: DataSource,
        private readonly commonService: CommonService,
        private readonly commonDateService: CommonDateService,
    ) {}
    
    getPaginationVar(pageNo, recordPerPage = appConstant.RECORD_PER_PAGE) {
        try{
            if (pageNo < 1) {
                pageNo = 1;
            }
            if (recordPerPage == 0) {
                recordPerPage = appConstant.RECORD_PER_PAGE;
            }
            return {
                page: Number(pageNo),
                take: Number(recordPerPage),
                skip: (pageNo - 1) * recordPerPage,
            };
        }catch(err){
            throw new Error(err.message);
        }
    }
    paginate(array, page_size, page_number) {
        try{
            --page_number; // to accommodate 0 indexing
            return array.slice(page_number * page_size, (page_number + 1) * page_size);
        }catch(err){
            throw new Error(err.message);
        }
    }

    async mergeArrays(arr1: any = [], arr2: any = []) {
            try{
                const combinedArray = [...arr1, ...arr2];
                const uniqueArray = combinedArray.reduce((acc, current) => {
                if (!acc.some((item) => item.id === current.id)) {
                    acc.push(current);
                }
                return acc;
                }, []);
                return uniqueArray;
            }catch (error) {
                throw new Error(error.message); 
            }
    }
    async deepMerge(obj1:any = {}, obj2:any = {}) {
        try{
            const result: any = {};
            const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
            allKeys.forEach((key) => {
            const item1 = obj1[key] || {};
            const item2 = obj2[key] || {};
            result[key] = {
                Role: item1.Role || item2.Role,
                on_insurance_plan: item1.on_insurance_plan || item2.on_insurance_plan,
                Point: parseInt(item1.Point || item2.Point, 10),
                activityCompAry: {
                ...item1.activityCompAry,
                ...item2.activityCompAry,
                },
                rewardCompAry: {
                ...item1.rewardCompAry,
                ...item2.rewardCompAry,
                },
                Time: item1.Time < item2.Time ? item1.Time : item2.Time,
                ...(item1.finalsource && { finalsource: item1.finalsource }),
            };
            });
            return result;
        }catch (error) {
            throw new Error(error.message); 
        }
    }

    async formatToDto(dto: any, obj: any, lang: any = 'eng') {
        try{
            const formatDateFields = async (instance: any) => {
                const dateFields = appConstant.DATE_COLUMNS;
                const formattedFields = await Promise.all(
                    dateFields.map(async (field) => {
                        const value = instance[field];
                        if (value && value != '' && value != null && value != 0 && value != 1 && value != undefined && value != '0000-00-00 00:00:00' && value != 'Invalid Date' && value != 'Invalid date 00:00:00') {
                            let formattedDate:any = '';
                            if(await this.commonService.checkISOFormat(value)){
                                formattedDate = this.commonDateService.DateTimeFormat(value, 'YYYY-MM-DD HH:mm:ss');
                            }else{
                                let valueNew = moment(new Date(value));
                                formattedDate = this.commonDateService.DateTimeFormat(valueNew, 'YYYY-MM-DD HH:mm:ss');
                            }
                            const monthName = this.commonDateService.DateTimeFormat(formattedDate, 'MMMM');
                            const translatedMonth = await this.commonDateService.frontendReadTranslation(lang, monthName.toString(), `/LC_MESSAGES/Common/Month`, `static`);
                            return { [field]: `${translatedMonth.toString().substring(0, 3)} ${ this.commonDateService.DateTimeFormat(formattedDate, 'D, YYYY')}`, [field+'_copy']: formattedDate };
                        }
                        if(`${instance[field]}` == 'null' || `${instance[field]}` == '0' || `${instance[field]}` == '1' || `${instance[field]}` == '0000-00-00 00:00:00' || `${instance[field]}` == 'Invalid Date' || `${instance[field]}` == 'Invalid date 00:00:00'){
                            if(field != 'activity_date'){
                                return {[field] : ''};
                            }
                        }
                    })
                );
                formattedFields.forEach((formattedField) => {
                    Object.assign(instance, formattedField);
                });
                return instance;
            };
            const transformAndFormat = async (item: any) => {
                const instance = plainToInstance(dto, item, {
                    excludeExtraneousValues: true,
                    enableImplicitConversion: true,
                    enableCircularCheck: true,
                });
                if(item?.metadata){
                    instance['metadata'] = item?.metadata;
                }
                return formatDateFields(instance);
            };
            if (obj) {
                if (Array.isArray(obj)) {
                    return await Promise.all(obj?.map(transformAndFormat));
                } else {
                    return await transformAndFormat(obj);
                }
            }
        }catch(err){
            throw new Error(err.message);
        }
    }

    async dateMonthFormatTranslate(value: any, lang: any = 'eng'){
        try{
            let formattedDate = this.commonDateService.DateTimeFormat(value, 'YYYY-MM-DD HH:mm:ss');
            const monthName = this.commonDateService.DateTimeFormat(formattedDate, 'MMMM');
            const translatedMonth = await this.commonDateService.frontendReadTranslation(lang, monthName.toString().substring(0, 3), `/LC_MESSAGES/Common/Month`, `static`);
            return  `${translatedMonth.toString()} ${ this.commonDateService.DateTimeFormat(formattedDate, 'D, YYYY')}`;
        }
        catch(err){
            throw new Error(err.message);
        }
    }

    paginationResponse(result: any , total: any,  paginateObj: any) {
        try{
            return {
                list: result,
                total: total,
                pages: Math.ceil(total / paginateObj.take),
                limit: paginateObj.take,
                page: paginateObj.page,
            };
        }catch(err){
            throw new Error(err.message);
        }
    }
    paginationResponseChallengeReport(result: any , total: any,  paginateObj: any) {
        try{
            const limit = Math.max(1, Number(paginateObj.take) || 10);
            const page = Math.max(1, Number(paginateObj.page) || 1);
            const start = (page - 1) * limit;
            const end = start + limit;
            const paginatedList = result.slice(start, end);
            return {
                list: paginatedList,
                total: total,
                pages: Math.ceil(total / paginateObj.take),
                limit: paginateObj.take,
                page: paginateObj.page,
            };
        }catch(err){
            throw new Error(err.message);
        }
    }
    compareArrays(originalArray: any[], updatedArray: any[], key : string = 'id', keysToDelete : any[] = ['added_date', 'modified_date']) {
        try{
            function deleteKeys(obj, keys) {
                const newObj = { ...obj };
                keys.forEach(key => {
                    if (newObj.hasOwnProperty(key)) {
                        delete newObj[key];
                    }
                });
                return newObj;
            }
            const originalArrayWithoutKeys = originalArray.map(obj => deleteKeys(obj, keysToDelete));
            const updatedArrayWithoutKeys = updatedArray.map(obj => deleteKeys(obj, keysToDelete));
            const removed = originalArrayWithoutKeys.filter(item => !updatedArrayWithoutKeys.some(updatedItem => updatedItem[key] === item[key]));
            const added = updatedArrayWithoutKeys.filter(item => !originalArrayWithoutKeys.some(originalItem => originalItem[key] === item[key]) || !item.hasOwnProperty(key));
            const updated = updatedArrayWithoutKeys.filter(originalItem => {
                const correspondingUpdatedItem = originalArrayWithoutKeys.find(updatedItem => updatedItem[key] === originalItem[key]);
                return correspondingUpdatedItem && JSON.stringify(originalItem) !== JSON.stringify(correspondingUpdatedItem);
            });
            return {
                removed: removed ?? [],
                added: added ?? [],
                updated: updated ?? []
            };
        }catch(err){
            throw new Error(err.message);
        }
    }

    transformArray(arr: any[]) {
        try{
            let genderMap = {"m": "Male", "male": "Male", "f": "Female", "female": "Female", "o": "Other", "other": "Other"};
            return arr.map(obj => ({
                'USER CODE': obj?.user?.code,
                'ORGANIZATION': obj?.user?.company?.company_name ?? '',
                'DEPARTMENT': obj?.user?.department?.dept_name ?? '',
                'RELATIONSHIP ID': obj?.user?.relationship_id ?? '',
                'USERNAME': obj?.user?.username,
                'FIRST NAME': obj?.user?.first_name ?? '',
                'MIDDLE NAME': obj?.user?.middle_name ?? '',
                'LAST NAME': obj?.user?.last_name ?? '',
                'JOB TITLE': obj?.user?.settings?.jobtitle ?? '',
                'EMPLOYEE ID': obj?.user?.employeeid ?? '',
                'GENDER': genderMap[obj?.user?.gender] || '',
                'BIRTH DATE': obj?.user?.dob ? this.commonDateService.DateTimeFormat(obj?.user?.dob,'MM-DD-YYYY') : '',
                'DATE OF HIRE': obj?.user?.date_of_hire ? this.commonDateService.DateTimeFormat(obj?.user?.date_of_hire,'MM-DD-YYYY') : '',
                'ON HEALTH PLAN': obj?.user?.on_insurance_plan,
                'HEALTH PLAN NAME': obj?.user?.insurance_plan_name ?? '',
                'EMAIL': obj?.user?.email,
                'LOCATION': obj?.user?.location?.location_name ?? '',
                'User Type': obj?.user?.role_id ==2 ? 'Employee' : 'Spouse',
                'Breast Cancer Screen (Female-Clinical Exam by Health Care provider every 1-3 years)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Cervical Cancer Screen (Female-Pap Smear for sexually active females over 21)(Age 19-39)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Dental Exam(Age 19-39)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Flu Vaccine (annually)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Tetanus, Diphtheria, Pertussis Vaccine (every 10 years)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Breast Cancer Screen (Female-Clinical Exam and Mammogram every year)(Age 40-64)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Cervical Cancer Screen (Female-Pap Smear for sexually active females over 21)(Age 40-64)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Prostate Cancer Screen (Male)(Age 40-64)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Dental Exam(Age 40-64)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Flu Vaccine(Age 40-64)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Tetanus, Diphtheria, Pertussis (every 10 years)(Age 40-64)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Pneumonia Vaccine (recommended for smokers and/or asthmatics)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Zoster (Shingles Age 60+ single dose)(Age 40-64)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Colorectal Cancer Screen (beginning at age 45)(Age 40-64)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Colorectal Cancer Screen (beginning at age 40)(Age 40-64)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Breast Cancer Screen (Female-Clinical Exam and Mammogram every year)(Age 65+)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Cervical Cancer Screen (Female-Pap Smear, if you have had at least 3 normal pap tests in a row and no abnormal pap tests in the last 10 years, you may choose to stop screening)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Dental Exam(Age 65+)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Prostate Cancer Screen (Male)(Age 65+)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Colorectal Cancer Screen (beginning at age 45)(Age 65+)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Abdominal Aortic Aneurysm (Male-Ages 65-75 if you have ever smoked)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Flu Vaccine(Age 65+)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Tetanus, Diphtheria, Pertussis (every 10 years)(Age 65+)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Zoster (Shingles Age 60+ single dose)(Age 65+)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Annual Vision Exam(Age 19-39)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Annual Vision Exam(Age 40-64)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Annual Vision Exam(Age 65+)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Skin Cancer Screening(Age 19-39)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Skin Cancer Screening(Age 40-64)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Skin Cancer Screening(Age 65+)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Cardiac Stress Test(Age 40-64)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Cardiac Stress Test(Age 65+)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Osteoporosis Screening': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Breast Cancer Screening': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Colon Cancer Screening': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'COVID-19 Vaccine(Age 19-39)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'COVID-19 Vaccine(Age 40-64)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'COVID-19 Vaccine(Age 65+)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'COVID-19 Booster Shot(Age 19-39)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'COVID-19 Booster Shot(Age 40-64)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'COVID-19 Booster Shot(Age 65+)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'PHQ-9(Age 19-39)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'PHQ-9(Age 40-64)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'PHQ-9(Age 65+)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'GAD-7(Age 19-39)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'GAD-7(Age 40-64)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'GAD-7(Age 65+)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'STI Screening(Age 19-39)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'STI Screening(Age 40-64)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'STI Screening(Age 65+)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Shingles Vaccine(Age 19-39)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Shingles Vaccine(Age 40-64)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Shingles Vaccine(Age 65+)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'HPV Vaccine (up to age 45)(Age 19-39)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'HPV Vaccine (up to age 45)(Age 40-64)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'RSV Vaccine (starting at age 60)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Lung Cancer Screening (starting at age 50, former or current smokers)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'RSV Vaccine': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Lung Cancer Screening (former or current smokers)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Annual Wellness Visit(Age 19-39)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Annual Wellness Visit(Age 40-64)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Annual Wellness Visit(Age 65+)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Cholesterol Test(Age 19-39)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Cholesterol Test(Age 40-64)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Cholesterol Test(Age 65+)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Lipid Profile(Age 19-39)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Lipid Profile(Age 40-64)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Lipid Profile(Age 65+)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Bone Density Test (Female)(Age 65+)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Cologuard (Age 45+)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Cervical Cancer Screen (Females Age 25+)(Age 19-39)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Cervical Cancer Screen (Females Age 25+)(Age 40-64)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Cervical Cancer Screen (Females Age 25+)(Age 65+)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Prostate Cancer Screen (Male Age 50+)(Age 40-64)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Prostate Cancer Screen (Male Age 50+)(Age 65+)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Well-Woman Visit (Females)(Age 19-39)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Well-Woman Visit (Females)(Age 40-64)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Well-Woman Visit (Females)(Age 65+)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Hearing (Age 19-39)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Hearing (Age 40-64)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Hearing (Age 65+)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Nutrition Counseling (Age 19-39)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Nutrition Counseling (Age 40-64)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Nutrition Counseling (Age 65+)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Mental Health/Behavioral Health Screening (Age 19-39)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Mental Health/Behavioral Health Screening (Age 40-64)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Mental Health/Behavioral Health Screening (Age 65+)': this.commonService.checkValueExists(appConstant.CARE_FIELDS,obj?.aas_form_prog?.split(',')),
                'Source- Entered by': this.commonService.writeEnterBy(obj?.source, obj?.enter_by),
                'Created Date': obj?.created ? this.commonDateService.DateTimeFormat(obj?.created,'MM-DD-YYYY') : '',
                'Inserted Date': obj?.inserted ? this.commonDateService.DateTimeFormat(obj?.inserted,'MM-DD-YYYY') : ''
            }));
        }catch(err){
            throw new Error(err.message);
        }
    }   

    arrayToAssoc(array, key) {
        try{
            return array.reduce((acc, item) => {
                acc[item[key]] = item;
                return acc;
            }, {});
        }catch(err){
            throw new Error(err.message);
        }
    }
    async mapped_sheet_data(
        sheetData: any[],
        mappedHeader: { [key: string]: string },
        usecase: 'header' | 'table_header'
    ): Promise<any[]> {
        const getValue = (val: any) => (val !== undefined && val !== null ? val.toString().trim() : null);
        if (usecase === 'header') {
            return sheetData.map(row => {
                const mappedRow: any = {};
                for (const key in mappedHeader) {
                    const originalKey = mappedHeader[key];
                    mappedRow[key] = originalKey && row[originalKey] ? getValue(row[originalKey]) : null;
                }
                return mappedRow;
            });
        }

        if (usecase === 'table_header') {
            return sheetData.map(row => {
                const mappedRow: any = {};
                for (const originalKey in mappedHeader) {
                    const newKey = mappedHeader[originalKey];
                    const rawValue = originalKey && row[originalKey] ? getValue(row[originalKey]) : null;
                    if (newKey === 'dob' || newKey === 'date_of_hire') {
                        mappedRow[newKey] = this.commonDateService.normalizeDates(rawValue) ?? null;
                    } else {
                        mappedRow[newKey] = rawValue;
                    }
                }
                return mappedRow;
            });
        }
        return sheetData;
    }

    compareObjects(obj1: any, obj2: any) {
        try{
            if (
                typeof obj1 !== 'object' ||
                obj1 === null ||
                typeof obj2 !== 'object' ||
                obj2 === null
            ) {
                return [];
            }
            const differences = [];
            const keys1 = Object.keys(obj1);
            keys1.forEach((key) => {
                if (obj2.hasOwnProperty(key)) {
                    if (obj1[key] === null || obj1[key] === undefined) {
                        obj1[key] = '';
                    }
                    if (appConstant.DATE_COLUMNS.includes(key)) {
                        const dateValue = this.commonDateService.isValidDate(obj1[key]);
                        if (dateValue) {
                            obj1[key] = obj1[key] ? this.commonDateService.DateTimeFormat(obj1[key],'YYYY-MM-DD') : '';
                        }else{
                            obj1[key] = obj1[key] ? this.commonDateService.DateTimeFormat(obj1[key],'YYYY-MM-DD') : '';
                        }
                    }
                    if (
                        typeof obj1[key] === 'object' &&
                        typeof obj2[key] === 'object'
                    ) {
                        const nestedDifferences = this.compareObjects(
                            obj1[key],
                            obj2[key],
                        );
                        differences.push(
                            ...nestedDifferences.map((diff) => ({
                                field: key + '.' + diff.field,
                                instring: diff.instring,
                                outstring: diff.outstring,
                            })),
                        );
                    } else if (obj1[key] != obj2[key]) {
                        differences.push({
                            field: key,
                            instring: obj1[key],
                            outstring: obj2[key],
                        });
                    }
                }
            });
            return differences;
        }catch(err){
            throw new Error(err.message);
        }
    }
    verifyPercentage(value: number): number {
        if (isNaN(value) || !isFinite(value) || value < 0) {
            return 0;
        }
        if (value > 100) {
            return 100;
        }
        return Math.round(value * 100) / 100;
    }
    formatInClauseCondition(input: string | string[] | number[] | undefined, field: string, conditionCheck: boolean = true): string {
        if (!conditionCheck || !input) {
            return '';
        }
        let values: string[] = [];
        if (typeof input === 'string') {
            values = input
                .replace(/^\[|\]$/g, '') // Remove square brackets if present
                .split(',')
                .map(item => item.trim())
                .filter(item => item !== '');
        } else if (Array.isArray(input)) {
            values = input.map(item => item.toString().trim()).filter(item => item !== '');
        }
        if (values.length === 0) {
            return '';
        }
        // const formattedValues = values.map(value => `'${value}'`).join(',');
        const formattedValues = values
            .map
            (
                value =>
                    `'${value.replace(/'/g, "''")}'` // Escape single quotes in values
            )
            .join(',');
        return ` ${field} IN (${formattedValues})`;
    }

    async mergeWithDuplicateKeys(obj1, obj2) {
        const result = { ...obj1 };
        const keys: string[] = Object.keys(obj2);
        for (let i: number = 0; i < keys.length; i++) {
            let key = keys[i];
            let newKey = key;
            while (newKey in result) {
                newKey += ' ';
            }
            result[newKey] = obj2[key];
        }
        return result;
    };
    async addWithDuplicateKeys(obj: Record<string, string>, key: string, value: string) {
        let newKey: string = key;

        while (newKey in obj) {
            newKey += ' ';
        }

        obj[newKey] = value;
    };
    transformToArray(input: any, delimiter: string = ',', changedType: 'string' | 'number' = 'string')
        : string[] | number[] {
        if (input == null) return [];
        let values: string[] = [];
        if (typeof input === 'string') {
            let str = input.trim();
            if (str.startsWith('[') && str.endsWith(']')) {
                str = str.slice(1, -1).trim();
            }
            values = str
                .split(delimiter)
                .map(item => item.trim())
                .filter(item => item !== '');
        }
        else if (Array.isArray(input)) {
            values = input
                .map(item => item?.toString().trim() || '')
                .filter(item => item !== '');
        }
        else {
            const str = input.toString().trim();
            values = str ? [str] : [];
        }
        if (changedType === 'number') {
            return values.map(value => Number(value));
        }
        return values;
    }
    formatUSStyle(value: number | string): string {
        return Number(value).toLocaleString('en-US', {
            maximumSignificantDigits: 6
        });
    }
}
