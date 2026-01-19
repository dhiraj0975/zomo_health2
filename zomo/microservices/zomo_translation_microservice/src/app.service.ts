import { CacheService } from '@common-constants';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { lastValueFrom } from 'rxjs';
import { In, Not } from 'typeorm';
import {
    CompanyLanguagesService,
    LanguagesService,
    TranslationCommonService,
} from './common';

@Injectable()
export class AppService {
    private readonly path = 'Locale';
    private readonly bucket = 'private';
    constructor(
        private schedulerRegistry: SchedulerRegistry,
        private readonly translationCommonService: TranslationCommonService,
        private readonly companyLanguagesService: CompanyLanguagesService,
        private readonly languagesService: LanguagesService,
        private readonly cacheService: CacheService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
    ) {
        this.createTranslationCronJobs();
    }

    private createTranslationCronJobs() {
        const jobs = [
            {
                name: 'translationFileCreate_10min',
                time: '0 */5 * * * *',
                action: 'translationFileCreate',
            },
            {
                name: 'menuCronTranslationTimeWise_10min',
                time: '0 */5 * * * *',
                action: 'menuCronTranslationTimeWise',
            },
            {
                name: 'fileCheckLastUpdatedFile_25min',
                time: '0 */25 * * * *',
                action: 'fileCheckLastUpdatedFile',
            },
        ];

        for (const job of jobs) {
            try {
                let isRunning = false;
                const cronJob = new CronJob(job.time, async () => {
                    try {
                        if (isRunning) {
                            console.log(
                                `[CronService] ${job.name} already running... SKIPPED`,
                            );
                            return;
                        }
                        isRunning = true;
                        console.log(
                            `[CronService] ${job.name} started at ${new Date()}`,
                        );
                        if (job.action === 'translationFileCreate') {
                            await this.translationFileCreate(null, null, 0);
                        } else if (
                            job.action === 'menuCronTranslationTimeWise'
                        ) {
                            await this.menuCronTranslationTimeWise();
                        } else if (
                            job.action === 'fileCheckLastUpdatedFile'
                        ) {
                            await this.fileCheckLastUpdatedFile();
                        }
                        console.log(`[CronService] ${job.name} completed`);
                    } catch (err) {
                        console.error(
                            `[CronService] Error in ${job.name}:`,
                            err,
                        );
                    } finally {
                        isRunning = false;
                    }
                });
                this.schedulerRegistry.addCronJob(
                    `CronService.${job.name}`,
                    cronJob,
                );
                cronJob.start();
                console.log(
                    `[CronService] ${job.name} scheduled with cron: ${job.time}`,
                );
            } catch (error) {
                console.error(
                    `[CronService] Failed to schedule ${job.name}:`,
                    error,
                );
            }
        }
    }
    async getTranslationFileData(filePath: string): Promise<any> {
        try {
            const fileData = await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'get_file' },
                    {
                        path: filePath,
                        userBucket: 'private',
                    },
                ),
            );
            if (!fileData?.Body) {
                return {};
            }
            const decodedData = JSON.parse(
                Buffer.from(fileData.Body.toString(), 'base64').toString(
                    'utf-8',
                ),
            );
            return Array.isArray(decodedData) || typeof decodedData === 'object'
                ? decodedData
                : {};
        } catch (error) {
            console.log('error', error);
            Logger.log(`Error getting translation file: ${error.message}`);
            return {};
        }
    }

    async saveTranslationFile(
        bucket: string,
        filePath: string,
        data: any,
    ): Promise<void> {
        try {
            const jsonData = JSON.stringify(data, null, 2);
            await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'upload_file' },
                    {
                        path: Buffer.from(jsonData).toString('base64'),
                        filename: filePath,
                        userBucket: bucket,
                    },
                ),
            );
        } catch (error) {
            Logger.log(`Error saving translation file: ${error.message}`);
            throw error;
        }
    }

    async processTranslationQueue(
        bucket: string,
        menuTranslationData: Record<string, number>,
    ): Promise<string | null> {
        let translationsQue = Object.keys(menuTranslationData).find(
            (key) => menuTranslationData[key] === 2,
        );

        if (!translationsQue) {
            translationsQue = Object.keys(menuTranslationData).find(
                (key) => menuTranslationData[key] === 0,
            );

            if (!translationsQue) {
                console.log('Menu Translation not found.');
                return null;
            }
        } else {
            console.log('Menu Translation other module in Progress.');
            return null;
        }
        await this.updateMenuStatus(bucket, translationsQue, 2);
        return translationsQue;
    }

    async updateMenuStatus(
        bucket: string,
        menuItem: string,
        status: number,
    ): Promise<void> {
        const menuTranslationFile = `${this.path}/menu_translation_status.json`;

        const menuTranslationData =
            await this.getTranslationFileData(menuTranslationFile);
        menuTranslationData[menuItem] = status;
        await this.saveTranslationFile(
            bucket,
            menuTranslationFile,
            menuTranslationData,
        );
    }

    async translationFileCreate(
        id: number | null = null,
        updatediff: string | null = null,
        statusdata: number = 0,
    ): Promise<string> {
        try {
            const menuTranslationFile = `${this.path}/menu_translation_status.json`;

            let menuTranslationData =
                await this.getTranslationFileData(menuTranslationFile);

            if (
                !menuTranslationData ||
                Object.keys(menuTranslationData).length === 0
            ) {
                menuTranslationData = this.getDefaultMenuTranslationData();
                await this.saveTranslationFile(
                    this.bucket,
                    menuTranslationFile,
                    menuTranslationData,
                );
            }
            if (id === 5) {
                if (updatediff) {
                    await this.updateMenuStatus(
                        this.bucket,
                        updatediff,
                        statusdata,
                    );
                }
                const allTranslationFile = `${this.path}/menu_translation_status.json`;
                const allTranslationData =
                    await this.getTranslationFileData(allTranslationFile);
                return JSON.stringify(allTranslationData, null, 2);
            }

            if (id === 6) {
                if (updatediff) {
                    await this.updateTranslationStatusCreate(
                        this.bucket,
                        updatediff,
                        statusdata,
                    );
                }
                const allTranslationFile = `${this.path}/all_translation_status.json`;
                const allTranslationData =
                    await this.getTranslationFileData(allTranslationFile);
                return JSON.stringify(allTranslationData, null, 2);
            }
            const translationsQue = await this.processTranslationQueue(
                this.bucket,
                menuTranslationData,
            );
            if (!translationsQue) {
                console.log(
                    'No translation queue available, stopping process...',
                );
                return;
                //translationsQue = 'Common_SpouseAuthorizedPopup';
            }
            const langCon = [];
            if (id !== null) {
                langCon.push({ 'Companies.id': id });
            }
            const langQryResults =
                await this.companyLanguagesService.findAllWithInternationalization(
                    langCon,
                );
            if (translationsQue) {
                const [parent_val, sidebar_value, nutrition_value_str] =
                    translationsQue.split('_');
                const nutrition_value = nutrition_value_str
                    ? parseInt(nutrition_value_str)
                    : 250;
                const languageData = await this.getLanguagesData();
                const languageTitles = languageData.map((lang) => lang.name);
                let resLangtmp = [];
                if (languageTitles.length !== 0) {
                    resLangtmp = await this.languagesService.getAll({
                        status: Not(2),
                        title: In(languageTitles),
                    });
                }
                const AlllangIds = resLangtmp.map((lang) => lang.id);
                let langQryResultstmp = [];

                const globalModules = [
                    'Common_CovidPopup',
                    'ActivityForms_Activities',
                    'Reimbursements_Activities',
                    'MyHealth_Assessment',
                    'Events_Events',
                    'Trackers_Nutrition',
                    'Challenge_MyChallenges',
                    'Challenge_Activity',
                    'Quizzes_Quizzes',
                    'Quizzes_Categories',
                    'Campaign_Category',
                    'Media_Fitnessvideos',
                    'QuickLink_QuickLink',
                ];
                if (globalModules.includes(`${parent_val}_${sidebar_value}`)) {
                    langQryResultstmp = [
                        {
                            CompanyLanguage: {
                                company_id: '0',
                                language_id: AlllangIds.join(','),
                            },
                        },
                    ];
                }
                const specificModules = [
                    'Challenge_Activity',
                    'Trackers_Nutrition',
                    'Quizzes_Categories',
                    'Campaign_Category',
                ];

                let finalLangResults;
                if (
                    specificModules.includes(`${parent_val}_${sidebar_value}`)
                ) {
                    finalLangResults = langQryResultstmp;
                } else {
                    finalLangResults = [
                        ...langQryResultstmp,
                        ...langQryResults,
                    ];
                }

                const lang_translation_array = {};
                let Assessmentmenu = {};
                if (
                    parent_val === 'MyHealth' &&
                    sidebar_value === 'Assessment'
                ) {
                    Assessmentmenu =
                        await this.translationCommonService.getDynamicOrgData(
                            parent_val,
                            sidebar_value,
                        );
                    if ('hra' in Assessmentmenu) {
                        for (const value of langQryResultstmp) {
                            const company_id = value.CompanyLanguage.company_id;
                            const language_ids =
                                value.CompanyLanguage.language_id || '0';
                            const lang = language_ids
                                .split(',')
                                .map((l) => l.trim());
                            const resLang = resLangtmp.filter((l) =>
                                lang.includes(l.id.toString()),
                            );

                            const hramenu =
                                await this.translationCommonService.getDynamicModuleData(
                                    parent_val,
                                    sidebar_value,
                                    'hra',
                                );

                            for (const [hrakey, hravalue] of Object.entries(
                                hramenu,
                            )) {
                                const cronData = {
                                    selectLanguage: 'eng',
                                    selectText: 'dynamic',
                                    parent_val,
                                    sidebar_value,
                                    refreshData: '1',
                                    run_type: 'cron',
                                    selectformfieldlist: hrakey,
                                    selectorgfieldlist: 'hra',
                                };

                                const lang_translation = `${parent_val}_${sidebar_value}_hra_${hrakey}`;
                                const translation_done =
                                    await this.getModuleOptionLists(cronData);
                                if (translation_done === true) {
                                    lang_translation_array[
                                        `${lang_translation}_eng`
                                    ] = 1;
                                    const translations = {};
                                    resLang
                                        .filter((l) => l.alias !== 'eng')
                                        .forEach((l) => {
                                            translations[
                                                `${lang_translation}_${l.alias}`
                                            ] = 0;
                                        });
                                    Object.assign(
                                        lang_translation_array,
                                        translations,
                                    );
                                }
                            }
                        }
                        finalLangResults.shift();
                    }
                }
                for (const value of finalLangResults) {
                    const company_id = value.CompanyLanguage.company_id;
                    const language_ids =
                        value.CompanyLanguage.language_id || '0';
                    const lang = language_ids.split(',').map((l) => l.trim());
                    const resLang = resLangtmp.filter((l) =>
                        lang.includes(l.id.toString()),
                    );

                    if (resLang.length > 0) {
                        const cronData: any = {
                            selectLanguage: 'eng',
                            selectText: 'dynamic',
                            parent_val,
                            sidebar_value,
                            selectorgfieldlist: company_id,
                            refreshData: '1',
                            run_type: 'cron',
                        };

                        let subDataIn = false;
                        let subDataInChallengeActivity = false;
                        let subDataInCampaignCategory = false;
                        let nutritionActivity = false;
                        let quizCategoryData = false;
                        let menu = {};

                        const modulesRequiringMenu = [
                            'Common_SurveyPopup',
                            'Dashboard_UpcomingActivities',
                            'ActivityForms_Activities',
                            'ActivityForms_SubmitForm',
                            'Reimbursements_Activities',
                            'Reimbursements_SubmitForm',
                            'Events_Events',
                            'Events_Category',
                            'Challenge_MyChallenges',
                            'Campaign_Campaigns',
                            'Quizzes_Quizzes',
                            'Quizzes_Categories',
                            'MyPlan_MyPlan',
                            'Media_Media',
                            'Media_Fitnessvideos',
                            'Emotionalwellbeing_Emotionalwellbeing',
                            'OrgAdmin_Department',
                            'OrgAdmin_Location',
                        ];

                        if (
                            modulesRequiringMenu.includes(
                                `${parent_val}_${sidebar_value}`,
                            )
                        ) {
                            menu =
                                await this.translationCommonService.getDynamicModuleData(
                                    parent_val,
                                    sidebar_value,
                                    company_id,
                                );
                            if (
                                parent_val === 'Quizzes' &&
                                sidebar_value === 'Categories'
                            ) {
                                quizCategoryData = true;
                            }
                            subDataIn = true;
                        }

                        if (
                            parent_val === 'Challenge' &&
                            sidebar_value === 'Activity'
                        ) {
                            menu =
                                await this.translationCommonService.getDynamicModuleData(
                                    parent_val,
                                    sidebar_value,
                                );
                            subDataInChallengeActivity = true;
                            subDataIn = true;
                        }

                        if (
                            parent_val === 'Campaign' &&
                            sidebar_value === 'Category'
                        ) {
                            menu =
                                await this.translationCommonService.getDynamicModuleData(
                                    parent_val,
                                    sidebar_value,
                                );
                            subDataInCampaignCategory = true;
                            subDataIn = true;
                        }

                        if (
                            parent_val === 'Trackers' &&
                            sidebar_value === 'Nutrition'
                        ) {
                            const allMenu =
                                await this.translationCommonService.getDynamicOrgData(
                                    parent_val,
                                    sidebar_value,
                                );
                            menu = Object.fromEntries(
                                Object.entries(allMenu).slice(
                                    250 * nutrition_value - 250,
                                    250 * nutrition_value,
                                ),
                            );
                            subDataIn = true;
                            nutritionActivity = true;
                        }

                        if (
                            parent_val === 'MyHealth' &&
                            sidebar_value === 'Assessment'
                        ) {
                            if ('hra' in Assessmentmenu) {
                                delete Assessmentmenu.hra;
                            }
                            menu = Assessmentmenu;
                            subDataIn = true;
                        }
                        if (subDataIn) {
                            for (const [fkey, fvalue] of Object.entries(menu)) {
                                cronData.selectformfieldlist = fkey;

                                if (
                                    parent_val === 'Media' &&
                                    sidebar_value === 'Fitnessvideos' &&
                                    fvalue === 'Video'
                                ) {
                                    const submenu =
                                        await this.translationCommonService.getDynamicSubModuleData(
                                            parent_val,
                                            sidebar_value,
                                            company_id,
                                            fvalue.toString(),
                                            'subModule1',
                                        );

                                    for (const [
                                        sfkey,
                                        sfvalue,
                                    ] of Object.entries(submenu)) {
                                        const cronDatatmp = { ...cronData };
                                        cronDatatmp.suboption1value = sfkey;
                                        cronDatatmp.subRequest = '1';
                                        cronDatatmp.getType = '1';

                                        const lang_translation = `${parent_val}_${sidebar_value}_${company_id}_${fvalue}_${sfkey}`;
                                        const translation_done =
                                            await this.getModuleOptionLists(
                                                cronDatatmp,
                                            );
                                        if (translation_done === true) {
                                            lang_translation_array[
                                                `${lang_translation}_eng`
                                            ] = 1;
                                            const existFileCheck =
                                                await this.checkForExistFile(
                                                    this.bucket,
                                                    Object.fromEntries(
                                                        resLang
                                                            .filter(
                                                                (l) =>
                                                                    l.alias !==
                                                                    'eng',
                                                            )
                                                            .map((l) => [
                                                                `${lang_translation}_${l.alias}`,
                                                                0,
                                                            ]),
                                                    ),
                                                );
                                            Object.assign(
                                                lang_translation_array,
                                                existFileCheck,
                                            );
                                        }
                                    }
                                } else if (
                                    parent_val === 'Emotionalwellbeing' &&
                                    sidebar_value === 'Emotionalwellbeing'
                                ) {
                                    const lang_translation = `${parent_val}_${sidebar_value}_${company_id}_${fkey}`;
                                    const translation_done =
                                        await this.getModuleOptionLists(
                                            cronData,
                                        );

                                    if (typeof translation_done === 'object') {
                                        const cronDatatmp = { ...cronData };
                                        cronDatatmp.subRequest = '1';
                                        const submenu = translation_done;

                                        if (
                                            submenu.post &&
                                            submenu.post.length > 0
                                        ) {
                                            cronDatatmp.getType = '2';
                                            for (const [
                                                sfkey,
                                                sfvalue,
                                            ] of Object.entries(submenu.post)) {
                                                cronDatatmp.suboption2value =
                                                    sfkey;
                                                await this.getModuleOptionLists(
                                                    cronDatatmp,
                                                );
                                            }
                                        }
                                        if (
                                            submenu.category &&
                                            submenu.category.length > 0
                                        ) {
                                            cronDatatmp.getType = '1';
                                            delete cronDatatmp.suboption2value;
                                            for (const [
                                                sfkey,
                                                sfvalue,
                                            ] of Object.entries(
                                                submenu.category,
                                            )) {
                                                cronDatatmp.suboption1value =
                                                    sfkey;
                                                await this.getModuleOptionLists(
                                                    cronDatatmp,
                                                );
                                            }
                                        }
                                    }

                                    lang_translation_array[
                                        `${lang_translation}_eng`
                                    ] = 1;
                                    const existFileCheck =
                                        await this.checkForExistFile(
                                            this.bucket,
                                            Object.fromEntries(
                                                resLang
                                                    .filter(
                                                        (l) =>
                                                            l.alias !== 'eng',
                                                    )
                                                    .map((l) => [
                                                        `${lang_translation}_${l.alias}`,
                                                        0,
                                                    ]),
                                            ),
                                        );
                                    Object.assign(
                                        lang_translation_array,
                                        existFileCheck,
                                    );
                                } else {
                                    let lang_translation = `${parent_val}_${sidebar_value}_${company_id}_${fkey}`;

                                    if (fkey === 'eha') {
                                        lang_translation = `${parent_val}_${sidebar_value}_${fkey}_${company_id}`;
                                        cronData.selectorgfieldlist = fkey;
                                        cronData.selectformfieldlist =
                                            company_id;
                                    }

                                    if (
                                        parent_val === 'Trackers' &&
                                        sidebar_value === 'Nutrition'
                                    ) {
                                        cronData.selectorgfieldlist = fkey;
                                        cronData.selectformfieldlist = '';
                                        const fkeyTrimmed = fkey.replace(
                                            /^0+/,
                                            '',
                                        );
                                    }

                                    if (
                                        subDataInChallengeActivity ||
                                        nutritionActivity ||
                                        quizCategoryData ||
                                        subDataInCampaignCategory
                                    ) {
                                        lang_translation = `${parent_val}_${sidebar_value}_${fkey}`;
                                    }

                                    const translation_done =
                                        await this.getModuleOptionLists(
                                            cronData,
                                        );
                                    if (translation_done === true) {
                                        lang_translation_array[
                                            `${lang_translation}_eng`
                                        ] = 1;
                                        const existFileCheck =
                                            await this.checkForExistFile(
                                                this.bucket,
                                                Object.fromEntries(
                                                    resLang
                                                        .filter(
                                                            (l) =>
                                                                l.alias !==
                                                                'eng',
                                                        )
                                                        .map((l) => [
                                                            `${lang_translation}_${l.alias}`,
                                                            0,
                                                        ]),
                                                ),
                                            );
                                        Object.assign(
                                            lang_translation_array,
                                            existFileCheck,
                                        );
                                    }
                                }
                            }
                        } else {
                            const lang_translation = `${parent_val}_${sidebar_value}_${company_id}`;
                            const translation_done =
                                await this.getModuleOptionLists(cronData);
                            if (translation_done === true) {
                                lang_translation_array[
                                    `${lang_translation}_eng`
                                ] = 1;
                                const existFileCheck =
                                    await this.checkForExistFile(
                                        this.bucket,
                                        Object.fromEntries(
                                            resLang
                                                .filter(
                                                    (l) => l.alias !== 'eng',
                                                )
                                                .map((l) => [
                                                    `${lang_translation}_${l.alias}`,
                                                    0,
                                                ]),
                                        ),
                                    );
                                Object.assign(
                                    lang_translation_array,
                                    existFileCheck,
                                );
                            }
                        }
                    }
                }

                if (Object.keys(lang_translation_array).length > 0) {
                    await this.updateTranslationStatusCreateArray(
                        this.bucket,
                        lang_translation_array,
                        parent_val,
                        sidebar_value,
                    );
                }

                await this.updateMenuStatus(this.bucket, translationsQue, 1);
                return `${translationsQue} Translation File Created Successfully.`;
            }

            return 'All Translation File Created.';
        } catch (error) {
            Logger.log(`Error in translationFileCreate: ${error.message}`);
            throw error;
        }
    }

    async checkForExistFile(
        bucket: string,
        lang_translation_array: Record<string, number>,
    ): Promise<Record<string, number>> {
        const result = { ...lang_translation_array };

        for (const [translations_que, cval] of Object.entries(
            lang_translation_array,
        )) {
            const menu = translations_que.split('_');
            const txt_type = 'dynamic';
            const parentFolder = menu[0];
            const sidebar_value = menu[1];
            const selectedOrg = menu[2];
            const selectedItem = menu[3] || '';
            const suboption1value = menu[4] || '';
            const language = menu[menu.length - 1];
            const languageData = await this.getLanguagesData();
            const lang =
                languageData.find((l) => l.key === language)?.localeFallback ||
                null;
            let selectedItemModified = selectedItem;
            if (
                parentFolder === 'MyHealth' &&
                sidebar_value === 'Assessment' &&
                selectedOrg === 'hra'
            ) {
                if (selectedItem === 'assessment') {
                    selectedItemModified = 'assessment_text';
                }
                if (selectedItem === 'biometrocs') {
                    selectedItemModified = 'biometrocs_text';
                }
            }

            let destLangJsonFile = '';

            if (selectedOrg !== '' && language === selectedItem) {
                destLangJsonFile = `${this.path}/${lang}/LC_MESSAGES/${parentFolder}/${sidebar_value}/${selectedOrg}/${txt_type}.json`;
            } else if (
                sidebar_value === 'Fitnessvideos' &&
                selectedItem === 'Video' &&
                suboption1value !== ''
            ) {
                destLangJsonFile = `${this.path}/${lang}/LC_MESSAGES/${parentFolder}/${sidebar_value}/${selectedOrg}/${selectedItem}/${suboption1value}/${txt_type}.json`;
            } else if (selectedOrg !== '' && selectedItem !== '') {
                destLangJsonFile = `${this.path}/${lang}/LC_MESSAGES/${parentFolder}/${sidebar_value}/${selectedOrg}/${selectedItemModified}/${txt_type}.json`;
            }

            if (destLangJsonFile) {
                const fileExists = await lastValueFrom(
                    this.commonMicroservice.send(
                        { cmd: 'check_file' },
                        { prefix: destLangJsonFile },
                    ),
                );
                /*
                const fileExists = await this.awsS3Service.getBucketFileInfo(
                    bucket,
                    destLangJsonFile,
                );*/
                result[translations_que] = fileExists ? 1 : 0;
            }
        }

        return result;
    }

    async updateTranslationStatusCreate(
        bucket: string,
        completeTranslationMenu: string,
        status: number,
    ): Promise<void> {
        const TranslationFile = `${this.path}/all_translation_status.json`;
        const TranslationData =
            await this.getTranslationFileData(TranslationFile);
        TranslationData[completeTranslationMenu] = status;
        await this.saveTranslationFile(
            bucket,
            TranslationFile,
            TranslationData,
        );
    }

    async updateTranslationStatusCreateArray(
        bucket: string,
        completeTranslationMenu: Record<string, number>,
        parent_val?: string,
        sidebar_value?: string,
    ): Promise<void> {
        const TranslationFile = `${this.path}/cron/${parent_val}/${sidebar_value}/all_translation_status.json`;
        const existingData = await this.getTranslationFileData(TranslationFile);
        const TranslationData = { ...existingData, ...completeTranslationMenu };
        await this.saveTranslationFile(
            bucket,
            TranslationFile,
            TranslationData,
        );
    }

    async menuCronTranslationTimeWise(): Promise<string> {
        try {
            const menu_translation_status_Json_Filetmp = `${this.path}/menu_translation_status.json`;
            let menu_translation_status_Json_File =
                await this.getTranslationFileData(
                    menu_translation_status_Json_Filetmp,
                );

            if (
                !menu_translation_status_Json_File ||
                Object.keys(menu_translation_status_Json_File).length === 0
            ) {
                menu_translation_status_Json_File =
                    this.getDefaultMenuTranslationData();
                await this.saveTranslationFile(
                    this.bucket,
                    menu_translation_status_Json_Filetmp,
                    menu_translation_status_Json_File,
                );
            }

            const inProgressMenu = Object.entries(
                menu_translation_status_Json_File,
            ).find(([key, value]) => value === 2 || value === 3);

            if (inProgressMenu) {
                return `Menu ${inProgressMenu[0]} already in progress (status: ${inProgressMenu[1]})`;
            }

            let targetMenu = null;
            for (const [menuKey, status] of Object.entries(
                menu_translation_status_Json_File,
            )) {
                if (status === 1) {
                    targetMenu = menuKey;
                    break;
                }
            }

            if (!targetMenu) {
                return 'No menu ready for translation processing';
            }

            const menuParts = targetMenu.split('_');
            const parent_val = menuParts[0];
            const sidebar_value = menuParts[1];

            await this.updateMenuStatus(this.bucket, targetMenu, 3);

            const dynamicFilePath = `${this.path}/cron/${parent_val}/${sidebar_value}/all_translation_status.json`;
            console.log('dynamicFilePath', dynamicFilePath);
            const translation_status_json_decode =
                await this.getTranslationFileData(dynamicFilePath);

            if (
                !translation_status_json_decode ||
                Object.keys(translation_status_json_decode).length === 0
            ) {
                console.log(
                    `No translation data found for ${parent_val}_${sidebar_value}`,
                );
                await this.updateMenuStatus(this.bucket, targetMenu, 1);
                return `No translation data found for ${parent_val}_${sidebar_value}`;
            }

            const translationInProgress = Object.entries(
                translation_status_json_decode,
            ).find(([key, value]) => value === 2);

            if (translationInProgress) {
                return `Translation already in progress: ${translationInProgress[0]}`;
            }

            const pendingTranslations = Object.fromEntries(
                Object.entries(translation_status_json_decode).filter(
                    ([key, value]) => value === 0,
                ),
            );

            if (Object.keys(pendingTranslations).length === 0) {
                console.log(
                    `No pending translations for ${parent_val}_${sidebar_value}`,
                );

                await this.updateMenuStatus(this.bucket, targetMenu, 4);

                return `All translations completed for ${parent_val}_${sidebar_value}`;
            }

            const languageData = await this.getLanguagesData();
            const langList = languageData.reduce((acc, lang) => {
                acc[lang.key] = lang;
                return acc;
            }, {});
            const translationStatusData = { ...translation_status_json_decode };
            for (const [key, value] of Object.entries(pendingTranslations)) {
                translationStatusData[key] = 2;
                await this.saveTranslationFile(
                    this.bucket,
                    dynamicFilePath,
                    translationStatusData,
                );
                const translationStatus =
                    await this.menuTranslationWithoutStatusUpdate(
                        this.bucket,
                        key,
                        langList,
                    );
                translationStatusData[key] = translationStatus;
            }
            await this.saveTranslationFile(
                this.bucket,
                dynamicFilePath,
                translationStatusData,
            );
            const stillPending = Object.values(translationStatusData).some(
                (status) => status === 0 || status === 2,
            );

            if (!stillPending) {
                await this.updateMenuStatus(this.bucket, targetMenu, 4);
                return `All translations completed for ${parent_val}_${sidebar_value}`;
            }

            return `Translations processed for ${parent_val}_${sidebar_value}, more pending`;
        } catch (error) {
            Logger.log(
                `Error in menuCronTranslationTimeWise: ${error.message}`,
            );
            throw error;
        }
    }

    async menuTranslationWithoutStatusUpdate(
        bucket: string,
        translations_que: string,
        langList: Record<string, string>,
    ): Promise<number> {
        try {
            if (!translations_que) {
                return 11;
            }

            const menu = translations_que.split('_');
            const txt_type = 'dynamic';
            const parentFolder = menu[0];
            const sidebar_value = menu[1];
            const selectedOrg = menu[2];
            const selectedItem = menu[3] || '';
            const suboption1value = menu[4] || '';
            const language = menu[menu.length - 1];
            const lang = langList[language]['localeFallback'];

            let selectedItemModified = selectedItem;
            if (
                parentFolder === 'MyHealth' &&
                sidebar_value === 'Assessment' &&
                selectedOrg === 'hra'
            ) {
                if (selectedItem === 'assessment') {
                    selectedItemModified = 'assessment_text';
                }
                if (selectedItem === 'biometrocs') {
                    selectedItemModified = 'biometrocs_text';
                }
            }

            let sourceLangJsonFile = '';
            let destLangFolder = '';
            let destLangJsonFile = '';

            if (selectedOrg !== '' && language === selectedItem) {
                sourceLangJsonFile = `${this.path}/eng/LC_MESSAGES/${parentFolder}/${sidebar_value}/${selectedOrg}/${txt_type}.json`;
                destLangFolder = `${this.path}/${lang}/LC_MESSAGES/${parentFolder}/${sidebar_value}/${selectedOrg}`;
                destLangJsonFile = `${this.path}/${lang}/LC_MESSAGES/${parentFolder}/${sidebar_value}/${selectedOrg}/${txt_type}.json`;
            } else if (
                sidebar_value === 'Fitnessvideos' &&
                selectedItem === 'Video' &&
                suboption1value !== ''
            ) {
                sourceLangJsonFile = `${this.path}/eng/LC_MESSAGES/${parentFolder}/${sidebar_value}/${selectedOrg}/${selectedItem}/${suboption1value}/${txt_type}.json`;
                destLangFolder = `${this.path}/${lang}/LC_MESSAGES/${parentFolder}/${sidebar_value}/${selectedOrg}/${selectedItem}/${suboption1value}`;
                destLangJsonFile = `${this.path}/${lang}/LC_MESSAGES/${parentFolder}/${sidebar_value}/${selectedOrg}/${selectedItem}/${suboption1value}/${txt_type}.json`;
            } else if (selectedOrg !== '' && selectedItem !== '') {
                sourceLangJsonFile = `${this.path}/eng/LC_MESSAGES/${parentFolder}/${sidebar_value}/${selectedOrg}/${selectedItemModified}/${txt_type}.json`;
                destLangFolder = `${this.path}/${lang}/LC_MESSAGES/${parentFolder}/${sidebar_value}/${selectedOrg}/${selectedItemModified}`;
                destLangJsonFile = `${this.path}/${lang}/LC_MESSAGES/${parentFolder}/${sidebar_value}/${selectedOrg}/${selectedItemModified}/${txt_type}.json`;
            }
            const translatedData = await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'lang_demo_full' },
                    {
                        sourcePath: sourceLangJsonFile,
                        destinationPath: destLangJsonFile,
                        sourceLang: 'en',
                        targetLang: language,
                        type: 'dynamic',
                    },
                ),
            );

            const statusFromError = (data: string): number | null => {
                if (!data.startsWith('ERROR:')) return null;
                if (data.includes('Failed to get file from S3.')) {
                    return 5;
                }
                return 11;
            };

            let status: number;
            if (typeof translatedData === 'string') {
                const errorStatus = statusFromError(translatedData);
                status = errorStatus !== null ? errorStatus : 1;
            } else {
                status = 10;
            }

            return status;
        } catch (error) {
            Logger.log(
                `Error in menuTranslationWithoutStatusUpdate: ${error.message}`,
            );
            return 11;
        }
    }

    private getDefaultMenuTranslationData(): Record<string, number> {
        return {
            Events_Category: 0,
            Reimbursements_SubmitForm: 0,
            Common_QuestionnairePopup: 0,
            Common_SpouseAuthorizedPopup: 0,
            Common_LoginPopup: 0,
            Trackers_CovidPassport: 0,
            MyPlan_PlanLabel: 0,
            Activities_Activities: 0,
            Common_Agreement: 0,
            Common_InformationPopup: 0,
            Support_Support: 0,
            HealthForms_SubmitForm: 0,
            Common_CovidPopup: 0,
            Common_Menu: 0,
            QuickLink_QuickLink: 0,
            MyHealth_Assessment: 0,
            Common_SurveyPopup: 0,
            Dashboard_UpcomingActivities: 0,
            Campaign_Category: 0,
            ActivityForms_SubmitForm: 0,
            Media_Media: 0,
            Campaign_Campaigns: 0,
            Reimbursements_Activities: 0,
            Quizzes_Categories: 0,
            ActivityForms_Activities: 0,
            Quizzes_Quizzes: 0,
            Events_Events: 0,
            MyPlan_MyPlan: 0,
            ...Object.fromEntries(
                Array.from({ length: 34 }, (_, i) => [
                    `Trackers_Nutrition_${i + 1}`,
                    0,
                ]),
            ),
            Challenge_Activity: 0,
            Challenge_MyChallenges: 0,
            Media_Fitnessvideos: 0,
            Emotionalwellbeing_Emotionalwellbeing: 0,
            OrgAdmin_Department: 0,
            OrgAdmin_Location: 0,
        };
    }

    private async getModuleOptionLists(cronData: any): Promise<boolean | any> {
        try {
            const selectLanguage = cronData.selectLanguage || 'eng';
            const sidebar_value = cronData.sidebar_value;
            const parent_val = cronData.parent_val;
            const selectText = cronData.selectText;
            const refreshData = cronData.refreshData || '0';
            const selectformfieldlist = cronData.selectformfieldlist || '';
            const selectorgfieldlist = cronData.selectorgfieldlist || '';
            const selectsuboption1value = cronData.suboption1value || '';
            const selectsuboption2value = cronData.suboption2value || '';
            const subRequest = cronData.subRequest || '0';
            const getType = cronData.getType || '0';
            const run_type = cronData.run_type || 'web';

            let json_orgoptionvalue: any = {};
            let json_optionvalue: any = {};
            let json_suboption1value: any = {};
            let json_suboption2value: any = {};

            let processedSelectorgfieldlist = selectorgfieldlist;
            let processedSelectformfieldlist = selectformfieldlist;
            let processedSelectsuboption1value = selectsuboption1value;
            let processedSelectsuboption2value = selectsuboption2value;
            if (selectText === 'dynamic') {
                json_orgoptionvalue =
                    await this.translationCommonService.getDynamicOrgData(
                        parent_val,
                        sidebar_value,
                    );
                if (
                    json_orgoptionvalue &&
                    Object.keys(json_orgoptionvalue).length > 0 &&
                    (!processedSelectorgfieldlist ||
                        processedSelectorgfieldlist === 'null')
                ) {
                    if (parent_val === 'QuickLink') {
                        json_orgoptionvalue = {
                            '0': 'Global Folder & Quicklinks',
                            ...json_orgoptionvalue,
                        };
                    } else if (parent_val === 'Events') {
                        json_orgoptionvalue = {
                            '0': 'Global Events',
                            ...json_orgoptionvalue,
                        };
                    } else if (
                        parent_val === 'Media' &&
                        sidebar_value === 'Fitnessvideos'
                    ) {
                        json_orgoptionvalue = {
                            '0': 'Global Media',
                            ...json_orgoptionvalue,
                        };
                    } else if (
                        parent_val === 'ActivityForms' &&
                        sidebar_value === 'Activities'
                    ) {
                        json_orgoptionvalue = {
                            '0': 'Global Activity',
                            ...json_orgoptionvalue,
                        };
                    } else if (
                        parent_val === 'Reimbursements' &&
                        sidebar_value === 'Activities'
                    ) {
                        json_orgoptionvalue = {
                            '0': 'Global Activity',
                            ...json_orgoptionvalue,
                        };
                    } else if (
                        parent_val === 'Challenge' &&
                        sidebar_value === 'MyChallenges'
                    ) {
                        json_orgoptionvalue = {
                            '0': 'Global Challenge',
                            ...json_orgoptionvalue,
                        };
                    } else if (
                        parent_val === 'Common' &&
                        sidebar_value === 'CovidPopup'
                    ) {
                        json_orgoptionvalue = {
                            '0': 'Global Vaccination Type',
                            ...json_orgoptionvalue,
                        };
                    } else if (
                        parent_val === 'Quizzes' &&
                        sidebar_value === 'Quizzes'
                    ) {
                        json_orgoptionvalue = {
                            '0': 'Global Quizzes',
                            ...json_orgoptionvalue,
                        };
                    }
                    processedSelectorgfieldlist =
                        Object.keys(json_orgoptionvalue)[0];
                }

                if (
                    (parent_val === 'Quizzes' &&
                        sidebar_value === 'Categories') ||
                    (parent_val === 'Challenge' &&
                        sidebar_value === 'Activity') ||
                    (parent_val === 'Campaign' && sidebar_value === 'Category')
                ) {
                    json_orgoptionvalue = {};
                    processedSelectorgfieldlist = '';
                }

                json_optionvalue =
                    await this.translationCommonService.getDynamicModuleData(
                        parent_val,
                        sidebar_value,
                        processedSelectorgfieldlist,
                    );
                if (
                    json_optionvalue &&
                    Object.keys(json_optionvalue).length > 0 &&
                    (!processedSelectformfieldlist ||
                        processedSelectformfieldlist === 'null')
                ) {
                    processedSelectformfieldlist =
                        Object.keys(json_optionvalue)[0];
                    processedSelectformfieldlist =
                        processedSelectformfieldlist.trim();
                } else {
                    processedSelectformfieldlist = String(
                        processedSelectformfieldlist,
                    ).trim();
                }
                if (
                    (parent_val === 'Emotionalwellbeing' ||
                        (sidebar_value === 'Fitnessvideos' &&
                            processedSelectformfieldlist === 'Video')) &&
                    (getType === '0' || getType === '1')
                ) {
                    json_suboption1value =
                        await this.translationCommonService.getDynamicSubModuleData(
                            parent_val,
                            sidebar_value,
                            processedSelectorgfieldlist,
                            processedSelectformfieldlist,
                            'subModule1',
                        );
                    if (
                        !processedSelectsuboption1value ||
                        processedSelectsuboption1value === 'null'
                    ) {
                        processedSelectsuboption1value =
                            json_suboption1value &&
                            Object.keys(json_suboption1value).length > 0
                                ? Object.keys(json_suboption1value)[0]
                                : '';
                    }
                }

                if (
                    parent_val === 'Emotionalwellbeing' &&
                    (getType === '0' || getType === '2')
                ) {
                    json_suboption2value =
                        await this.translationCommonService.getDynamicSubModuleData(
                            parent_val,
                            sidebar_value,
                            processedSelectorgfieldlist,
                            processedSelectformfieldlist,
                            'subModule2',
                        );

                    if (
                        !processedSelectsuboption2value ||
                        processedSelectsuboption2value === 'null'
                    ) {
                        processedSelectsuboption2value =
                            json_suboption2value &&
                            Object.keys(json_suboption2value).length > 0
                                ? Object.keys(json_suboption2value)[0]
                                : '';
                    }
                }

                if (
                    parent_val === 'Trackers' &&
                    sidebar_value === 'Nutrition'
                ) {
                    processedSelectorgfieldlist =
                        processedSelectorgfieldlist.replace(/^0+/, '');
                }
            }
            const datas = await this.getAjaxData(
                selectLanguage,
                sidebar_value,
                parent_val,
                selectText,
                processedSelectorgfieldlist,
                processedSelectformfieldlist,
                json_suboption1value,
                json_suboption2value,
                processedSelectsuboption1value,
                processedSelectsuboption2value,
                subRequest,
                getType,
                refreshData,
                run_type,
            );
            return datas;
        } catch (error) {
            Logger.log(`Error in getModuleOptionLists: ${error.message}`);
            throw error;
        }
    }

    private async getAjaxData(
        selectLanguage: string,
        sidebar_value: string,
        parent_val: string,
        selectText: string,
        selectorgfieldlist: string,
        selectformfieldlist: string,
        json_suboption1value: any,
        json_suboption2value: any,
        selectsuboption1value: string,
        selectsuboption2value: string,
        subRequest: string,
        getType: string,
        refreshData: string,
        run_type: string,
    ): Promise<any> {
        try {
            const path = 'Locale';
            let sub1translations: any = {};
            let sub1translationsLabelArry: any = {};
            let sub2translations: any = {};
            let sub2translationsLabelArry: any = {};
            let translations: any = {};
            let translationsLabelArry: any = {};
            let TransalatedData: any = {};
            let DynamicJsonFile = '';
            let DynamicDefaultJsonFile = '';
            let DynamicDefaultPath = '';

            const language_value =
                await this.getLanguageCatalog(selectLanguage);

            if (selectText === 'dynamic') {
                if (
                    selectorgfieldlist !== '' &&
                    selectorgfieldlist !== '0' &&
                    selectformfieldlist === ''
                ) {
                    DynamicDefaultPath = `${path}/eng/LC_MESSAGES/${parent_val}/${sidebar_value}/${selectorgfieldlist}`;
                    DynamicDefaultJsonFile = `${path}/eng/LC_MESSAGES/${parent_val}/${sidebar_value}/${selectorgfieldlist}/${selectText}.json`;
                    DynamicJsonFile = `${path}/${language_value.locale}/LC_MESSAGES/${parent_val}/${sidebar_value}/${selectorgfieldlist}/${selectText}.json`;
                } else if (
                    selectorgfieldlist === '' &&
                    selectformfieldlist !== ''
                ) {
                    DynamicDefaultPath = `${path}/eng/LC_MESSAGES/${parent_val}/${sidebar_value}/${selectformfieldlist}`;
                    DynamicDefaultJsonFile = `${path}/eng/LC_MESSAGES/${parent_val}/${sidebar_value}/${selectformfieldlist}/${selectText}.json`;
                    DynamicJsonFile = `${path}/${language_value.locale}/LC_MESSAGES/${parent_val}/${sidebar_value}/${selectformfieldlist}/${selectText}.json`;
                } else {
                    if (
                        sidebar_value === 'Emotionalwellbeing' &&
                        parent_val === 'Emotionalwellbeing'
                    ) {
                        DynamicDefaultPath = `${path}/eng/LC_MESSAGES/${parent_val}/${sidebar_value}/${selectorgfieldlist}/${selectformfieldlist}`;
                        DynamicDefaultJsonFile = `${path}/eng/LC_MESSAGES/${parent_val}/${sidebar_value}/${selectorgfieldlist}/${selectformfieldlist}/${selectText}.json`;
                        DynamicJsonFile = `${path}/${language_value.locale}/LC_MESSAGES/${parent_val}/${sidebar_value}/${selectorgfieldlist}/${selectformfieldlist}/${selectText}.json`;
                    } else {
                        if (selectsuboption1value !== '') {
                            DynamicDefaultPath = `${path}/eng/LC_MESSAGES/${parent_val}/${sidebar_value}/${selectorgfieldlist}/${selectformfieldlist}/${selectsuboption1value}`;
                            DynamicDefaultJsonFile = `${path}/eng/LC_MESSAGES/${parent_val}/${sidebar_value}/${selectorgfieldlist}/${selectformfieldlist}/${selectsuboption1value}/${selectText}.json`;
                            DynamicJsonFile = `${path}/${language_value.locale}/LC_MESSAGES/${parent_val}/${sidebar_value}/${selectorgfieldlist}/${selectformfieldlist}/${selectsuboption1value}/${selectText}.json`;
                        }
                        if (selectsuboption2value !== '') {
                            DynamicDefaultPath = `${path}/eng/LC_MESSAGES/${parent_val}/${sidebar_value}/${selectorgfieldlist}/${selectformfieldlist}/${selectsuboption2value}`;
                            DynamicDefaultJsonFile = `${path}/eng/LC_MESSAGES/${parent_val}/${sidebar_value}/${selectorgfieldlist}/${selectformfieldlist}/${selectsuboption2value}/${selectText}.json`;
                            DynamicJsonFile = `${path}/${language_value.locale}/LC_MESSAGES/${parent_val}/${sidebar_value}/${selectorgfieldlist}/${selectformfieldlist}/${selectsuboption2value}/${selectText}.json`;
                        }
                        if (
                            selectsuboption1value === '' &&
                            selectsuboption2value === ''
                        ) {
                            DynamicDefaultPath = `${path}/eng/LC_MESSAGES/${parent_val}/${sidebar_value}/${selectorgfieldlist}/${selectformfieldlist}`;
                            DynamicDefaultJsonFile = `${path}/eng/LC_MESSAGES/${parent_val}/${sidebar_value}/${selectorgfieldlist}/${selectformfieldlist}/${selectText}.json`;
                            DynamicJsonFile = `${path}/${language_value.locale}/LC_MESSAGES/${parent_val}/${sidebar_value}/${selectorgfieldlist}/${selectformfieldlist}/${selectText}.json`;
                        }
                    }
                }

                const translationstmp = await this.getTranslationFileData(
                    DynamicDefaultJsonFile,
                );
                if (
                    translationstmp &&
                    Object.keys(translationstmp).length > 0
                ) {
                    return true;
                }
                if (
                    Object.keys(translationstmp).length > 0 &&
                    refreshData === '0'
                ) {
                    if (
                        selectorgfieldlist !== '' &&
                        selectformfieldlist !== '' &&
                        selectsuboption1value !== '' &&
                        (subRequest === '0' || subRequest === '1') &&
                        (getType === '0' || getType === '1')
                    ) {
                        sub1translations = translationstmp;
                    }
                    if (
                        selectorgfieldlist !== '' &&
                        selectformfieldlist !== '' &&
                        selectsuboption2value !== '' &&
                        (subRequest === '0' || subRequest === '1') &&
                        (getType === '0' || getType === '2')
                    ) {
                        sub2translations = translationstmp;
                    }
                    if (
                        ((selectorgfieldlist !== '' &&
                            selectformfieldlist !== '' &&
                            selectsuboption1value === '' &&
                            selectsuboption2value === '') ||
                            (selectorgfieldlist !== '' &&
                                selectformfieldlist === '' &&
                                selectsuboption1value === '' &&
                                selectsuboption2value === '') ||
                            (selectorgfieldlist === '' &&
                                selectformfieldlist !== '' &&
                                selectsuboption1value === '' &&
                                selectsuboption2value === '')) &&
                        (subRequest === '0' || subRequest === '1') &&
                        (getType === '0' || getType === '2')
                    ) {
                        translations = translationstmp;
                    }
                }

                TransalatedData =
                    await this.getTranslationFileData(DynamicJsonFile);
            } else {
                let loadJsonFile = '';
                if (parent_val === 'Api') {
                    loadJsonFile = `${path}/eng/LC_MESSAGES/${parent_val}/${selectText}`;
                } else {
                    loadJsonFile = `${path}/eng/LC_MESSAGES/${parent_val}/${sidebar_value}/${selectText}`;
                }

                const buckettype =
                    selectText === 'static' ? 'public' : 'private';

                const englishData = await this.getTranslationFileData(
                    loadJsonFile + '.json',
                );
                translations = englishData;
                if (Object.keys(translations).length > 0) {
                    if (parent_val === 'Api') {
                        const filtered: any = {};
                        Object.keys(translations).forEach((key) => {
                            if (key.startsWith(sidebar_value + '_')) {
                                filtered[key] = translations[key];
                            }
                        });
                        translations = filtered;
                    }

                    let loadOtherJsonFile = '';
                    if (parent_val === 'Api') {
                        loadOtherJsonFile = `${path}/${language_value.locale}/LC_MESSAGES/${parent_val}/${selectText}`;
                    } else {
                        loadOtherJsonFile = `${path}/${language_value.locale}/LC_MESSAGES/${parent_val}/${sidebar_value}/${selectText}`;
                    }

                    TransalatedData = await this.getTranslationFileData(
                        loadOtherJsonFile + '.json',
                    );
                }
            }

            if (selectText === 'dynamic' && parent_val !== 'Api') {
                if (
                    Object.keys(translations).length === 0 &&
                    subRequest === '0'
                ) {
                    const getModuleData =
                        await this.translationCommonService.modulewiseFieldLanguage(
                            language_value,
                            sidebar_value,
                            parent_val,
                            selectText,
                            selectorgfieldlist,
                            selectformfieldlist,
                            json_suboption1value,
                            json_suboption2value,
                            selectsuboption1value,
                            selectsuboption2value,
                        );
                    translations = getModuleData[0] || {};
                    if (Object.keys(translations).length === 0) {
                        return false;
                    } else {
                        translationsLabelArry = getModuleData[1] || {};
                    }
                }

                if (
                    Object.keys(sub1translations).length === 0 &&
                    selectorgfieldlist !== '' &&
                    selectformfieldlist !== '' &&
                    selectsuboption1value !== '' &&
                    (subRequest === '0' || subRequest === '1') &&
                    (getType === '0' || getType === '1')
                ) {
                    const getsub1ModuleData =
                        await this.translationCommonService.submodulewiseFieldLanguage(
                            language_value,
                            sidebar_value,
                            parent_val,
                            selectText,
                            selectorgfieldlist,
                            selectformfieldlist,
                            json_suboption1value,
                            json_suboption2value,
                            selectsuboption1value,
                            selectsuboption2value,
                            subRequest,
                            '1',
                        );
                    sub1translations = getsub1ModuleData[0] || {};
                    if (Object.keys(sub1translations).length > 0) {
                        sub1translationsLabelArry = getsub1ModuleData[1] || {};
                    } else {
                        return false;
                    }
                } else if (
                    parent_val === 'Emotionalwellbeing' &&
                    Object.keys(sub1translations).length > 0 &&
                    selectorgfieldlist !== '' &&
                    selectformfieldlist !== '' &&
                    selectsuboption1value !== '' &&
                    (subRequest === '0' || subRequest === '1') &&
                    (getType === '0' || getType === '1')
                ) {
                    const expldKey =
                        selectsuboption1value.replace(/[^a-zA-Z0-9]/g, '') +
                        '_' +
                        selectorgfieldlist +
                        '_' +
                        selectformfieldlist;

                    if (sub1translations[expldKey]) {
                        const sub1translationss: any = {};
                        sub1translationss[expldKey] =
                            sub1translations[expldKey];
                        sub1translations = sub1translationss;
                    } else {
                        const getsub1ModuleData =
                            await this.translationCommonService.submodulewiseFieldLanguage(
                                language_value,
                                sidebar_value,
                                parent_val,
                                selectText,
                                selectorgfieldlist,
                                selectformfieldlist,
                                json_suboption1value,
                                json_suboption2value,
                                selectsuboption1value,
                                selectsuboption2value,
                                subRequest,
                                '1',
                            );
                        sub1translations = getsub1ModuleData[0] || {};
                        if (Object.keys(sub1translations).length > 0) {
                            sub1translationsLabelArry =
                                getsub1ModuleData[1] || {};
                        } else {
                            return false;
                        }
                    }
                }

                if (
                    Object.keys(sub2translations).length === 0 &&
                    selectorgfieldlist !== '' &&
                    selectformfieldlist !== '' &&
                    selectsuboption2value !== '' &&
                    (subRequest === '0' || subRequest === '1') &&
                    (getType === '0' || getType === '2')
                ) {
                    const getsub2ModuleData =
                        await this.translationCommonService.submodulewiseFieldLanguage(
                            language_value,
                            sidebar_value,
                            parent_val,
                            selectText,
                            selectorgfieldlist,
                            selectformfieldlist,
                            json_suboption1value,
                            json_suboption2value,
                            selectsuboption1value,
                            selectsuboption2value,
                            subRequest,
                            '2',
                        );
                    sub2translations = getsub2ModuleData[0] || {};
                    if (Object.keys(sub2translations).length > 0) {
                        sub2translationsLabelArry = getsub2ModuleData[1] || {};
                    }
                } else if (
                    parent_val === 'Emotionalwellbeing' &&
                    Object.keys(sub2translations).length > 0 &&
                    selectorgfieldlist !== '' &&
                    selectformfieldlist !== '' &&
                    selectsuboption2value !== '' &&
                    (subRequest === '0' || subRequest === '1') &&
                    (getType === '0' || getType === '2')
                ) {
                    const expld2Key =
                        selectformfieldlist +
                        '_' +
                        selectsuboption2value +
                        '_' +
                        selectorgfieldlist;

                    if (sub2translations['post_title_' + expld2Key]) {
                        const sub2translationss: any = {};
                        sub2translationss['post_title_' + expld2Key] =
                            sub2translations['post_title_' + expld2Key];
                        sub2translationss['post_linktitle_' + expld2Key] =
                            sub2translations['post_linktitle_' + expld2Key];
                        sub2translationss['post_shortdesc_' + expld2Key] =
                            sub2translations['post_shortdesc_' + expld2Key];
                        sub2translationss['post_moredesc_' + expld2Key] =
                            sub2translations['post_moredesc_' + expld2Key];
                        sub2translations = sub2translationss;
                    } else {
                        const getsub2ModuleData =
                            await this.translationCommonService.submodulewiseFieldLanguage(
                                language_value,
                                sidebar_value,
                                parent_val,
                                selectText,
                                selectorgfieldlist,
                                selectformfieldlist,
                                json_suboption1value,
                                json_suboption2value,
                                selectsuboption1value,
                                selectsuboption2value,
                                subRequest,
                                '2',
                            );
                        sub2translations = getsub2ModuleData[0] || {};
                        if (Object.keys(sub2translations).length > 0) {
                            sub2translationsLabelArry =
                                getsub2ModuleData[1] || {};
                        }
                    }
                }

                const allSubData = {
                    ...translations,
                    ...sub1translations,
                    ...sub2translations,
                };

                if (Object.keys(allSubData).length > 0) {
                    if (selectText === 'dynamic') {
                        const existingData = await this.getTranslationFileData(
                            DynamicDefaultJsonFile,
                        );
                        let mergedData: any = {};

                        if (Object.keys(existingData).length === 0) {
                            mergedData = allSubData;
                        } else {
                            mergedData = { ...existingData, ...allSubData };
                        }
                        await this.saveTranslationFile(
                            this.bucket,
                            DynamicDefaultJsonFile,
                            mergedData,
                        );
                    } else {
                        const mkeJsonFile = `${path}/eng/LC_MESSAGES/${parent_val}/${sidebar_value}/dynamic.json`;
                        const existingData =
                            await this.getTranslationFileData(mkeJsonFile);
                        let mergedData: any = {};

                        if (Object.keys(existingData).length === 0) {
                            mergedData = allSubData;
                        } else {
                            mergedData = { ...existingData, ...allSubData };
                        }
                        await this.saveTranslationFile(
                            this.bucket,
                            mkeJsonFile,
                            mergedData,
                        );
                    }
                }

                if (run_type === 'cron') {
                    if (parent_val === 'Emotionalwellbeing') {
                        if (
                            Object.keys(json_suboption2value).length === 0 &&
                            Object.keys(json_suboption1value).length === 0
                        ) {
                            return Object.keys(allSubData).length > 0
                                ? true
                                : false;
                        } else {
                            return {
                                post: json_suboption2value,
                                category: json_suboption1value,
                            };
                        }
                    } else {
                        return Object.keys(allSubData).length > 0
                            ? true
                            : false;
                    }
                }
            }
            return false;
        } catch (error) {
            Logger.log(`Error in getAjaxData: ${error.message}`);
            throw error;
        }
    }

    private async getLanguageCatalog(languageAlias: string): Promise<any> {
        return { locale: languageAlias };
    }

    async getLanguagesData() {
        const cacheKey = 'languages_data';
        let languageData = this.cacheService.getCache(cacheKey);

        if (!languageData) {
            const languagesFile = `${this.path}/languages.json`;
            languageData = await this.getTranslationFileData(languagesFile);
            this.cacheService.setCache(
                cacheKey,
                JSON.stringify(languageData),
                300000,
            );
        } else {
            if (typeof languageData === 'string') {
                languageData = JSON.parse(languageData);
            }
        }
        return languageData;
    }
    async fileCheckLastUpdatedFile() {
        try {
            const menuFile = `${this.path}/menu_translation_status.json`;
            const updatedFiles = [];
            const maxIdleMinutes = 20;
            const idleTimeThreshold = new Date();
            idleTimeThreshold.setMinutes(
                idleTimeThreshold.getMinutes() - maxIdleMinutes,
            );

            const fileInfo = await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'list_file' },
                    { prefix: menuFile, userBucket: this.bucket },
                ),
            );

            if (fileInfo?.Contents && fileInfo.Contents.length > 0) {
                const fileLastModified = new Date(
                    fileInfo.Contents[0].LastModified,
                );

                if (fileLastModified < idleTimeThreshold) {
                    const menuData = await this.getTranslationFileData(menuFile);

                    if (menuData && Object.keys(menuData).length > 0) {
                        let hasChanges = false;

                        for (const [key, value] of Object.entries(menuData)) {
                            if (value === 2) {
                                menuData[key] = 0;
                                hasChanges = true;
                            } else if (value === 3) {
                                menuData[key] = 1;
                                hasChanges = true;

                                const menuParts = key.split('_');
                                const parent_val = menuParts[0];
                                const sidebar_value = menuParts[1];

                                const translationFile = `${this.path}/cron/${parent_val}/${sidebar_value}/all_translation_status.json`;

                                try {
                                    const translationData = await this.getTranslationFileData(translationFile);

                                    if (translationData && Object.keys(translationData).length > 0) {
                                        let translationHasChanges = false;

                                        for (const [tKey, tValue] of Object.entries(translationData)) {
                                            if (tValue === 2) {
                                                translationData[tKey] = 0;
                                                translationHasChanges = true;
                                            }
                                        }

                                        if (translationHasChanges) {
                                            await this.saveTranslationFile(
                                                this.bucket,
                                                translationFile,
                                                translationData,
                                            );
                                        }
                                    }
                                } catch (error) {
                                    console.log(`Error resetting translation file for ${key}: ${error.message}`);
                                }
                            }
                        }

                        if (hasChanges) {
                            await this.saveTranslationFile(
                                this.bucket,
                                menuFile,
                                menuData,
                            );

                            updatedFiles.push({
                                file: menuFile,
                                lastModified: fileInfo.Contents[0].LastModified,
                                notUpdatedForMinutes: Math.floor(
                                    (Date.now() - fileLastModified.getTime()) /
                                    60000,
                                ),
                            });
                        }
                    }
                }
            }

            if (updatedFiles.length === 0) {
                return 'No stuck files found';
            }

            return {
                message: 'Stuck menu processes reset successfully',
                totalFilesReset: updatedFiles.length,
                files: updatedFiles,
            };
        } catch (error) {
            console.log(`Error checking last updated files: ${error.message}`);
            return null;
        }
    }
}
