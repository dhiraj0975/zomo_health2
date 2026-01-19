import { appConstant, CacheService } from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';
import { lastValueFrom } from 'rxjs';
@Injectable()
export class Translator {
    private translations: { [language: string]: { [key: string]: string } };
    constructor(
        private readonly translationsDir: string, 
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly cacheService: CacheService,
    ) {
        this.translations = {};
        this.loadTranslations();
    }
    private loadTranslations(
        directory = this.translationsDir,
        language = '',
    ): void {
        const items = fs.readdirSync(directory);
    items
        .forEach((item) => {
            const itemPath = path.join(directory, item);
            if (fs.statSync(itemPath).isDirectory()) {
                const lang = language || item;
                this.loadTranslations(itemPath, lang);
            } else if (itemPath.includes('Common\\Common') && path.extname(itemPath) === '.json') {
                const lang = language || path.basename(directory);
                const data = fs.readFileSync(itemPath, { encoding: 'utf-8' });
                const translations = JSON.parse(data);
                if (!this.translations[lang]) {
                    this.translations[lang] = {};
                }
                Object.assign(this.translations[lang], translations);
            }
        });
    }
    translate(
        language: string = 'eng',
        key: string,
    ): string {
        try {
            if (this.translations[language] && this.translations[language][key]) {
                return this.translations[language][key];
            } else {
                if(this.translations?.['eng']?.[key])
                {
                    key = this.translations['eng'][key];
                }           
                return key;
            }
        } catch (error) {
            console.error('Error read translation:', error);
            throw new Error('Failed to read translation.');
        }
    }
    addTranslation(
        language: string,
        key: string,
        value: string,
        fileName: string = appConstant.TRANSLATIONS_FILE,
    ): void {
        const languageDir = path.join(this.translationsDir, language);
        const filePath = path.join(languageDir, fileName);
        const directory = path.dirname(filePath); // Get the directory path
        try {
            if (!fs.existsSync(directory)) {
                fs.mkdirSync(directory, { recursive: true });
            }
            let translations = {};
            if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath, { encoding: 'utf-8' });
                translations = JSON.parse(data);
            }
            translations[key] = value;
            fs.writeFileSync(filePath, JSON.stringify(translations, null, 2));
            if (!this.translations[language]) {
                this.translations[language] = {};
            }
            this.translations[language][key] = value;
        } catch (error) {
            console.error('Error adding translation:', error);
            throw new Error('Failed to add translation.');
        }
    }
    updateTranslation(
        language: string,
        key: string,
        value: string,
        fileName: string = appConstant.TRANSLATIONS_FILE,
    ): void {
        try {
            const filePath = path.join(
                this.translationsDir,
                language,
                fileName,
            );
            const data = fs.readFileSync(filePath, { encoding: 'utf-8' });
            const translations = JSON.parse(data);
            if (translations.hasOwnProperty(key)) {
                translations[key] = value;
                fs.writeFileSync(
                    filePath,
                    JSON.stringify(translations, null, 2),
                );
                this.translations[language][key] = value;
            } else {
                throw new Error('Translation key does not exist.');
            }
        } catch (error) {
            console.error('Error updating translation:', error);
            throw new Error('Failed to update translation.');
        }
    }
    async copyFile(
        fileName: string = appConstant.TRANSLATIONS_FILE,
        file: any,
        language: string = 'en',
    ) {
        const languageDir = path.join(this.translationsDir, language);
        const filePath = path.join(languageDir, fileName);
        const directory = path.dirname(filePath);
        try {
            await lastValueFrom(this.commonMicroservice.send({cmd: 'copy_file'}, {from: `Locale/eng${fileName}`, to: `Locale/${language.toLowerCase().substring(0, 3)}${fileName}`, userBucket: fileName.includes('static') ? 'public' : 'private'}));
            return 
        } catch (error) {
            console.error('Error copy file translation:', error);
            throw new Error('Failed to copy file translation.');
        }
    }
    getMissingKeys(sourceObj, compareObj) {
        const missingKeys = {};
        function findMissingKeys(innerObj1, innerObj2, prefix = '') {
            for (const key in innerObj1) {
                if (innerObj1.hasOwnProperty(key)) {
                    if (!(key in innerObj2)) {
                        missingKeys[prefix + key] = prefix + key;
                    } else {
                        if (typeof innerObj1[key] === 'object' && innerObj2[key] !== null) {
                            findMissingKeys(innerObj1[key], innerObj2[key], prefix + key + '.');
                        }
                    }
                }
            }
        }
        findMissingKeys(sourceObj, compareObj);
        return missingKeys;
    }
    async saveFile(
        fileName: string = appConstant.TRANSLATIONS_FILE,
        file: any,
        language: string = 'eng',
    ) {
        const languageDir = path.join(this.translationsDir, language.toLowerCase().substring(0, 3));
        const filePath = path.join(languageDir, fileName);
        const directory = path.dirname(filePath);
        const languageData = await this.readFile("languages.json");
        let lang = languageData.find(ele => ele.name === language);
        language = lang ? lang?.localeFallback : language;
        let fileUrl = `Locale/${language}${fileName}`;
        try {
            if (!fs.existsSync(directory)) {
                fs.mkdirSync(directory, { recursive: true });
            }
            fs.writeFileSync(filePath, JSON.stringify(JSON.parse(file.replace(/\\/g, ""))));
            let engFileRead = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file'}, {path: `Locale/eng${fileName}`, userBucket: fileName.includes('static') ? 'public' : 'private'}));
            let dataFileRead = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file'}, {path: fileUrl, userBucket: fileName.includes('static') ? 'public' : 'private'}))
            if(dataFileRead){
                dataFileRead = Buffer.from(dataFileRead.Body, 'base64').toString('utf-8');
                let translations = JSON.parse(dataFileRead);
                file = JSON.parse(file);
                translations = {...translations, ...file}
                if(engFileRead){
                    engFileRead = Buffer.from(engFileRead.Body, 'base64').toString('utf-8');
                    let translation = JSON.parse(engFileRead);
                    const missing = this.getMissingKeys(file, translation);
                    if(missing){
                        await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: Buffer.from(JSON.stringify({...translation, ...missing})).toString('base64'),  filename: `Locale/eng${fileName}`, userBucket: fileName.includes('static') ? 'public' : 'private'}));
                    }
                }
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: Buffer.from(JSON.stringify(translations)).toString('base64'),  filename: fileUrl, userBucket: fileName.includes('static') ? 'public' : 'private'}));
            }
            return true;
        } catch (error) {
            console.error('Error copy file translation:', error);
            throw new Error('Failed to copy file translation.');
        }
    }
    async addFileTranslation(
        source_lang: string = 'en-US',
        target_lang: string,
        fileName: string = appConstant.TRANSLATIONS_FILE,
        file: any,
    ) {
        try {
            const languageData = await this.readFile("languages.json");
            let responce = {}
            let lang = languageData.find(ele => ele.name == target_lang);
            let langPath =lang?.lang_path || '';
            lang = lang?.localeFallback || '';
            if (!langPath && !lang) {
                throw new Error('Language not support');
            }
            const languageDir = path.join(this.translationsDir, target_lang.toLowerCase().substring(0, 3));
            const filePath = path.join(languageDir, fileName);
            const directory = path.dirname(filePath); 
            if (!fs.existsSync(directory)) {
                fs.mkdirSync(directory, { recursive: true });
            }
            if(!file.path){
                const languageDir = path.join(this.translationsDir, 'eng');
                file = {};
                file['path'] = path.join(languageDir, fileName);
            }
            let dataFileRead = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file'}, {path: `Locale/eng${fileName}`, userBucket: fileName.includes('static') ? 'public' : 'private'}))
            if(dataFileRead){
                dataFileRead = Buffer.from(dataFileRead.Body, 'base64').toString('utf-8');
                this.cacheService.setCache(`Locale/eng${fileName}`, JSON.stringify(JSON.parse(dataFileRead)), 60000);
            }
            let translatedData = await lastValueFrom(this.commonMicroservice.send({cmd: 'lang_demo'}, {text: JSON.parse(dataFileRead), sourceLang: 'en', targetLang: lang }));
            responce = {"lang":lang,"langPath":langPath,"dataFileRead":dataFileRead,"translatedData":translatedData}
            if(translatedData){
                let filePathDir = path.join(`${appConstant.LANG_TRANSLATION_PATH}`);
                if (!fs.existsSync(filePathDir)) {
                    fs.mkdirSync(filePathDir, { recursive: true });
                }
                await fs.writeFile(`${filePathDir}/lang.json`, JSON.stringify(translatedData, null, 2), function (err) {
                    if (err) throw err;
                });
                    let jsonFilePath = `${filePathDir}/lang.json`;
                    if (fs.existsSync(jsonFilePath)) {
                        await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(jsonFilePath),  filename: `Locale/${langPath}${fileName}`, userBucket: fileName.includes('static') ? 'public' : 'private'}));
                    }
            }
        } catch (error) {
            console.error('Error uploading translation:', error);
            throw new Error('Failed to upload translation.');
        }
    }
    async readTranslation(
        language: string,
        fileName: string = appConstant.TRANSLATIONS_FILE,
        defaultValue: boolean = false
    ) {
        try {
            let languageData = await this.readFile("languages.json");
            let lang = languageData.find(ele => ele.key === language);
            language = lang ? lang?.localeFallback : language;
            let langPath = lang ? lang?.lang_path : language;
            let arrayOfObjects1 = [];
            let arrayOfObjects2 = [];
            let dataFileRead;
            dataFileRead = this.cacheService.getCache(`Locale/eng${fileName}`);
            if(!dataFileRead){
                dataFileRead = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file'}, {path: `Locale/eng${fileName}`, userBucket: fileName.includes('static') ? 'public' : 'private'}));
                if(dataFileRead){
                    dataFileRead = Buffer.from(dataFileRead.Body, 'base64').toString('utf-8');
                    this.cacheService.setCache(`Locale/eng${fileName}`, JSON.stringify(JSON.parse(dataFileRead)), 60000);
                }
            }
            if (dataFileRead) {
                dataFileRead = (typeof dataFileRead == 'string') ? JSON.parse(dataFileRead) : dataFileRead;
                    arrayOfObjects1 = Object.entries(dataFileRead).map(([key, value]) => ({ type: key, english: value, translate: value }));
                    if(arrayOfObjects1 && arrayOfObjects1.length){
                        let dataFileReadIn;
                        dataFileReadIn = this.cacheService.getCache(`Locale/${langPath}${fileName}`);
                        if(!dataFileReadIn){
                            dataFileReadIn = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file'}, {path: `Locale/${langPath}${fileName}`, userBucket: fileName.includes('static') ? 'public' : 'private'}))
                            if(dataFileReadIn){
                                dataFileReadIn = Buffer.from(dataFileReadIn.Body, 'base64').toString('utf-8');
                                this.cacheService.setCache(`Locale/${langPath}${fileName}`, JSON.stringify(JSON.parse(dataFileReadIn)), 60000);
                            }
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
    readTranslationWithoutSubMenu(
        data: any,
        languageData: any,
    ) {
        try {
            let arrayOfObjects1 = data?.flatMap(obj =>
                Object.entries(obj).map(([key, value]) =>
                    ({ type: key, english: value, translate: value })
                )
            ) ?? [];
            let arrayOfObjects2 = languageData?.flatMap(obj =>
                Object.entries(obj).map(([key, value]) =>
                    ({ type: key, english: value, translate: value })
                )
            ) ?? [];
            return arrayOfObjects1?.map(obj1 => {
                const matchingObj = arrayOfObjects2.find(obj2 => obj1.type === obj2.type);
                    return { ...obj1, translate: matchingObj ? matchingObj.translate : null };
            });
        } catch (error) {
            console.error('Error Reading translation readTranslationWithoutSubMenu:', error);
            throw new Error('Failed to read translation.');
        }
    }
    async readFile(
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
    async readTranslationImage(
        language: string,
        text: string,
    ) {
        try {
            let path = `/LC_MESSAGES/Common/Common`;
            let customname;
            let filename = 'static';
            language = language == '' ? 'eng' : language;
            let filePath = `${path}/${filename}.json`;
            let translation = await this.readTranslation(language, `${filePath}`);
            if (translation.length) {
                const translationTranslateVal = Object.fromEntries(translation.map(item => [item.type, item.translate || item.english]));
                customname = translationTranslateVal[text] || text;
            }else{
                customname = text;
            }
            return customname;       
        } catch (error) {
            console.error('Error Reading translation readTranslationImage:', error);
            throw new Error('Failed to read translation.');
        }
    }
}
