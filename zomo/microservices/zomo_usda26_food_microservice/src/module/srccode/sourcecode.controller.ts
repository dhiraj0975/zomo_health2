import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { SourceCodeService } from './sourcecode.service';
@Controller()
export class SourceCodeController {
    constructor(private readonly SourceCodeService: SourceCodeService) {}
    @MessagePattern({ cmd: 'paginate_source_code' })
    paginateSourceCode(postData: any) {
        return this.SourceCodeService.paginateSourceCode(
            postData?.condition,
            postData?.order,
            postData?.orderBy,
            postData?.paginate,
        );
    }
    @MessagePattern({ cmd: 'create_source_code' })
    createSourceCode(postData: any) {
        return this.SourceCodeService.createSourceCode(postData);
    }
    @MessagePattern({ cmd: 'update_source_code' })
    updateSourceCode(postData: any) {
        const where = { id: postData?.id };
        delete postData?.id;
        return this.SourceCodeService.updateSourceCode(where, postData);
    }
    @MessagePattern({ cmd: 'list_source_code' })
    findSourceCode(postData: any) {
        return this.SourceCodeService.listSourceCode(postData);
    }
    @MessagePattern({ cmd: 'get_one_source_code' })
    getOneSourceCode(postData: any) {
        return this.SourceCodeService.getOneSourceCode(postData);
    }
    @MessagePattern({ cmd: 'delete_source_code' })
    deleteSourceCode(postData: any) {
        return this.SourceCodeService.deleteSourceCode(postData);
    }
}
