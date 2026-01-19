import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { DataSrcLnService } from './datasrcln.service';
@Controller()
export class DataSrcLnController {
    constructor(private readonly dataSourceLnService: DataSrcLnService) {}
    @MessagePattern({ cmd: 'paginate_data_source_ln' })
    paginateCampaignRequest(postData: any) {
        return this.dataSourceLnService.paginateDataSource(
            postData?.condition,
            postData?.order,
            postData?.orderBy,
            postData?.paginate,
        );
    }
    @MessagePattern({ cmd: 'create_data_source_ln' })
    createCampaignRequest(postData: any) {
        return this.dataSourceLnService.createDataSource(postData);
    }
    @MessagePattern({ cmd: 'update_data_source_ln' })
    updateCampaignRequest(postData: any) {
        if (
            postData?.id &&
            typeof postData?.id !== undefined &&
            postData?.id !== null
        ) {
            const where = { id: postData?.id };
            delete postData?.id;
            return this.dataSourceLnService.updateDataSource(where, postData);
        }
    }
    @MessagePattern({ cmd: 'list_data_source_ln' })
    findCampaignRequest(postData: any) {
        return this.dataSourceLnService.listDataSource(postData);
    }
    @MessagePattern({ cmd: 'get_one_data_source_ln' })
    getOneCampaignRequest(postData: any) {
        return this.dataSourceLnService.getOneDataSource(postData);
    }
    @MessagePattern({ cmd: 'delete_data_source_ln' })
    deleteCampaignRequest(postData: any) {
        return this.dataSourceLnService.deleteDataSource(postData);
    }
}
