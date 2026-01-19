import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { FoodGroupService } from './foodgroup.service';
@Controller()
export class FoodGroupController {
    constructor(private readonly foodGroupService: FoodGroupService) {}
    @MessagePattern({ cmd: 'paginate_food_group' })
    paginateFoodGroup(postData: any) {
        return this.foodGroupService.paginateFoodGroup(
            postData?.condition,
            postData?.order,
            postData?.orderBy,
            postData?.paginate,
        );
    }
    @MessagePattern({ cmd: 'create_food_group' })
    createFoodGroup(postData: any) {
        return this.foodGroupService.createFoodGroup(postData);
    }
    @MessagePattern({ cmd: 'update_food_group' })
    updateFoodGroup(postData: any) {
        const where = { id: postData?.id };
        delete postData?.id;
        return this.foodGroupService.updateFoodGroup(where, postData);
    }
    @MessagePattern({ cmd: 'list_food_group' })
    findFoodGroup(postData: any) {
        return this.foodGroupService.listFoodGroup(postData);
    }
    @MessagePattern({ cmd: 'get_one_food_group' })
    getOneFoodGroup(postData: any) {
        return this.foodGroupService.getOneFoodGroup(postData);
    }
    @MessagePattern({ cmd: 'status_food_group' })
    statusEmailGroups(postData: any) {
        const where = { id: postData?.id };
        delete postData?.id;
        return this.foodGroupService.statusFoodGroup(where, postData);
    }
}
