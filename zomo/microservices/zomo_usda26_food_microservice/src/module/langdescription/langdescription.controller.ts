import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { LangDescriptionService } from './langdescription.service';
@Controller()
export class LangDescriptionController {
    constructor(private readonly LangDescService: LangDescriptionService) {}
    @MessagePattern({ cmd: 'paginate_lang_desc' })
    paginateLangDesc(postData: any) {
        return this.LangDescService.paginateLangDesc(
            postData?.condition,
            postData?.order,
            postData?.orderBy,
            postData?.paginate,
        );
    }
    @MessagePattern({ cmd: 'create_lang_desc' })
    createLangDesc(postData: any) {
        return this.LangDescService.createLangDesc(postData);
    }
    @MessagePattern({ cmd: 'update_lang_desc' })
    updateLangDesc(postData: any) {
        const where = { id: postData?.id };
        delete postData?.id;
        return this.LangDescService.updateLangDesc(where, postData);
    }
    @MessagePattern({ cmd: 'list_lang_desc' })
    findLangDesc(postData: any) {
        return this.LangDescService.listLangDesc(postData);
    }
    @MessagePattern({ cmd: 'get_one_lang_desc' })
    getOneLangDesc(postData: any) {
        return this.LangDescService.getOneLangDesc(postData);
    }
    @MessagePattern({ cmd: 'delete_lang_desc' })
    deleteLangDesc(postData: any) {
        return this.LangDescService.deleteLangDesc(postData);
    }
}
