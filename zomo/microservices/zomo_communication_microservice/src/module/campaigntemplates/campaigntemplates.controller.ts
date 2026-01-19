import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { CampaignTemplatesService } from './campaigntemplates.service';
@Controller()
export class CampaignTemplatesController {
    constructor(
        private readonly campaignTemplatesService: CampaignTemplatesService,
    ) {}
    @MessagePattern({ cmd: 'paginate_campaign_templates' })
    paginateCampaignTemplates(postData: any) {
        return this.campaignTemplatesService.paginateCampaignTemplates(
            postData?.condition,
            postData?.order,
            postData?.orderBy,
            postData?.paginate,
        );
    }
    @MessagePattern({ cmd: 'create_campaign_templates' })
    createCampaignTemplates(postData: any) {
        return this.campaignTemplatesService.createCampaignTemplates(postData);
    }
    @MessagePattern({ cmd: 'update_campaign_templates' })
    updateCampaignTemplates(postData: any) {
        const where = { id: postData?.id };
        delete postData?.id;
        return this.campaignTemplatesService.updateCampaignTemplates(
            where,
            postData,
        );
    }
    @MessagePattern({ cmd: 'list_campaign_templates' })
    findCampaignTemplates(postData: any) {
        return this.campaignTemplatesService.listCampaignTemplates(postData);
    }
    @MessagePattern({ cmd: 'get_one_campaign_templates' })
    getOneCampaignTemplates(postData: any) {
        return this.campaignTemplatesService.getOneCampaignTemplates(postData);
    }
    @MessagePattern({ cmd: 'status_campaign_templates' })
    statusCampaignTemplates(postData: any) {
        const where = { id: postData?.id };
        delete postData?.id;
        return this.campaignTemplatesService.statusCampaignTemplates(where, postData);
    }
}
