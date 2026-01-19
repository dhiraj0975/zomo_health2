import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseModuleService } from '../shared/base.service';
import { EntityKeyMap, FieldDataResult } from './organization.types';
import {
    DepartmentsEntity,
    LocationsEntity,
    appConstant,
} from '@common-constants';

@Injectable()
export class OrganizationModuleService extends BaseModuleService {
    constructor(
        @InjectRepository(
            DepartmentsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly departmentRepo: Repository<DepartmentsEntity>,

        @InjectRepository(
            LocationsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly locationRepo: Repository<LocationsEntity>,
    ) {
        super('OrganizationModuleService');
    }

    async getDepartmentList(companyId?: string): Promise<EntityKeyMap> {
        try {
            this.logger.log(
                `Fetching departments for companyId: ${companyId || 'all'}`,
            );

            return await this.fetchAndMapEntities(
                this.departmentRepo,
                this.buildCompanyWhereCondition(
                    { deleted: 0 },
                    companyId,
                    'company_id',
                ),
                'id',
                'dept_name',
                'getDepartmentList',
            );
        } catch (error) {
            this.logger.error(
                `Error in getDepartmentList: ${error.message}`,
                error.stack,
            );
            return {};
        }
    }

    async getLocationList(companyId?: string): Promise<EntityKeyMap> {
        try {
            this.logger.log(
                `Fetching locations for companyId: ${companyId || 'all'}`,
            );

            return await this.fetchAndMapEntities(
                this.locationRepo,
                this.buildCompanyWhereCondition(
                    { status: 1 },
                    companyId,
                    'company_id',
                ),
                'id',
                'location_name',
                'getLocationList',
            );
        } catch (error) {
            this.logger.error(
                `Error in getLocationList: ${error.message}`,
                error.stack,
            );
            return {};
        }
    }
    async getDepartmentFields(departmentId: string): Promise<FieldDataResult> {
        try {
            this.logger.log(
                `Fetching department fields for id: ${departmentId}`,
            );

            return await this.fetchSingleEntityFields(
                this.departmentRepo,
                departmentId,
                { status: 1 },
                {
                    department_name: 'dept_name',
                    department_desc: 'dept_desc',
                },
                'getDepartmentFields',
            );
        } catch (error) {
            this.logger.error(
                `Error in getDepartmentFields: ${error.message}`,
                error.stack,
            );
            return [{}, {}];
        }
    }
    async getLocationFields(locationId: string): Promise<FieldDataResult> {
        try {
            this.logger.log(`Fetching location fields for id: ${locationId}`);

            return await this.fetchSingleEntityFields(
                this.locationRepo,
                locationId,
                { status: 1 },
                {
                    location_name: 'location_name',
                    location_address1: 'address1',
                    location_lname: 'lname',
                    location_city: 'city',
                    location_state: 'state',
                    location_country: 'country',
                },
                'getLocationFields',
            );
        } catch (error) {
            this.logger.error(
                `Error in getLocationFields: ${error.message}`,
                error.stack,
            );
            return [{}, {}];
        }
    }
}
