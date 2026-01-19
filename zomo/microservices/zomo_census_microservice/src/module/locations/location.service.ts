import { appConstant, LocationsEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
@Injectable()
export class LocationService {
    constructor(
        @InjectRepository(
            LocationsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaLocationsRepository: Repository<LocationsEntity>,
        @InjectRepository(LocationsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaLocationsRepository: Repository<LocationsEntity>,
    ) {}

    async listRecordCustom(
        condition: string | ObjectLiteral,
        fields: string[] = ['location.*'],
        orderBy: Record<string, 'ASC' | 'DESC'> = { id: 'DESC' },
    ): Promise<any[]> {
        const query = this.readReplicaLocationsRepository
            .createQueryBuilder('location')
            .select(fields);

        // Support string or object for condition
        if (typeof condition === 'string') {
            query.where(condition);
        } else {
            query.where(condition); // safer if passed as object: { id: In([1, 2, 3]) }
        }

        // Apply ordering
        const [orderKey, orderDirection] = Object.entries(orderBy)[0];
        query.orderBy(`location.${orderKey}`, orderDirection);

        return await query.getMany();
    }

    async findByMultipleQueries(
        queries: Record<string, any>[],
    ): Promise<any[]> {
        const qb =
            this.readReplicaLocationsRepository.createQueryBuilder('location');

        queries.forEach((q, index) => {
            const whereClause = Object.entries(q)
                .map(([field, value]) => {
                    // If value is a string, use TRIM
                    const column =
                        typeof value === 'string'
                            ? `TRIM(location.${field})`
                            : `location.${field}`;
                    return `${column} = :${field}_${index}`;
                })
                .join(' AND ');

            const params = Object.entries(q).reduce(
                (acc, [field, value]) => {
                    acc[`${field}_${index}`] = value;
                    return acc;
                },
                {} as Record<string, any>,
            );

            /*if (q.zip === '94402' ) {
                console.log(`➡️ Query index: ${index}`);
                console.log('Where clause:', whereClause);
                console.log('Params:', params);
            }*/

            if (index === 0) {
                qb.where(`(${whereClause})`, params);
            } else {
                qb.orWhere(`(${whereClause})`, params);
            }
        });

        //return qb.getMany();
        const results = await qb.getMany();

        const trimmedResults = results.map((record) => {
            const trimmedRecord: any = {};
            for (const key in record) {
                const value = record[key];
                if (typeof value === 'string') {
                    trimmedRecord[key] = value.trim();
                } else {
                    trimmedRecord[key] = value;
                }
            }
            return trimmedRecord;
        });

        return trimmedResults;
    }

    async findOne(condition: any) {
        return await this.readReplicaLocationsRepository.findOne({
            where: condition,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaLocationsRepository.create(data);
        return await this.writeReplicaLocationsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        return await this.writeReplicaLocationsRepository
            .createQueryBuilder('location')
            .update(LocationsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
}
