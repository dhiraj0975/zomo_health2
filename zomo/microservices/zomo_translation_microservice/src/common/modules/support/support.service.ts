import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { BaseModuleService } from '../shared/base.service';
import {
    CompanySupportsEntity,
    KeyContactsEntity,
    QuickLinkEntity,
    QuickLinkFoldersEntity,
    appConstant,
} from '@common-constants';
import { FieldDataResult } from './support.types';

@Injectable()
export class SupportModuleService extends BaseModuleService {
    constructor(
        @InjectRepository(
            CompanySupportsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly supportRepo: Repository<CompanySupportsEntity>,

        @InjectRepository(
            KeyContactsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly keycontactRepo: Repository<KeyContactsEntity>,

        @InjectRepository(
            QuickLinkEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly quicklinkRepo: Repository<QuickLinkEntity>,

        @InjectRepository(
            QuickLinkFoldersEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly quicklinkFolderRepo: Repository<QuickLinkFoldersEntity>,
    ) {
        super('SupportModuleService');
    }

    async getSupportFields(orgId: string): Promise<FieldDataResult> {
        const supportArry: Record<string, string> = {};
        const supportLabelArry: Record<string, string> = {};

        try {
            if (!orgId) return [{}, {}];

            const selectOrgFieldList = parseInt(orgId, 10);

            const supportResults = await this.supportRepo.find({
                where: {
                    org_id: selectOrgFieldList,
                    status: 1,
                },
                select: [
                    'id',
                    'title',
                    'cname',
                    'ph_number',
                    'operation',
                    'message',
                ],
            });

            if (supportResults && supportResults.length > 0) {
                for (const support of supportResults) {
                    const supportId = support.id;
                    supportArry[`title_${supportId}`] = support.title || '';
                    supportArry[`cname_${supportId}`] = support.cname || '';
                    supportArry[`ph_number_${supportId}`] =
                        support.ph_number || '';
                    supportArry[`operation_${supportId}`] =
                        support.operation || '';
                    supportArry[`message_${supportId}`] = support.message || '';

                    supportLabelArry[`title_${supportId}`] = 'Title';
                    supportLabelArry[`cname_${supportId}`] = 'Contact Person';
                    supportLabelArry[`ph_number_${supportId}`] = 'Phone number';
                    supportLabelArry[`operation_${supportId}`] =
                        'Hours of operation';
                    supportLabelArry[`message_${supportId}`] = 'Message';
                }
            } else {
                const keycontactResults = await this.keycontactRepo.find({
                    where: {
                        company_id: selectOrgFieldList,
                    },
                    select: [
                        'id',
                        'hr_pri_contact',
                        'hr_contact',
                        'tobacco_contact',
                    ],
                });

                if (keycontactResults && keycontactResults.length > 0) {
                    for (const keycontact of keycontactResults) {
                        const keycontactId = keycontact.id;
                        supportArry[`hr_pri_contact_${keycontactId}`] =
                            keycontact.hr_pri_contact || '';
                        supportArry[`hr_contact_${keycontactId}`] =
                            keycontact.hr_contact || '';
                        supportArry[`tobacco_contact_${keycontactId}`] =
                            keycontact.tobacco_contact || '';

                        supportLabelArry[`hr_pri_contact_${keycontactId}`] =
                            'HR Pri Contact';
                        supportLabelArry[`hr_contact_${keycontactId}`] =
                            'HR Contact';
                        supportLabelArry[`tobacco_contact_${keycontactId}`] =
                            'Tobbaco Contact';
                    }
                }
            }
            return [supportArry, supportLabelArry];
        } catch (error) {
            this.logger.error(
                `Error in getSupportFields: ${error.message}`,
                error.stack,
            );
            return [supportArry, supportLabelArry];
        }
    }

    async getQuickLinkFields(orgId: string): Promise<FieldDataResult> {
        const quickFolderArry: Record<string, string> = {};
        const quickFolderLabelArry: Record<string, string> = {};

        try {
            if (!orgId) return [{}, {}];

            const selectOrgFieldList = parseInt(orgId, 10);

            const quicklinkFolderResults = await this.quicklinkFolderRepo.find({
                where: {
                    c_companies_id: selectOrgFieldList,
                    status: 1,
                    folder_name: Not(''),
                },
                select: ['id', 'folder_name'],
            });

            if (quicklinkFolderResults && quicklinkFolderResults.length > 0) {
                for (const folder of quicklinkFolderResults) {
                    const quicklinkFolderId = folder.id;
                    quickFolderArry[`folder_name_${quicklinkFolderId}`] =
                        folder.folder_name || '';
                }
            }

            const quicklinkResults = await this.quicklinkRepo.find({
                where: {
                    c_companies_id: selectOrgFieldList,
                    status: 1,
                },
                select: ['id', 'title', 'description'],
            });

            if (quicklinkResults && quicklinkResults.length > 0) {
                for (const quicklink of quicklinkResults) {
                    const quicklinkId = quicklink.id;
                    quickFolderArry[`title_${quicklinkId}`] =
                        quicklink.title || '';
                    quickFolderArry[`description_${quicklinkId}`] =
                        this.safeDecodeAndParse(quicklink.description || '');
                }
            }

            return [quickFolderArry, quickFolderLabelArry];
        } catch (error) {
            this.logger.error(
                `Error in getQuickLinkFields: ${error.message}`,
                error.stack,
            );
            return [quickFolderArry, quickFolderLabelArry];
        }
    }
}
