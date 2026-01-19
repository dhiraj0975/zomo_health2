import { appConstant, RolePermissionEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
@Injectable()
export class RolePermissionService {
    constructor(
        @InjectRepository(RolePermissionEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaRolePermissionRepository: Repository<RolePermissionEntity>,
        @InjectRepository(RolePermissionEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaRolePermissionRepository: Repository<RolePermissionEntity>,
    ) {}
    async findOne(condition: any) {
        return await this.readReplicaRolePermissionRepository.findOne({
            where: condition,
        });
    }
    async update(condition: any, data: any) {
        const record = await this.findOne(condition);
        if (record) {
            data['id'] = record['id'];
        }
        return await this.writeReplicaRolePermissionRepository.save(data);
    }
    async delete(dataArr: any) {
        try {
            await this.writeReplicaRolePermissionRepository.delete({
                role_id: <any>Not(In(dataArr.map(ele=> ele.role_id))),
                method_id: <any>Not(In(dataArr.map(ele=> ele.method_id))),
            });
        } catch (error) {
            return error.message;
        }
    }
    async listRecord(condition: any, orderBy: any = null,fields: any = ['role_permission', 'method.id', 'method.path']) {
            if (!orderBy) {
              orderBy = { id: 'DESC' };
            }
            return await this.readReplicaRolePermissionRepository.createQueryBuilder('role_permission')
            .leftJoinAndMapOne(
                'role_permission.method',
                tableConstant.PERMISSION.TBL_METHODS,
                'method',
                `method.id = role_permission.method_id AND method.status = 1`,
            )
            .where(condition)
            .select(fields)
            .orderBy(`role_permission.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
        }
}
