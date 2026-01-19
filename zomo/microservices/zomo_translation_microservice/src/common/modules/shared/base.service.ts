import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';

export abstract class BaseModuleService {
    protected readonly logger: Logger;

    constructor(loggerContext: string) {
        this.logger = new Logger(loggerContext);
    }

    protected async fetchAndMapEntities<T>(
        repository: Repository<T>,
        whereCondition: any,
        idField: keyof T,
        nameField: keyof T,
        errorContext: string,
    ): Promise<Record<string, string>> {
        try {
            const entities = await repository.find({
                where: whereCondition,
                select: [idField, nameField] as any,
            });
            return entities.reduce((acc, entity) => {
                acc[String(entity[idField])] = String(entity[nameField]);
                return acc;
            }, {});
        } catch (error) {
            this.logger.error(
                `Error in ${errorContext}: ${error.message}`,
                error.stack,
            );
            return {};
        }
    }

    protected buildCompanyWhereCondition(
        baseCondition: any,
        companyId?: string,
        companyField = 'c_companies_id',
    ): any {
        return companyId
            ? { ...baseCondition, [companyField]: companyId }
            : baseCondition;
    }

    protected safeDecodeAndParse(content: string): string {
        try {
            if (content && content !== '') {
                content = content
                    .replace(/"|"/g, '"')
                    .replace(/'/g, "'")
                    .replace(/–/g, '-')
                    .replace(/&ldquo;|&#8220;|&#8221;|&rdquo;/g, '"')
                    .replace(/&ndash;/g, '-')
                    .replace(/%/g, '&#37;')
                    .replace(/â/g, '"');
            }
            return content;
        } catch (err) {
            throw err;
        }
    }

    protected async fetchSingleEntityFields<T>(
        repository: Repository<T>,
        entityId: string,
        whereCondition: any,
        fieldMappings: Record<string, keyof T>,
        errorContext: string,
    ): Promise<[Record<string, any>, Record<string, any>]> {
        try {
            const entity = await repository.findOne({
                where: { ...whereCondition, id: parseInt(entityId, 10) },
                select: Object.values(fieldMappings) as any,
            });
            if (!entity) return [{}, {}];
            const dataArray: Record<string, any> = {};
            const labelArray: Record<string, any> = {};
            Object.entries(fieldMappings).forEach(([key, field]) => {
                const fieldKey = `${key}_${entityId}`;
                dataArray[fieldKey] = entity[field] || '';
                if (key.includes('name') || key.includes('title'))
                    labelArray[fieldKey] = key
                        .split('_')
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(' ');
            });
            return [dataArray, labelArray];
        } catch (error) {
            this.logger.error(
                `Error in ${errorContext}: ${error.message}`,
                error.stack,
            );
            return [{}, {}];
        }
    }
}
