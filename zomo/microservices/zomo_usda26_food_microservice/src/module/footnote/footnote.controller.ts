import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { FootNoteService } from './footnote.service';
@Controller()
export class FootnoteController {
    constructor(private readonly FootNoteService: FootNoteService) {}
    @MessagePattern({ cmd: 'paginate_foot_note' })
    paginateFootNote(postData: any) {
        return this.FootNoteService.paginateFootNote(
            postData?.condition,
            postData?.order,
            postData?.orderBy,
            postData?.paginate,
        );
    }
    @MessagePattern({ cmd: 'create_foot_note' })
    createFootNote(postData: any) {
        return this.FootNoteService.createFootNote(postData);
    }
    @MessagePattern({ cmd: 'update_foot_note' })
    updateFootNote(postData: any) {
        const where = { id: postData?.id };
        delete postData?.id;
        return this.FootNoteService.updateFootNote(where, postData);
    }
    @MessagePattern({ cmd: 'list_foot_note' })
    findFootNote(postData: any) {
        return this.FootNoteService.listFootNote(postData);
    }
    @MessagePattern({ cmd: 'get_one_foot_note' })
    getOneFootNote(postData: any) {
        return this.FootNoteService.getOneFootNote(postData);
    }
    @MessagePattern({ cmd: 'delete_foot_note' })
    deleteFootNote(postData: any) {
        return this.FootNoteService.deleteFootNote(postData);
    }
}
