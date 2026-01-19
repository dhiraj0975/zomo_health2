import { ActivePluginsEntity, appConstant, CommonArrayService, CommonFileService } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from "typeorm";
import { PaginateWithCompanyInput } from "../../../input";
import { UserService } from "../../user/user/user.service";
@Injectable()
export class ActivePluginService {
    constructor(
      @InjectRepository(ActivePluginsEntity, appConstant.READ_REPLICA.toLowerCase())
      private readonly readReplicaActivePluginsRepository: Repository<ActivePluginsEntity>,
      @InjectRepository(ActivePluginsEntity, appConstant.MAIN.toLowerCase())
      private readonly writeReplicaActivePluginsRepository: Repository<ActivePluginsEntity>,
      private readonly userService: UserService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(fields: any[] = [],condition: any, paginationParam: PaginateWithCompanyInput) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
        const queryResult = await this.userService.activePluginsRecord(condition,fields,paginationParam)
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any, orderBy: any = null,fields: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaActivePluginsRepository.findOne({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async listRecord(condition: object|string = null, orderBy: object = null, fields: (keyof ActivePluginsEntity)[] = []): Promise<ActivePluginsEntity[]> {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let query = this.readReplicaActivePluginsRepository.createQueryBuilder('plugin');
        if(condition != '' && condition !== null){
            query = query.where(condition);
        }
        return await query.select(fields.length ? fields : ['plugin'])
        .orderBy(`plugin.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaActivePluginsRepository.create(data);
        return await this.writeReplicaActivePluginsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaActivePluginsRepository.metadata);
        return await this.writeReplicaActivePluginsRepository.createQueryBuilder('role')
            .update(ActivePluginsEntity)
            .set(data)
            .where(condition)
            .execute();
    }

    async getActivePluginList(org_id: number | null | undefined,orderBy: Record<string, "ASC" | "DESC"> = null,fields: (keyof ActivePluginsEntity)[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let pluginsDetails = await this.readReplicaActivePluginsRepository.find({
            where: {company_id: org_id},
            select: fields,
            order: orderBy,
        });

        if (!pluginsDetails || pluginsDetails.length === 0) {
            return [];
        }

        const activePlugins: string[] = [];

        for (const plugin of pluginsDetails) {
            try {
                const parsed = typeof plugin["plugin_name"] === "string"
                    ? JSON.parse(plugin["plugin_name"])
                    : plugin["plugin_name"];

                if (parsed && typeof parsed === "object") {
                    activePlugins.push(...Object.keys(parsed));
                }
            } catch (err) {
                console.error("Invalid plugin_name JSON:", plugin["plugin_name"], err);
            }
        }
        return activePlugins;
    }

    async checkActivePlugin(org_id: number | null | undefined, pluginName: string | null | undefined) {
        if (!org_id || !pluginName) return false;

        let condition = `plugin.company_id = ${org_id} AND JSON_EXTRACT(plugin.plugin_name, '$.${pluginName}') = 1`;
        const isActive = await this.readReplicaActivePluginsRepository
            .createQueryBuilder('plugin')
            .where(condition)
            .getMany();
        if (!isActive || isActive.length === 0) {
            return false;
        }
        return true;
    }
}
