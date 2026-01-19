import { appConstant, CommonArrayService, CommonFileService, RoleEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from "typeorm";
import { CreateRoleInput, PaginateRoleInput, UpdateRoleInput } from "../../../input";
@Injectable()
export class RoleService {
    constructor(
      @InjectRepository(RoleEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaRoleTypeRepository: Repository<RoleEntity>,
        @InjectRepository(RoleEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaRoleTypeRepository: Repository<RoleEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateRoleInput) {
        const paginateObj = this.commonArrayService.getPaginationVar(
          paginationParam.page || 1,
          paginationParam.limit,
        );
        const order =
          paginationParam && paginationParam.order
            ? paginationParam.order
            : 'DESC';
        const orderBy =
          paginationParam && paginationParam.order_by
            ? paginationParam.order_by
            : 'id';
        const queryResult = await this.readReplicaRoleTypeRepository.createQueryBuilder(
          'role',
        )
          .where(condition)
          .orderBy(orderBy, <any>order)
          .take(paginateObj.take)
          .skip(paginateObj.skip)
          .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaRoleTypeRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'ASC' };
        }
        return await this.readReplicaRoleTypeRepository.find({
            where: condition,
            select: ['id', 'title'],
            order: orderBy,
        });
    }
    async save(data: CreateRoleInput) {
        const savedResult = this.writeReplicaRoleTypeRepository.create(data);
        return await this.writeReplicaRoleTypeRepository.save(savedResult);
    }
    async update(condition: any, data: UpdateRoleInput) {
      data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaRoleTypeRepository.metadata);
        return await this.writeReplicaRoleTypeRepository.createQueryBuilder('role')
            .update(RoleEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async getRolesFromDatabase() {
        return await this.writeReplicaRoleTypeRepository.find({select:{id: true, title: true, alias: true}});
    }
}
