import {
    appConstant,
    ReimbursementCreateFormsEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class CreateFormsService {
    constructor(
        @InjectRepository(
            ReimbursementCreateFormsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaCreateFormsRepository: Repository<ReimbursementCreateFormsEntity>,
        @InjectRepository(
            ReimbursementCreateFormsEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaCreateFormsRepository: Repository<ReimbursementCreateFormsEntity>,
    ) { }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCreateFormsRepository
            .createQueryBuilder('cf')
            .leftJoinAndMapOne(
                'cf.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = cf.org_id AND company.status = 1`,
            )
            .where(condition)
            .orderBy(
                `cf.${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            )
            .getOne();
    }
    async listRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCreateFormsRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
}
