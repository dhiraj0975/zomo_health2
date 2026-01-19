import { ManualUpcomingsService } from "@/modules/upcomingactivities/manualupcomings/manualupcomings.service";
import { appConstant, CacheService, CommonFileService } from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';
import { lastValueFrom } from 'rxjs';
import { CompanyLanguagesService } from '../company/languages/languages.service';
import { LanguagesService } from '../master/languages/languages.service';
import { Translator } from './translator';
const TRANSLATIONS_DIR = appConstant.TRANSLATIONS_DIR || './src/local';
@Injectable()
export class TranslationService {
    constructor(private readonly translator: Translator,
        private readonly manualUpcomingsService: ManualUpcomingsService,
        private readonly commonFileService: CommonFileService,
        private readonly languagesService: LanguagesService,
        private readonly companylanguagesService: CompanyLanguagesService,
        private readonly cacheService: CacheService,
        @Inject('COMMON_SERVICE')
            private commonMicroservice: ClientProxy,

    ) {}
    translate(language: string, key: string): string {
        return this.translator.translate(language, key);
    }
    async readTranslationFile(fileName: string, type: string) {
        let dataFileRead = await lastValueFrom(this.commonMicroservice.send(
            { cmd: 'get_file' },
            {
                path: fileName,
                userBucket: type === 'dynamic' ? 'private' : 'public'
            }
        ));
        if (dataFileRead) {
            dataFileRead = Buffer.from(dataFileRead.Body, 'base64').toString('utf-8');
            return JSON.parse(dataFileRead);
        }
        return {};  // Return empty object if no data
    }
    updateTranslation(
        language: string,
        key: string,
        value: string,
        fileName?: string,
    ): void {
        this.translator.updateTranslation(language, key, value, fileName);
    }
    addTranslationToEnglish(
        fileName: string,
        file: any,
        language: string = 'en',
    ): void {
        this.translator.copyFile(fileName, file, language);
    }
    async uploadTranslation(
        createData: any,
    ) {
        let { file, type, fileName } = createData;
        await lastValueFrom(this.commonMicroservice.send(
            { cmd: 'upload_file' },
            {
                path: Buffer.from(file).toString('base64'),
                filename: fileName,
                userBucket: type === 'dynamic' ? 'private' : 'public'
            }
        ));
        this.cacheService.setCache(`${fileName}`, file, 60000);
        return;
    }
    async geTranslationPath(
        createData: any,
    ) {
        let { target_lang, file, menu, sub_menu, type, org_id } = createData;
        let language = target_lang?.trim() || '';
        language = language == '' ? 'eng' : language;
        let languageData = await this.translator.readFile("languages.json");
        let lang = languageData.find(ele => ele.name == language);
        language = lang ? lang?.lang_path : language;
        menu = menu?.trim().replace(/\s/g, '') || '';
        sub_menu = sub_menu?.trim().replace(/\s/g, '') || '';
        type = type?.trim().toLowerCase() || '';
        org_id = org_id?.trim() || '';
        if (sub_menu === 'Login Agreement') {
            sub_menu = 'agreement';
        }
        if (menu === 'Common' && sub_menu === 'Menu' && !org_id) {
            org_id = '0';
        }
        let pathArray = [`Locale/${language}/LC_MESSAGES`, menu, sub_menu];
        const isDynamic = type !== 'static text';
        if (isDynamic) {
            pathArray.push(org_id || '0');
        }
        let fileNameSuffix = type === 'static text' ? 'static' : 'dynamic';
        pathArray.push(`${fileNameSuffix}.json`);
        const fileName = pathArray.join('/');
        let aaa = await lastValueFrom(this.commonMicroservice.send(
            { cmd: 'upload_file' },
            {
                path: Buffer.from(JSON.stringify({ file })).toString('base64'),
                filename: fileName,
                userBucket: type === 'dynamic' ? 'private' : 'public'
            }
        ));
        this.cacheService.setCache(`${fileName}`, JSON.stringify(JSON.parse(JSON.stringify(file))), 60000);
        return;
    }
    async saveTranslation(
        fileName: string,
        file: any,
        language: string = 'eng',
    ) {
        if(language === '' || language === undefined){
            language = 'eng';
        }
        return await this.translator.saveFile(fileName, file, language);
    }
    async createTranslation(
        source_lang: string = 'en-US',
        target_lang: string,
        fileName: string,
        file: any
    ) {
        await this.translator.addFileTranslation(source_lang, target_lang, fileName, file);
    }
    async readTranslation(
        language: string,
        fileName: string,
        defaultValue: boolean = false
    ) {
        language = language == '' ? 'eng' : language;
        let languageData = await this.translator.readFile("languages.json");
        let lang = languageData.find(ele => ele.name == language);
        language = lang ? lang?.localeFallback : language;
        if(fileName.includes('.json')){
            return await this.translator.readTranslation(language, fileName, defaultValue);
        }
        else{
            if (!fs.existsSync(`${TRANSLATIONS_DIR}/${language}${fileName}`)) {
                await this.translator.saveFile(`${fileName}/static.json`, `{}`, language)
            }
            let data = this.commonFileService.loadTranslations(`${TRANSLATIONS_DIR}/${language}${fileName}`)
            let languageData = this.commonFileService.loadTranslations(`${TRANSLATIONS_DIR}/${language}${fileName}`)
            return await this.translator.readTranslationWithoutSubMenu(data, languageData);   
        }
    }
    async frontendReadTranslation(
        language: string = 'eng',
        text: string,
        path: string = `/LC_MESSAGES/Common/Common`,
        filename: string = 'static'
    ) {
        if(!path || path == ''){
            path = `/LC_MESSAGES/Common/Common`
        }
        let customname;
        filename = filename == '' ? 'static' : filename;
        language = language == '' ? 'eng' : language;
        let filePath = `${path}/${filename}.json`;
        let translation = await this.translator.readTranslation(language, `${filePath}`);
        if (translation.length) {
            const translationTranslateVal = Object.fromEntries(translation.map(item => [item.type, item.translate || item.english]));
            customname = translationTranslateVal[text] || text;
        }else{
            customname = text;
        }
        return customname;
    }
    async sideMenu(
        data: any = "transalationmenu.json",
    ) {
        const resultData = await this.translator.readFile(data);
        return resultData;
    }
    async DynamicEngJsonData(parentModule = null, orgId = null, dynamicDatas, method, subModule = null, itemId = null, item1Id = null, item2Id = null) {
        try {
            const localePath = 'Locale';
            const selectText = 'dynamic';
            let langTranslation = {};
            let dynamicDefaultPath = '';
            let dynamicDefaultJsonFile = '';
            if(orgId){
                orgId = orgId.toString()
            }
            if(itemId){
                itemId = itemId.toString()
            }
            if(item1Id){
                item1Id = item1Id.toString()
            }
            if(item2Id){
                item2Id = item2Id.toString()
            }
            if ((orgId !== '' || orgId !== '0' || orgId !== 0) && (itemId === '' || itemId === null)) {
            //if ((orgId !== '' && orgId !== '0' && orgId !== 0 && orgId !== null) && (itemId === '' || itemId === null)) {
                langTranslation["key"] = `${parentModule}_${subModule}_${orgId}`;
                langTranslation["org"] = orgId;
                dynamicDefaultPath = `${localePath}/eng/LC_MESSAGES/${parentModule}/${subModule}/${orgId}`;
                dynamicDefaultJsonFile = `${localePath}/eng/LC_MESSAGES/${parentModule}/${subModule}/${orgId}/${selectText}.json`;
            } else if ((orgId === '' || orgId === null) && itemId !== '') {
                langTranslation["key"] = `${parentModule}_${subModule}_${itemId}`;
                langTranslation["org"] = '0';
                dynamicDefaultPath = `${localePath}/eng/LC_MESSAGES/${parentModule}/${subModule}/${itemId}`;
                dynamicDefaultJsonFile = `${localePath}/eng/LC_MESSAGES/${parentModule}/${subModule}/${itemId}/${selectText}.json`;
            } else {
                if (subModule === 'Emotionalwellbeing' && parentModule === 'Emotionalwellbeing') {
                    langTranslation["key"] = `${parentModule}_${subModule}_${orgId}_${itemId}`;
                    langTranslation["org"] = orgId;
                    dynamicDefaultPath = `${localePath}/eng/LC_MESSAGES/${parentModule}/${subModule}/${orgId}/${itemId}`;
                    dynamicDefaultJsonFile = `${localePath}/eng/LC_MESSAGES/${parentModule}/${subModule}/${orgId}/${itemId}/${selectText}.json`;
                } else {
                    if (item1Id !== '' && item1Id !== null) {
                        langTranslation["key"] = `${parentModule}_${subModule}_${orgId}_${itemId}_${item1Id}`;
                        langTranslation["org"] = orgId;
                        dynamicDefaultPath = `${localePath}/eng/LC_MESSAGES/${parentModule}/${subModule}/${orgId}/${itemId}/${item1Id}`;
                        dynamicDefaultJsonFile = `${localePath}/eng/LC_MESSAGES/${parentModule}/${subModule}/${orgId}/${itemId}/${item1Id}/${selectText}.json`;
                    }
                    if (item2Id !== '' && item2Id !== null) {
                        langTranslation["key"] = `${parentModule}_${subModule}_${orgId}_${itemId}_${item2Id}`;
                        langTranslation["org"] = orgId;
                        dynamicDefaultPath = `${localePath}/eng/LC_MESSAGES/${parentModule}/${subModule}/${orgId}/${itemId}/${item2Id}`;
                        dynamicDefaultJsonFile = `${localePath}/eng/LC_MESSAGES/${parentModule}/${subModule}/${orgId}/${itemId}/${item2Id}/${selectText}.json`;
                    }
                    if ((item1Id === '' || item1Id === null) && (item2Id === '' || item2Id === null)) {
                        langTranslation["key"] = `${parentModule}_${subModule}_${orgId}_${itemId}`;
                        langTranslation["org"] = orgId;
                        dynamicDefaultPath = `${localePath}/eng/LC_MESSAGES/${parentModule}/${subModule}/${orgId}/${itemId}`;
                        dynamicDefaultJsonFile = `${localePath}/eng/LC_MESSAGES/${parentModule}/${subModule}/${orgId}/${itemId}/${selectText}.json`;
                    }
                }
            }
            if (method === 'Add' || method === 'Edit') {
                let dataFileRead
                let fileData = await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: dynamicDefaultJsonFile, userBucket: dynamicDefaultJsonFile.includes('dynamic') ? 'private' : 'public' }));
                if(fileData){
                    dataFileRead = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file'}, {path: dynamicDefaultJsonFile, userBucket: dynamicDefaultJsonFile.includes('dynamic') ? 'private' : 'public' }));
                    if(dataFileRead){
                        dataFileRead = Buffer.from(dataFileRead.Body, 'base64').toString('utf-8');
                        dataFileRead = JSON.parse(dataFileRead);
                        dataFileRead = {...dataFileRead, ...dynamicDatas};
                    }
                } else{
                    dataFileRead = dynamicDatas
                }
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: Buffer.from(JSON.stringify(dataFileRead)).toString('base64'),  filename: dynamicDefaultJsonFile, userBucket: dynamicDefaultJsonFile.includes('dynamic') ? 'private' : 'public'}));
                this.cacheService.setCache(`${dynamicDefaultJsonFile}`, JSON.stringify(JSON.parse(JSON.stringify(dataFileRead))), 60000);
            } else if (method === 'Delete') {
                if (subModule === 'CovidPopup' || dynamicDatas && Object.keys(dynamicDatas).length != 0) {
                    let dataFileRead = await lastValueFrom(this.commonMicroservice.send({
                        cmd: 'get_file'
                    }, {
                        path: dynamicDefaultJsonFile,
                        userBucket: dynamicDefaultJsonFile.includes('dynamic') ? 'private' : 'public'
                    }));

                    if (dataFileRead) {
                        dataFileRead = Buffer.from(dataFileRead.Body, 'base64').toString('utf-8');
                        dataFileRead = JSON.parse(dataFileRead);
                        const dynamicKeys = Object.keys(dynamicDatas);
                        let modified = false;
                        for (const fileKey in dataFileRead) {
                            if (dataFileRead.hasOwnProperty(fileKey)) {
                                for (const key of dynamicKeys) {
                                    if (fileKey.startsWith(key)) {
                                        delete dataFileRead[fileKey];
                                        modified = true;
                                        break;
                                    }
                                }
                            }
                        }
                        if (modified) {
                            await lastValueFrom(this.commonMicroservice.send({
                                cmd: 'upload_file'
                            }, {
                                path: Buffer.from(JSON.stringify(dataFileRead)).toString('base64'),
                                filename: dynamicDefaultJsonFile,
                                userBucket: dynamicDefaultJsonFile.includes('dynamic') ? 'private' : 'public'
                            }));
                            this.cacheService.setCache(`${dynamicDefaultJsonFile}`, JSON.stringify(JSON.parse(JSON.stringify(dataFileRead))), 60000);
                        }
                    }
                } else {
                    await lastValueFrom(this.commonMicroservice.send({
                        cmd: 'delete_file'
                    }, {
                        prefix: dynamicDefaultJsonFile,
                        userBucket: dynamicDefaultJsonFile.includes('dynamic') ? 'private' : 'public'
                    }));
                    this.cacheService.removeCache(`${dynamicDefaultJsonFile}`);
                }
            } else {
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: Buffer.from(JSON.stringify(dynamicDatas)).toString('base64'),  filename: dynamicDefaultJsonFile, userBucket: dynamicDefaultJsonFile.includes('dynamic') ? 'private' : 'public'}));
                this.cacheService.setCache(`${dynamicDefaultJsonFile}`, JSON.stringify(JSON.parse(dynamicDatas)), 60000);
            }
            // This function should implement the changeAllTranslationStatus method
            this.changeAllTranslationStatus(langTranslation);
        } 
        catch (error) {
            throw new Error(error.message);
        }
    }
    async changeAllTranslationStatus(lang_translation) {
        try{
            const localePath = TRANSLATIONS_DIR;
            lang_translation = lang_translation?.key;
            let orgId = lang_translation.org || 0;
            // Simulate the CompanyLanguage query
            let resLangTmp = await this.languagesService.listRecord({status: 1});
            let resLang = resLangTmp.reduce((acc, curr) => {
                acc[curr.id] = curr;
                return acc;
            }, {});
            let lang = Object.keys(resLang);
            // Handle company-specific languages if orgId is not 0
            if (orgId !== 0) {
                let allLangIdsTemp = await this.companylanguagesService.translateFindOne(`language.company_id = ${orgId} AND language.status != 2`)
                let allLangIds = allLangIdsTemp?.language_id || '';
                lang = allLangIds.split(',').map(id => id.trim());
            }
            let complete = {};
            // Intersecting available languages and languages from org
            let resLangFiltered = lang.filter(id => resLang[id]);
            resLangFiltered.forEach(langId => {
                let langTranslationTmp = `${lang_translation.key}_${resLang[langId].alias}`;
                complete[langTranslationTmp] = resLang[langId].alias === 'eng' ? 1 : 0;
            });
            const completeStatusJsonFile = path.join(localePath, 'all_translation_status.json');
            if (!fs.existsSync(completeStatusJsonFile)) {
                const completeStatusJsonEncode = JSON.stringify(complete, null, 2);
                fs.writeFileSync(completeStatusJsonFile, completeStatusJsonEncode);
            } else {
                const prevFileContent = fs.readFileSync(completeStatusJsonFile, 'utf8');
                let completeStatusJsonDecode = JSON.parse(prevFileContent);
                if (completeStatusJsonDecode === null) {
                    completeStatusJsonDecode = {};
                }
                const mergedArray = { ...completeStatusJsonDecode, ...complete };
                const completeStatusJsonEncode = JSON.stringify(mergedArray, null, 2);
                fs.writeFileSync(completeStatusJsonFile, completeStatusJsonEncode);
            }
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    async getLanguagesData() {
        const cacheKey = 'languages_data';
        let languageData = this.cacheService.getCache(cacheKey);

        if (!languageData) {
            languageData = await this.translator.readFile("languages.json");
            this.cacheService.setCache(cacheKey, JSON.stringify(languageData), 300000);
        } else {
            if (typeof languageData === 'string') {
                languageData = JSON.parse(languageData);
            }
        }

        return languageData;
    }

    getLanguageFallback(language: string, languageData: any[], returnField?: 'key'): string {
        if (!language || language === '') {
            return 'eng';
        }

        const lang = languageData.find(ele =>
            ele.name === language ||
            ele.key === language ||
            ele.locale === language
        );

        if (lang) {
            if (returnField === 'key') {
                return lang.key;
            }
            return lang.localeFallback || lang.key;
        }
        return language;
    }


    buildTranslationPath(
        menu: string,
        subMenu: string,
        type: string,
        orgId: string,
        id: string,
        sub_id: string,
        roleId: number
    ): string {
        let pathArray = ['/LC_MESSAGES/'];

        if (menu) {
            pathArray.push(`${menu.trim().replace(/\s/g, '')}/`);
        }

        if (menu !== 'Api' && subMenu) {
            if (subMenu === 'Login Agreement') {
                subMenu = 'agreement';
            }
            pathArray.push(`${subMenu.trim().replace(/\s/g, '')}/`);
        }

        if (menu === 'Common' && subMenu === "Menu" && orgId) {
            pathArray.push(`${orgId}/`);
            pathArray.push(`dynamic.json`);
        } else {
            if (roleId === appConstant.ROLE.ADMIN) {
                if (orgId) {
                    pathArray.push(`${orgId}/`);
                    /*if (pathArray.indexOf(`dynamic.json`) === -1) {
                        pathArray.push(`dynamic.json`);
                    }*/
                }
                if (id) {
                    pathArray.push(`${id}/`);
                    /*if (pathArray.indexOf(`dynamic.json`) === -1) {
                        pathArray.push(`dynamic.json`);
                    }*/
                }
                if (sub_id) {
                    pathArray.push(`${sub_id}/`);
                    /*if (pathArray.indexOf(`dynamic.json`) === -1) {
                        pathArray.push(`dynamic.json`);
                    }*/
                }
                if (pathArray.indexOf(`${type}.json`) === -1 && pathArray.indexOf(`dynamic.json`) === -1) {
                    pathArray.push(`${type}.json`);
                }
            } else {
                if (pathArray.indexOf(`${type}.json`) === -1) {
                    pathArray.push(`${type}.json`);
                }
            }
        }
        return pathArray.join('');
    }

    buildSimpleTranslationPath(menu: string, type: string): string {
        let pathArray = ['/LC_MESSAGES/'];

        if (menu) {
            pathArray.push(`${menu.trim().replace(/\s/g, '')}/`);
        }

        if (pathArray.indexOf(`${type.toLowerCase()}.json`) === -1) {
            pathArray.push(`${type.toLowerCase()}.json`);
        }

        return pathArray.join('');
    }

    convertToObject(langData: any[]): any {
        const langDataObj = {};
        for (let i = 0; i < langData.length; i++) {
            const item = langData[i];
            langDataObj[item.type] = item.translate || item.english;
        }
        return langDataObj;
    }

    filterByPrefix(prefix: string, dataArray: any[]): any[] {
        const prefixWithUnderscore = prefix + "_";
        return dataArray.filter(item =>
            item.type && item.type.startsWith(prefixWithUnderscore)
        );
    }

    // Service level helper method
    safeDecodeAndParse(base64Str: string) {
        try {
            // Step 1: Decode base64 to UTF-8
            let decoded = Buffer.from(base64Str, 'base64').toString('utf-8');

            // Step 2: Clean up decoded text
            decoded = decoded
                .replace(/^\uFEFF/, '')                   // Remove BOM
                .replace(/[\u0000-\u001F]+/g, '')         // Remove control chars
                .trim();

            // Step 3: Attempt parse
            return JSON.parse(decoded);
        } catch (err) {
            //this.logger.error('Failed to decode & parse JSON:', err.message);
            throw err;
        }
    }

    private parseFilePath(filePath: string) {
        const parts = filePath.split('/').filter(part => part !== '');
        return {
            menu: parts[1],
            subMenu: parts[2],
            orgId: parts[3],
            id: parts[4],
            fileName: parts[5],
        };
    }

    private async fetchTranslationFile(filePath: string, targetLang: string) {
        const { menu, subMenu, orgId, id, fileName } = this.parseFilePath(filePath);

        let dataFileRead = this.cacheService.getCache(`Locale/${targetLang}${filePath}`);
        this.cacheService.removeCache(`Locale/${targetLang}${filePath}`);
        if (!dataFileRead) {
            dataFileRead = await this.checkBucketForFile(filePath, targetLang);

        }
        if (!dataFileRead) {
            if (targetLang === 'eng') {
                if(menu === 'Dashboard' && subMenu === 'UpcomingActivities' && orgId && id && fileName === 'dynamic.json') {
                    const resultEnglishData = await this.manualUpcomingsService.findOne({id: id, org_id: orgId});
                    dataFileRead = this.createJsonFromResult(resultEnglishData);
                    await this.uploadJsonToBucket(`Locale/${targetLang}${filePath}`, dataFileRead);
                    this.cacheService.setCache(`Locale/${targetLang}${filePath}`, JSON.stringify(dataFileRead), 60000);
                }
            }
        }

        return dataFileRead;
    }
    async checkBucketForFile(filePath: string, targetLang: string) {
        const result = await lastValueFrom(this.commonMicroservice.send({ cmd: 'get_file' }, {
            path: `Locale/${targetLang}${filePath}`,
            userBucket: filePath.includes('static') ? 'public' : 'private',
        }));

        if (result?.Body) {
            return this.safeDecodeAndParse(result.Body);
        }
        return null;
    }
    private createJsonFromResult(result: any) {
        return {
            title: result.title || '',
            description: result.description || '',
        };
    }

    private async uploadJsonToBucket(filePath: string, jsonData: any) {
        const file = Buffer.from(JSON.stringify(jsonData)).toString('base64');
        await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' }, {
            path: file,
            filename: filePath,
            userBucket: filePath.includes('static') ? 'public' : 'private',
        }));
    }



    async readTranslationOptimized(targetLang: string, filePath: string, defaultValue: boolean = false) {
        try {
            let dataFileRead = await this.fetchTranslationFile(filePath, 'eng');
            if (!dataFileRead) {
                return [];
            }

            const arrayOfObjects1 = Object.entries(dataFileRead).map(([key, value]) => ({
                type: key,
                english: value,
                translate: value,
            }));

            if (arrayOfObjects1.length === 0) return [];

            let dataFileReadIn;
            try {
                dataFileReadIn = await this.fetchTranslationFile(filePath, targetLang);
            } catch (error) {
                console.error('Error while fetching translation file:', error);
                dataFileReadIn = null;
            }
            if (!dataFileReadIn) {
                if (defaultValue) {
                    return arrayOfObjects1.map(obj => ({
                        ...obj,
                        translate: '',
                    }));
                } else {
                    return [];
                }
            }

            const arrayOfObjects2 = Object.entries(dataFileReadIn).map(([key, value]) => ({
                type: key,
                translate: value,
            }));

            const mergedArray = arrayOfObjects1.map(obj1 => {
                const matching = arrayOfObjects2.find(obj2 => obj1.type === obj2.type);
                if (matching) {
                    obj1.translate = matching.translate;
                } else if (defaultValue) {
                    obj1.translate = '';
                }
                return obj1;
            });

            return mergedArray;
        } catch (error) {
            return [];
        }
    }

    async transformTranslationData(
        translatedJsonStr: string,
        sourcePath: string
    ): Promise<Array<{ type: string; english: string; translate: string }>> {
        try {
            const result = await lastValueFrom(this.commonMicroservice.send(
                { cmd: 'get_file' },
                {
                    path: sourcePath,
                    userBucket: sourcePath.includes('static') ? 'public' : 'private',
                }
            ));

            if (!result?.Body) {
                throw new Error('Failed to read source file content');
            }

            const sourceJson = this.safeDecodeAndParse(result.Body);
            let translated;
            try {
                translated = typeof translatedJsonStr === 'string'
                    ? JSON.parse(translatedJsonStr)
                    : translatedJsonStr;
            } catch (parseError) {
                throw new Error(`Invalid translated JSON format: ${parseError.message}`);
            }

            const transformedArray = [];

            for (const key in translated) {
                if (Object.prototype.hasOwnProperty.call(translated, key)) {
                    transformedArray.push({
                        type: key,
                        english: sourceJson[key] || key,
                        translate: translated[key] || '',
                    });
                }
            }

            console.log(`Transformed ${transformedArray.length} translation entries`);
            return transformedArray;

        } catch (error) {
            console.error('Error in transformTranslationData:', error.message);
            throw error;
        }
    }
}
