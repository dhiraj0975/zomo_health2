import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { CampaignRequestsService } from './campaignrequests.service';
@Controller()
export class CampaignRequestsController {
    constructor(
        private readonly campaignRequestsService: CampaignRequestsService,
    ) {}
    @MessagePattern({ cmd: 'paginate_campaign_requests' })
    paginateCampaignRequest(postData: any) {
        return this.campaignRequestsService.paginateCampaignRequests(
            postData?.condition,
            postData?.order,
            postData?.orderBy,
            postData?.paginate,
        );
    }
    @MessagePattern({ cmd: 'create_campaign_requests' })
    createCampaignRequest(postData: any) {
        return this.campaignRequestsService.createCampaignRequests(postData);
    }
    @MessagePattern({ cmd: 'check_campaign_datas' })
    checkCampaignDatas(postData: any) {
        return this.campaignRequestsService.getOneCampaignRequestsCheck(postData);
    }
    @MessagePattern({ cmd: 'update_campaign_requests' })
    updateCampaignRequest(postData: any) {
        if(postData?.id && typeof postData?.id !== undefined && postData?.id !== null){
            const where = { id: postData?.id };
            delete postData?.id;
            return this.campaignRequestsService.updateCampaignRequests(
                where,
                postData,
            );
        }else{
            const where = { parent_id: postData?.parent_id };
            delete postData?.parent_id;
            return this.campaignRequestsService.updateCampaignRequests(
                where,
                postData,
            );
        }
    }
    @MessagePattern({ cmd: 'update_multiple_campaign_requests' })
    updateMultipleCampaignRequests(postData: any) {
        const where = postData?.updatedIDs;
        delete postData?.updatedIDs;
        delete postData?.id;
        delete postData?.hash;
        return this.campaignRequestsService.updateMultipleCampaignRequests(
            where,
            postData,
        );
    }
    @MessagePattern({ cmd: 'list_campaign_requests' })
    findCampaignRequest(postData: any) {
        return this.campaignRequestsService.listCampaignRequests(postData);
    }
    @MessagePattern({ cmd: 'get_one_campaign_requests' })
    getOneCampaignRequest(postData: any) {
        return this.campaignRequestsService.getOneCampaignRequests(postData);
    }
    @MessagePattern({ cmd: 'get_first_campaign_requests' })
    getFirstCampaignRequest(postData: any) {
        return this.campaignRequestsService.getFirstCampaignRequests(postData);
    }
    @MessagePattern({ cmd: 'get_listhash_campaign_requests' })
    getListHashCampaignRequest(postData: any) {
        return this.campaignRequestsService.getListHashCampaignRequests(postData);
    }
    @MessagePattern({ cmd: 'delete_campaign_requests' })
    deleteCampaignRequest(postData: any) {
        return this.campaignRequestsService.deleteCampaignRequests(postData);
    }
    @MessagePattern({ cmd: 'get_all_group_campaign_requests' })
    getAllGroupCampaigns(postData: any) {
        return this.campaignRequestsService.getAllGroupCampaigns(postData);
    }
}
