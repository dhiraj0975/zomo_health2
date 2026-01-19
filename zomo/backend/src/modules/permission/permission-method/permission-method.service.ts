import { appConstant, PermissionMethodEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as _ from 'lodash';
import { In, Not, Repository } from 'typeorm';
@Injectable()
export class PermissionMethodService {
    constructor(
        @InjectRepository(PermissionMethodEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaPermissionTypeRepository: Repository<PermissionMethodEntity>,
        @InjectRepository(PermissionMethodEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaPermissionTypeRepository: Repository<PermissionMethodEntity>,
    ) {}
    async findModules(condition: any, fields = 'module') {
        return await this.readReplicaPermissionTypeRepository.createQueryBuilder(
            'permissionMethod',
        )
            .select(fields)
            .distinct(true)
            .where(condition)
            .execute();
    }
    async find() {
        return await this.readReplicaPermissionTypeRepository.find();
    }
    async findActions(condition: any) {
        const action_data =
            await this.readReplicaPermissionTypeRepository.createQueryBuilder(
                'permissionMethod',
            )
                .select(
                    'permissionMethod.id AS method_id, permissionMethod.action, _roles.id AS role_id, _roles.title, _permission.permission',
                )
                .leftJoinAndMapMany(
                    'permissionMethod.roles',
                    tableConstant.MASTER.TBL_ROLES,
                    '_roles',
                    `1=1`,
                )
                .leftJoinAndMapOne(
                    'permissionMethod.permission',
                    tableConstant.PERMISSION.TBL_ROLE,
                    '_permission',
                    `_permission.method_id = permissionMethod.id AND _permission.role_id = _roles.id AND _permission.status = 1`,
                )
                .where(condition)
                .execute();
        const action_records = _.chain(action_data)
            .groupBy('action')
            .map((value: any, key: any) => ({
                action: key,
                method_id: value[0].method_id,
                roles: value.map((s_role: any, s_role_key: any) => ({
                    id: s_role.role_id,
                    title: s_role.title,
                    permission:
                        s_role.role_id == appConstant.ROLE.ADMIN
                            ? 1
                            : s_role.permission
                              ? 1
                              : 0,
                })),
            }))
            .value();
        return action_records;
    }
    async findOne(condition: any) {
        return await this.readReplicaPermissionTypeRepository.findOne({
            where: condition,
        });
    }
    async update(data: any) {
        const record = await this.readReplicaPermissionTypeRepository.createQueryBuilder('permissionMethod')
            .select('permissionMethod.id')
            .where(`permissionMethod.slug = '${data?.slug?.toString()}'`)
            .getOne();
        if (record) {
            data['id'] = record['id'];
        }
        let result = await this.writeReplicaPermissionTypeRepository.save(data);
        return record ? result : {...result, new: true};
    }
    async delete(dataArr: any) {
        try {
            //update status 0 not deleting record
            return await this.writeReplicaPermissionTypeRepository.update({
                slug: <any>Not(In(dataArr)),
                status: 1
            },{ status: 0 });
        } catch (error) {
            return error.message;
        }
    }
    async findRoleModules(condition: any,orderBy: any = null) {
        try{
            if (!orderBy) {
                orderBy = { id: 'DESC' };
            }
            const action_data =
                await this.readReplicaPermissionTypeRepository.createQueryBuilder(
                    'permissionMethod',
                )
                    .leftJoinAndMapOne(
                        'permissionMethod.roles',
                        tableConstant.PERMISSION.TBL_ROLE,
                        'roles',
                        `roles.method_id = permissionMethod.id AND roles.role_id = ${condition.role_id} AND roles.status = 1`,
                    )
                    .orderBy(`permissionMethod.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
                    .where({})
                    .getMany();
            const result = _.groupBy(action_data, ({ module }) => module);
            const groupedData = Object.keys(result).reduce((acc, module) => {
                const groupedByController = _.groupBy(result[module], 'controller');
                const controllers = Object.keys(groupedByController).map(controller => {
                    return {
                        controller,
                        actions: groupedByController[controller].map(element => ({
                            id: element.id,
                            action: element.action,
                            permission: condition.role_id == 1 ? 1 : (element.roles?.permission == 1 ? 1 : 0)
                        }))
                    };
                });
                acc.push({ module, controllers });
                return acc;
            }, []);
            return groupedData;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
}
