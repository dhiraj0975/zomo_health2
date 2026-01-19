import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { NutrientDataService } from './nutrientdata.service';
@Controller()
export class NutrientDataController {
    constructor(private readonly NutritionDataService: NutrientDataService) {}
    @MessagePattern({ cmd: 'paginate_nutr_data' })
    paginateNutritionData(postData: any) {
        return this.NutritionDataService.paginateNutritionData(
            postData?.condition,
            postData?.order,
            postData?.orderBy,
            postData?.paginate,
        );
    }
    @MessagePattern({ cmd: 'create_nutr_data' })
    createNutritionData(postData: any) {
        return this.NutritionDataService.createNutritionData(postData);
    }
    @MessagePattern({ cmd: 'update_nutr_data' })
    updateNutritionData(postData: any) {
        const where = { id: postData?.id };
        delete postData?.id;
        return this.NutritionDataService.updateNutritionData(where, postData);
    }
    @MessagePattern({ cmd: 'list_nutr_data' })
    findNutritionData(postData: any) {
        return this.NutritionDataService.listNutritionData(postData);
    }
    @MessagePattern({ cmd: 'get_one_nutr_data' })
    getOneNutritionData(postData: any) {
        return this.NutritionDataService.getOneNutritionData(postData);
    }
    @MessagePattern({ cmd: 'delete_nutr_data' })
    deleteNutritionData(postData: any) {
        return this.NutritionDataService.deleteNutritionData(postData);
    }
}
