import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { EmailGroupsService } from './emailgroups.service';
@Controller()
export class EmailGroupsController {
    constructor(private readonly emailGroupsService: EmailGroupsService) {}
    @MessagePattern({ cmd: 'paginate_email_groups' })
    paginateEmailGroups(postData: any) {
        return this.emailGroupsService.paginateEmailGroups(
            postData?.condition,
            postData?.order,
            postData?.orderBy,
            postData?.paginate,
        );
    }
    @MessagePattern({ cmd: 'create_email_groups' })
    createEmailGroups(postData: any) {
        return this.emailGroupsService.createEmailGroups(postData);
    }
    @MessagePattern({ cmd: 'update_email_groups' })
    updateEmailGroups(postData: any) {
        const where = { id: postData?.id };
        delete postData?.id;
        return this.emailGroupsService.updateEmailGroups(where, postData);
    }
    @MessagePattern({ cmd: 'list_email_groups' })
    findEmailGroups(postData: any) {
        return this.emailGroupsService.listEmailGroups(postData);
    }
    @MessagePattern({ cmd: 'get_one_email_groups' })
    getOneEmailGroups(postData: any) {
        return this.emailGroupsService.getOneEmailGroups(postData);
    }
    @MessagePattern({ cmd: 'status_email_groups' })
    statusEmailGroups(postData: any) {
        const where = { id: postData?.id };
        delete postData?.id;
        return this.emailGroupsService.statusEmailGroups(where, postData);
    }
}
