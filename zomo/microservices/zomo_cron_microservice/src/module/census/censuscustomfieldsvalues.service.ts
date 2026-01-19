import { appConstant, CensusCustomFieldsValuesEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class CensusCustomFieldsValuesService {
    constructor(
        @InjectRepository(
            CensusCustomFieldsValuesEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaCensusCustomFieldsValuesRepository: Repository<CensusCustomFieldsValuesEntity>,
        @InjectRepository(
            CensusCustomFieldsValuesEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaCensusCustomFieldsValuesRepository: Repository<CensusCustomFieldsValuesEntity>,
    ) {}
    async save(data: any) {
        const savedResult =
            this.writeReplicaCensusCustomFieldsValuesRepository.create(data);
        return await this.writeReplicaCensusCustomFieldsValuesRepository.save(
            savedResult,
        );
    }
    async update(condition: any, data: any) {
        return await this.writeReplicaCensusCustomFieldsValuesRepository
            .createQueryBuilder('cfv')
            .update(CensusCustomFieldsValuesEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaCensusCustomFieldsValuesRepository.delete(
            condition,
        );
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCensusCustomFieldsValuesRepository.findOne(
            {
                where: condition,
                order: orderBy,
            },
        );
    }
    async findDistinctUserIds(conditionCensu: string[]): Promise<number[]> {
        if (conditionCensu.length === 0) {
            return [];
        }
        const queryBuilder =
            this.readReplicaCensusCustomFieldsValuesRepository.createQueryBuilder(
                'census',
            );
        conditionCensu.forEach((condition, index) => {
            if (index === 0) {
                queryBuilder.where(condition);
            } else {
                queryBuilder.andWhere(condition);
            }
        });
        const result = await queryBuilder
            .select('DISTINCT census.user_id', 'user_id')
            .getRawMany();
        return result.map((row) => row.user_id);
    }
    async listRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCensusCustomFieldsValuesRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
    async listRecordReport(fields: any, condition: any, orderBy: any = null) {
        try {
            if (!orderBy) {
                orderBy = { id: 'DESC' };
            }
            const data =
                await this.readReplicaCensusCustomFieldsValuesRepository.find({
                    where: condition,
                    order: orderBy,
                });
            const transformedData = data.reduce((acc, item) => {
                const { user_id, field_id, field_value } = item;
                // Ensure the user_id key exists in the accumulator
                if (!acc[user_id]) {
                    acc[user_id] = {};
                }
                // Add the field_id and field_value to the user's entry
                acc[user_id][field_id] = field_value;
                return acc;
            }, {});
            return transformedData;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}
