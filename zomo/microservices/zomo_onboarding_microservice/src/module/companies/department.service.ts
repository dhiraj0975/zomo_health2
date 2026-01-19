import {
    appConstant,
    BaseService,
    CommonArrayService,
    DepartmentsEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
@Injectable()
export class DepartmentService extends BaseService<DepartmentsEntity> {
    constructor(
        @InjectRepository(
            DepartmentsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaDepartmentRepository: Repository<DepartmentsEntity>,
        @InjectRepository(DepartmentsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaDepartmentRepository: Repository<DepartmentsEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaDepartmentRepository,
            writeReplicaDepartmentRepository,
            'department',
            commonArrayService,
        );
    }

    async listRecordCustom(
        condition: string | ObjectLiteral,
        fields: string[] = ['department'],
        orderBy: Record<string, 'ASC' | 'DESC'> = { id: 'DESC' },
    ): Promise<any[]> {
        const query = this.readReplicaDepartmentRepository
            .createQueryBuilder('department')
            .select(fields);

        if (typeof condition === 'string') {
            query.where(condition);
        } else {
            query.where(condition);
        }

        if (Object.keys(orderBy).length > 0) {
            const [orderKey, orderDirection] = Object.entries(orderBy)[0];
            query.orderBy(`department.${orderKey}`, orderDirection);
        }

        return await query.getMany();
    }
}
