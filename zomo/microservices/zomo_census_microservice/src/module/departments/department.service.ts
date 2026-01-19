import {
    appConstant,
    DepartmentsEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
@Injectable()
export class DepartmentService {
    constructor(
        @InjectRepository(
            DepartmentsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaDepartmentsRepository: Repository<DepartmentsEntity>,
        @InjectRepository(DepartmentsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaDepartmentsRepository: Repository<DepartmentsEntity>,
    ) {}
    async listRecordCustom(
        condition: string | ObjectLiteral,
        fields: string[] = ['department'],
        orderBy: Record<string, 'ASC' | 'DESC'> = { id: 'DESC' },
    ): Promise<any[]> {
        const query = this.readReplicaDepartmentsRepository
            .createQueryBuilder('department')
            .select(fields);

        // Support string or object for condition
        if (typeof condition === 'string') {
            query.where(condition);
        } else {
            query.where(condition); // safer if passed as object: { id: In([1, 2, 3]) }
        }

        // Apply ordering
        if (Object.keys(orderBy).length > 0) {
            const [orderKey, orderDirection] = Object.entries(orderBy)[0];
            query.orderBy(`department.${orderKey}`, orderDirection);
        }

        return await query.getMany();
    }
    async findOne(
        condition: Record<string, any>,
        fields?: string[],
        orderBy: Record<string, 'ASC' | 'DESC'> = { id: 'DESC' },
    ) {
        const qb =
            this.readReplicaDepartmentsRepository.createQueryBuilder(
                'department',
            );

        // Select specified fields, or default to full department entity
        if (Array.isArray(fields) && fields.length > 0) {
            qb.select(fields);
        } else {
            qb.select('department');
        }

        // Apply where conditions
        qb.where(condition);

        // Apply ordering
        const [orderKey, orderDirection] = Object.entries(orderBy)[0];
        qb.orderBy(`department.${orderKey}`, orderDirection);

        // Debug log (optional)
        // console.log('Generated SQL:', qb.getSql());

        return await qb.getOne();
    }

    async save(data: any) {
        const savedResult = this.writeReplicaDepartmentsRepository.create(data);
        return await this.writeReplicaDepartmentsRepository.insert(savedResult);
    }

    async update(condition: any, data: any) {
        return await this.writeReplicaDepartmentsRepository
            .createQueryBuilder('department')
            .update(DepartmentsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
}
