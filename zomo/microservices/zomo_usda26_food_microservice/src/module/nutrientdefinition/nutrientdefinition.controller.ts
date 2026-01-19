import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { NutrientDefinitionService } from './nutrientdefinition.service';
@Controller()
export class NutrientDefinitionController {
    constructor(
        private readonly NutritionDefService: NutrientDefinitionService,
    ) {}
    @MessagePattern({ cmd: 'paginate_nutr_def' })
    paginateNutritionDef(postData: any) {
        return this.NutritionDefService.paginateNutritionDef(
            postData?.condition,
            postData?.order,
            postData?.orderBy,
            postData?.paginate,
        );
    }
    @MessagePattern({ cmd: 'create_nutr_def' })
    createNutritionDef(postData: any) {
        return this.NutritionDefService.createNutritionDef(postData);
    }
    @MessagePattern({ cmd: 'update_nutr_def' })
    updateNutritionDef(postData: any) {
        const where = { id: postData?.id };
        delete postData?.id;
        return this.NutritionDefService.updateNutritionDef(where, postData);
    }
    @MessagePattern({ cmd: 'list_nutr_def' })
    findNutritionDef(postData: any) {
        return this.NutritionDefService.listNutritionDef(postData);
    }
    @MessagePattern({ cmd: 'get_one_nutr_def' })
    getOneNutritionDef(postData: any) {
        return this.NutritionDefService.getOneNutritionDef(postData);
    }
    @MessagePattern({ cmd: 'delete_nutr_def' })
    deleteNutritionDef(postData: any) {
        return this.NutritionDefService.deleteNutritionDef(postData);
    }
}
