import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { WeightService } from './weight.service';
@Controller()
export class WeightController {
    constructor(private readonly WeightService: WeightService) {}
    @MessagePattern({ cmd: 'paginate_weight' })
    paginateWeight(postData: any) {
        return this.WeightService.paginateWeight(
            postData?.condition,
            postData?.order,
            postData?.orderBy,
            postData?.paginate,
        );
    }
    @MessagePattern({ cmd: 'create_weight' })
    createWeight(postData: any) {
        return this.WeightService.createWeight(postData);
    }
    @MessagePattern({ cmd: 'update_weight' })
    updateWeight(postData: any) {
        const where = { id: postData?.id };
        delete postData?.id;
        return this.WeightService.updateWeight(where, postData);
    }
    @MessagePattern({ cmd: 'list_weight' })
    findWeight(postData: any) {
        return this.WeightService.listWeight(postData);
    }
    @MessagePattern({ cmd: 'get_one_weight' })
    getOneWeight(postData: any) {
        return this.WeightService.getOneWeight(postData);
    }
    @MessagePattern({ cmd: 'delete_weight' })
    deleteWeight(postData: any) {
        return this.WeightService.deleteWeight(postData);
    }
}
