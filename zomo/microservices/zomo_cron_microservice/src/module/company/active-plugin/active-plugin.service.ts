import {
    ActivePluginsEntity,
    appConstant,
    BaseService,
    CommonArrayService
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class ActivePluginService extends BaseService<ActivePluginsEntity> {
    constructor(
        @InjectRepository(
            ActivePluginsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaActivePluginsRepository: Repository<ActivePluginsEntity>,
        @InjectRepository(ActivePluginsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaActivePluginsRepository: Repository<ActivePluginsEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaActivePluginsRepository,
            writeReplicaActivePluginsRepository,
            'activePlugin',
            commonArrayService,
        );
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
    async list(condition: any, orderBy: any = null,fields: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaActivePluginsRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
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
}
