import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { FoodDescriptionService } from './fooddescription.service';
@Controller()
export class FoodDescriptionController {
    constructor(private readonly foodDescService: FoodDescriptionService) {}
    @MessagePattern({ cmd: 'paginate_food_description' })
    paginateFoodDesc(postData: any) {
        return this.foodDescService.paginateFoodDesc(
            postData?.condition,
            postData?.order,
            postData?.orderBy,
            postData?.paginate,
        );
    }
    @MessagePattern({ cmd: 'create_food_description' })
    createFoodDesc(postData: any) {
        return this.foodDescService.createFoodDesc(postData);
    }
    @MessagePattern({ cmd: 'update_food_description' })
    updateFoodDesc(postData: any) {
        const where = { id: postData?.id };
        delete postData?.id;
        return this.foodDescService.updateFoodDesc(where, postData);
    }
    @MessagePattern({ cmd: 'list_food_description' })
    findFoodDesc(postData: any) {
        return this.foodDescService.listFoodDesc(postData);
    }
    @MessagePattern({ cmd: 'get_one_food_description' })
    getOneFoodDesc(postData: any) {
        return this.foodDescService.getOneFoodDesc(postData);
    }
}
