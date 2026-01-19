import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { DataSrcService } from './datasrc.service';
@Controller()
export class DataSrcController {
    constructor(private readonly dataSourceService: DataSrcService) {}
    @MessagePattern({ cmd: 'paginate_data_source' })
    paginateCampaignRequest(postData: any) {
        return this.dataSourceService.paginateDataSource(
            postData?.condition,
            postData?.order,
            postData?.orderBy,
            postData?.paginate,
        );
    }
    @MessagePattern({ cmd: 'create_data_source' })
    createCampaignRequest(postData: any) {
        return this.dataSourceService.createDataSource(postData);
    }
    @MessagePattern({ cmd: 'update_data_source' })
    updateCampaignRequest(postData: any) {
        if (
            postData?.id &&
            typeof postData?.id !== undefined &&
            postData?.id !== null
        ) {
            const where = { id: postData?.id };
            delete postData?.id;
            return this.dataSourceService.updateDataSource(where, postData);
        }
    }
    @MessagePattern({ cmd: 'list_data_source' })
    findCampaignRequest(postData: any) {
        return this.dataSourceService.listDataSource(postData);
    }
    @MessagePattern({ cmd: 'get_one_data_source' })
    getOneCampaignRequest(postData: any) {
        return this.dataSourceService.getOneDataSource(postData);
    }
    @MessagePattern({ cmd: 'delete_data_source' })
    deleteCampaignRequest(postData: any) {
        return this.dataSourceService.deleteDataSource(postData);
    }
}
