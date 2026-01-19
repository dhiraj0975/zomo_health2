import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { LangualService } from './langual.service';
@Controller()
export class LangualController {
    constructor(private readonly LangualService: LangualService) {}
    @MessagePattern({ cmd: 'paginate_langual' })
    paginateLangual(postData: any) {
        return this.LangualService.paginateLangual(
            postData?.condition,
            postData?.order,
            postData?.orderBy,
            postData?.paginate,
        );
    }
    @MessagePattern({ cmd: 'create_langual' })
    createLangual(postData: any) {
        return this.LangualService.createLangual(postData);
    }
    @MessagePattern({ cmd: 'update_langual' })
    updateLangual(postData: any) {
        const where = { id: postData?.id };
        delete postData?.id;
        return this.LangualService.updateLangual(where, postData);
    }
    @MessagePattern({ cmd: 'list_langual' })
    findLangual(postData: any) {
        return this.LangualService.listLangual(postData);
    }
    @MessagePattern({ cmd: 'get_one_langual' })
    getOneLangual(postData: any) {
        return this.LangualService.getOneLangual(postData);
    }
    @MessagePattern({ cmd: 'delete_langual' })
    deleteLangual(postData: any) {
        return this.LangualService.deleteLangual(postData);
    }
}
