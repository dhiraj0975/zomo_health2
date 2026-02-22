import { Injectable, Logger } from '@nestjs/common';
import {
    SUPPORTED_LANGUAGES_MAP,
    SUPPORTED_LANGUAGE_CODES,
} from '../constant/supported-languages';
import {
    TranslateClient,
    TranslateTextCommand,
    TranslateClientConfig,
} from '@aws-sdk/client-translate';
import {
    S3Client,
    GetObjectCommand,
    PutObjectCommand,
    HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

interface TranslationBatch {
    texts: string[];
    paths: string[];
}

interface TranslationCache {
    [key: string]: string;
}

@Injectable()
export class InitializeTranslateClient {
    private readonly logger = new Logger(InitializeTranslateClient.name);
    private translateClient: TranslateClient | undefined;
    private s3Client: S3Client;

    private translationCache: Map<string, string> = new Map();

    private readonly BATCH_SIZE = 25;
    private readonly MAX_TEXT_LENGTH = 5000;
    private readonly CONCURRENT_BATCHES = 3;
    private readonly BATCH_DELAY = 100;
    private readonly SMALL_FILE_LIMIT = 50000;
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAY = 1000;

    private readonly isLocal = process.env.LOCAL === 'true';
    private readonly isProd = process.env.NODE_ENV === 'PROD';

    private readonly region = this.isProd
        ? process.env.AWS_REGION_PROD!
        : process.env.AWS_REGION_DEV!;

    private readonly accessKey = this.isProd
        ? process.env.AWS_ACCESS_KEY_PROD!
        : process.env.AWS_ACCESS_KEY_DEV!;

    private readonly secretKey = this.isProd
        ? process.env.AWS_SECRET_ACCESS_KEY_PROD!
        : process.env.AWS_SECRET_ACCESS_KEY_DEV!;

    private dataBucket = this.isProd
        ? process.env.AWS_BUCKET_PROD || ''
        : process.env.AWS_BUCKET_DEV || '';

    constructor() {
        this.s3Client = this.createS3Client();
        this.initializeTranslateClient().catch((err) => {
            this.logger.error('Failed to initialize Translate client:', err);
        });
    }

    private createS3Client(): S3Client {
        const config: any = { region: this.region };

        if (this.isLocal) {
            this.logger.log('Creating S3 client for LOCAL environment');
            config.credentials = {
                accessKeyId: this.accessKey,
                secretAccessKey: this.secretKey,
            };
        } else {
            this.logger.log('Creating S3 client for LIVE environment');
        }

        return new S3Client(config);
    }

    private async initializeTranslateClient(): Promise<void> {
        try {
            this.logger.log('Initializing Translate client');

            const config: TranslateClientConfig = { region: this.region };

            if (this.isLocal) {
                if (!this.accessKey || !this.secretKey) {
                    throw new Error('Missing AWS credentials in LOCAL mode');
                }
                config.credentials = {
                    accessKeyId: this.accessKey,
                    secretAccessKey: this.secretKey,
                };
            }

            this.translateClient = new TranslateClient(config);

            await this.translateClient.send(
                new TranslateTextCommand({
                    SourceLanguageCode: 'en',
                    TargetLanguageCode: 'es',
                    Text: 'test',
                }),
            );

            this.logger.log('Translate client initialized successfully');
        } catch (err) {
            this.logger.error('Translate client initialization failed', err);
            this.translateClient = undefined;
            throw new Error(
                `Failed to initialize Translate client: ${err.message}`,
            );
        }
    }

    public async getTranslateClient(): Promise<TranslateClient> {
        if (!this.translateClient) {
            this.logger.log('Translate client not initialized, retrying...');
            await this.initializeTranslateClient();
        }
        if (!this.translateClient) {
            throw new Error('Translate client unavailable after retry');
        }
        return this.translateClient;
    }

    private async streamToString(stream: Readable): Promise<string> {
        const chunks: any[] = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks).toString('utf-8');
    }

    private async getFileSize(key: string): Promise<number> {
        try {
            const headRes = await this.s3Client.send(
                new HeadObjectCommand({
                    Bucket: this.dataBucket,
                    Key: key,
                }),
            );
            return headRes.ContentLength ?? 0;
        } catch (error: any) {
            this.logger.error(
                'Failed to get file size from S3:',
                error.message,
            );
            throw new Error('Failed to get file size from S3');
        }
    }
    private getCacheKey(
        text: string,
        sourceLang: string,
        targetLang: string,
    ): string {
        const textKey = text.length > 200 ? text.substring(0, 200) : text;
        return `${sourceLang}:${targetLang}:${textKey}`;
    }

    private isTranslatable(str: string): boolean {
        return !!(
            str.trim() &&
            !/^\d+$/.test(str.trim()) &&
            !/^[^\w\s]*$/.test(str)
        );
    }

    private hasHTMLTags(str: string): boolean {
        return /<[^>]+>/.test(str);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private chunkText(text: string, maxLength: number): string[] {
        if (text.length <= maxLength) return [text];

        const chunks: string[] = [];
        let currentChunk = '';
        const sentences = text.split(/(?<=[.!?])\s+/);

        for (const sentence of sentences) {
            if (sentence.length > maxLength) {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                    currentChunk = '';
                }

                const words = sentence.split(/\s+/);
                let wordChunk = '';

                for (const word of words) {
                    if ((wordChunk + ' ' + word).length > maxLength) {
                        if (wordChunk) {
                            chunks.push(wordChunk.trim());
                            wordChunk = word;
                        } else {
                            chunks.push(word.substring(0, maxLength));
                            wordChunk = word.substring(maxLength);
                        }
                    } else {
                        wordChunk = wordChunk ? wordChunk + ' ' + word : word;
                    }
                }

                if (wordChunk) currentChunk = wordChunk;
            } else {
                if ((currentChunk + ' ' + sentence).length > maxLength) {
                    if (currentChunk) {
                        chunks.push(currentChunk.trim());
                        currentChunk = sentence;
                    } else {
                        chunks.push(sentence);
                    }
                } else {
                    currentChunk = currentChunk
                        ? currentChunk + ' ' + sentence
                        : sentence;
                }
            }
        }

        if (currentChunk) chunks.push(currentChunk.trim());

        return chunks.filter((chunk) => chunk.length > 0);
    }
    private stripHTML(str: string): { clean: string; tags: { open: string; close: string } } {
        const hasHTML = this.hasHTMLTags(str);

        if (!hasHTML) {
            return { clean: str, tags: { open: '', close: '' } };
        }
        const outerMatch = str.match(/^<([a-zA-Z0-9]+)(\s[^>]*)?>([\s\S]*)<\/\1>$/);
        if (!outerMatch) {
            return { clean: str, tags: { open: '', close: '' } };
        }
        const tagName = outerMatch[1];
        const attributes = outerMatch[2] || '';
        const innerContent = outerMatch[3];
        return {
            clean: innerContent,
            tags: {
                open: `<${tagName}${attributes}>`,
                close: `</${tagName}>`,
            },
        };
    }
    private wrapWithHTML(text: string, tags: { open: string; close: string }): string {
        if (!tags.open && !tags.close) {
            return text;
        }
        if (text.startsWith(tags.open) && text.endsWith(tags.close)) {
        return text;
        }
        return `${tags.open || ''}${text}${tags.close || ''}`;
    }
    private async translateSingleText(
        text: string,
        sourceLang: string,
        targetLang: string,
        retryCount: number = 0,
    ): Promise<string> {
        const cacheKey = this.getCacheKey(text, sourceLang, targetLang);
        if (this.translationCache.has(cacheKey)) {
            this.logger.debug('Using cached translation');
            return this.translationCache.get(cacheKey)!;
        }

        const client = await this.getTranslateClient();

        try {
            const { clean, tags } = this.stripHTML(text);
            if (clean.length > this.MAX_TEXT_LENGTH) {
                this.logger.log(
                    `Large text detected (${text.length} chars), chunking...`,
                );
                const chunks = this.chunkText(clean, this.MAX_TEXT_LENGTH);
                const translatedChunks = await Promise.all(
                    chunks.map((chunk) =>
                        this.translateSingleText(chunk, sourceLang, targetLang),
                    ),
                );
                const translatedText = translatedChunks.join(' ');
                return this.wrapWithHTML(translatedText, tags);
            }

            const result = await client.send(
                new TranslateTextCommand({
                    SourceLanguageCode: sourceLang,
                    TargetLanguageCode: targetLang,
                    Text: clean,
                }),
            );

            const translatedText = result.TranslatedText ?? clean;

            const finalTranslation = this.wrapWithHTML(translatedText, tags);

            this.translationCache.set(cacheKey, finalTranslation);

            return finalTranslation;
        } catch (error: any) {
            if (retryCount < this.MAX_RETRIES) {
                this.logger.warn(
                    `Translation failed, retry ${retryCount + 1}/${this.MAX_RETRIES}`,
                );
                await this.sleep(this.RETRY_DELAY * (retryCount + 1));
                return this.translateSingleText(
                    text,
                    sourceLang,
                    targetLang,
                    retryCount + 1,
                );
            }
            this.logger.error('Translation failed after retries:', error);
            return text;
        }
    }

    private async translateTextsInBatches(
        texts: string[],
        sourceLang: string,
        targetLang: string,
    ): Promise<string[]> {
        const results: string[] = new Array(texts.length);

        const batches: string[][] = [];
        for (let i = 0; i < texts.length; i += this.BATCH_SIZE) {
            batches.push(texts.slice(i, i + this.BATCH_SIZE));
        }

        this.logger.log(
            `Processing ${texts.length} texts in ${batches.length} batches`,
        );

        const processBatch = async (
            batch: string[],
            batchIndex: number,
        ): Promise<void> => {
            const startIndex = batchIndex * this.BATCH_SIZE;

            try {
                const batchResults = await Promise.all(
                    batch.map((text) =>
                        this.translateSingleText(text, sourceLang, targetLang),
                    ),
                );

                batchResults.forEach((translatedText, index) => {
                    results[startIndex + index] = translatedText;
                });

                this.logger.log(
                    `Completed batch ${batchIndex + 1}/${batches.length}`,
                );

                if (batchIndex < batches.length - 1) {
                    await this.sleep(this.BATCH_DELAY);
                }
            } catch (error) {
                this.logger.error(`Batch ${batchIndex + 1} failed:`, error);
                batch.forEach((text, index) => {
                    results[startIndex + index] = text;
                });
            }
        };

        const processBatchesInChunks = async (
            startIdx: number,
        ): Promise<void> => {
            const chunk = batches.slice(
                startIdx,
                startIdx + this.CONCURRENT_BATCHES,
            );
            if (chunk.length === 0) return;

            await Promise.all(
                chunk.map((batch, index) =>
                    processBatch(batch, startIdx + index),
                ),
            );

            if (startIdx + this.CONCURRENT_BATCHES < batches.length) {
                await processBatchesInChunks(
                    startIdx + this.CONCURRENT_BATCHES,
                );
            }
        };

        await processBatchesInChunks(0);
        return results;
    }

    private collectTranslatableStrings(
        obj: any,
        path: string = '',
        collection: TranslationBatch = { texts: [], paths: [] },
    ): TranslationBatch {
        if (typeof obj === 'string') {
            if (this.isTranslatable(obj)) {
                collection.texts.push(obj);
                collection.paths.push(path);
            }
        } else if (Array.isArray(obj)) {
            obj.forEach((item, index) => {
                this.collectTranslatableStrings(
                    item,
                    path ? `${path}[${index}]` : `[${index}]`,
                    collection,
                );
            });
        } else if (obj !== null && typeof obj === 'object') {
            Object.entries(obj).forEach(([key, value]) => {
                const escapedKey = `["${key}"]`;
                this.collectTranslatableStrings(
                    value,
                    path ? `${path}${escapedKey}` : escapedKey,
                    collection,
                );
            });
        }
        return collection;
    }

    private setValueByPath(obj: any, path: string, value: string): void {
        const keys: string[] = [];
        const regex = /\["([^"]+)"\]|\[(\d+)\]/g;
        let match;

        while ((match = regex.exec(path)) !== null) {
            keys.push(match[1] || match[2]);
        }
        let current = obj;

        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
            if (current === undefined) return;
        }
        current[keys[keys.length - 1]] = value;
    }

    private applyTranslations(
        originalObj: any,
        paths: string[],
        translations: string[],
    ): any {
        if (paths.length === 0) return originalObj;

        const result = Array.isArray(originalObj)
            ? [...originalObj]
            : { ...originalObj };

        paths.forEach((path, index) => {
            this.setValueByPath(result, path, translations[index]);
        });

        return result;
    }

    private async translateObject(
        obj: any,
        sourceLang: string,
        targetLang: string,
    ): Promise<any> {
        const { texts, paths } = this.collectTranslatableStrings(obj);

        this.logger.log(`Found ${texts.length} translatable strings in JSON`);

        if (texts.length === 0) {
            this.logger.warn('No translatable content found in JSON object');
            return obj;
        }

        const translations = await this.translateTextsInBatches(
            texts,
            sourceLang,
            targetLang,
        );

        return this.applyTranslations(obj, paths, translations);
    }

    private async detectAndParseFileContent(content: string): Promise<{
        data: any;
        format: 'json' | 'text';
    }> {
        try {
            const trimmedContent = content.trim();
            if (
                !trimmedContent.startsWith('{') &&
                !trimmedContent.startsWith('[')
            ) {
                return { data: content, format: 'text' };
            }
            const parsedJson = JSON.parse(trimmedContent);
            //const parsedJson = JSON.parse(JSON.stringify(trimmedContent));
            this.logger.log('Successfully parsed as JSON');
            return { data: parsedJson, format: 'json' };
        } catch (error) {
            this.logger.log('Content is not valid JSON, treating as text');
            return { data: content, format: 'text' };
        }
    }

    private async translateFile(
        key: string,
        sourceLang: string,
        targetLang: string,
        destinationKey: string,
    ): Promise<string> {
        const startTotal = Date.now();
        this.logger.log(
            `[START] Translating file s3://${this.dataBucket}/${key}`,
        );

        try {
            const getRes = await this.s3Client.send(
                new GetObjectCommand({
                    Bucket: this.dataBucket,
                    Key: key,
                }),
            );
            const content = await this.streamToString(getRes.Body as Readable);
            /*console.log('content',content);*/
            const { data, format } =
                await this.detectAndParseFileContent(content);
            this.logger.log(`File format detected: ${format}`);
            let translatedContent: string;
            if (format === 'json') {
                this.logger.log('Starting JSON object translation...');
                const translatedData = await this.translateObject(
                    data,
                    sourceLang,
                    targetLang,
                );
                translatedContent = JSON.stringify(translatedData, null, 2);
                /*console.log('translatedContent',translatedContent);*/
                this.logger.log('JSON translation completed successfully');
            } else {
                this.logger.log('Starting plain text translation...');
                translatedContent = await this.translateSingleText(
                    data,
                    sourceLang,
                    targetLang,
                );
                this.logger.log('Text translation completed successfully');
            }
            if (format === 'json') {
                try {
                    JSON.parse(translatedContent);
                } catch (error) {
                    this.logger.error(
                        'Translated JSON is invalid, using original',
                    );
                    translatedContent = JSON.stringify(data, null, 2);
                }
            }
            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: this.dataBucket,
                    Key: destinationKey,
                    Body: translatedContent,
                    ContentType:
                        format === 'json' ? 'application/json' : 'text/plain',
                }),
            );

            this.logger.log(
                `✓ Translation complete: s3://${this.dataBucket}/${destinationKey} (${Date.now() - startTotal}ms)`,
            );

            return translatedContent;
        } catch (error: any) {
            this.logger.error('translateFile error:', error);
            throw new Error(`Translation failed: ${error.message}`);
        }
    }
    public async translateFileSmart(
        sourceKey: string,
        sourceLang: string,
        targetLang: string,
        destinationKeyOrPrefix: string,
        isPrivate: boolean = false,
    ): Promise<string | boolean> {
        try {
            if (!SUPPORTED_LANGUAGE_CODES.has(targetLang)) {
                const langName =
                    SUPPORTED_LANGUAGES_MAP[targetLang] || targetLang;
                this.logger.warn(
                    `Unsupported target language: ${targetLang} (${langName})`,
                );
                return `ERROR: The language ${langName} is currently not supported by our translation service.`;
            }

            if (isPrivate) {
                this.dataBucket = this.isProd
                    ? process.env.AWS_BUCKET_PRIVATE_PROD || ''
                    : process.env.AWS_BUCKET_PRIVATE_DEV || '';
            } else {
                this.dataBucket = this.isProd
                    ? process.env.AWS_BUCKET_PROD || ''
                    : process.env.AWS_BUCKET_DEV || '';
            }

            this.logger.log(`Using bucket: ${this.dataBucket}`);

            let fileSize: number;
            try {
                fileSize = await this.getFileSize(sourceKey);
            } catch {
                return `ERROR: Failed to get file from S3.`;
            }

            this.logger.log(`File size: ${fileSize} bytes`);

            return await this.translateFile(
                sourceKey,
                sourceLang,
                targetLang,
                destinationKeyOrPrefix,
            );
        } catch (error: any) {
            this.logger.error('translateFileSmart error:', error);
            return `ERROR: ${error.message || 'Translation failed'}`;
        }
    }

    public async translateSpecificKeys(
        sourceKey: string,
        sourceLang: string,
        targetLang: string,
        destinationKey: string,
        keysToTranslate: string[],
    ): Promise<boolean> {
        try {
            const getRes = await this.s3Client.send(
                new GetObjectCommand({
                    Bucket: this.dataBucket,
                    Key: sourceKey,
                }),
            );
            const content = await this.streamToString(getRes.Body as Readable);
            const data = JSON.parse(content);

            const textsToTranslate: string[] = [];

            const collectTexts = (obj: any): void => {
                if (Array.isArray(obj)) {
                    obj.forEach(collectTexts);
                } else if (obj !== null && typeof obj === 'object') {
                    Object.entries(obj).forEach(([key, value]) => {
                        if (
                            keysToTranslate.includes(key) &&
                            typeof value === 'string'
                        ) {
                            textsToTranslate.push(value);
                        } else {
                            collectTexts(value);
                        }
                    });
                }
            };

            collectTexts(data);

            if (textsToTranslate.length === 0) {
                this.logger.log(
                    'No translatable content found for specified keys',
                );
                return true;
            }

            const translations = await this.translateTextsInBatches(
                textsToTranslate,
                sourceLang,
                targetLang,
            );

            let translationIndex = 0;
            const applyTranslations = (obj: any): any => {
                if (Array.isArray(obj)) {
                    return obj.map(applyTranslations);
                }

                if (obj !== null && typeof obj === 'object') {
                    const result: any = {};
                    for (const [key, value] of Object.entries(obj)) {
                        if (
                            keysToTranslate.includes(key) &&
                            typeof value === 'string'
                        ) {
                            result[key] =
                                translations[translationIndex++] || value;
                        } else {
                            result[key] = applyTranslations(value);
                        }
                    }
                    return result;
                }

                return obj;
            };

            const translatedData = applyTranslations(data);

            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: this.dataBucket,
                    Key: destinationKey,
                    Body: JSON.stringify(translatedData, null, 2),
                    ContentType: 'application/json',
                }),
            );

            this.logger.log(
                `Specific keys translated: s3://${this.dataBucket}/${destinationKey}`,
            );
            return true;
        } catch (error) {
            this.logger.error('translateSpecificKeys error:', error);
            throw error;
        }
    }

    public clearCache(): void {
        this.translationCache.clear();
        this.logger.log('Translation cache cleared');
    }

    public getCacheSize(): number {
        return this.translationCache.size;
    }
}
