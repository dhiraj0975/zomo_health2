import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { EmailConfigsService } from './emailconfigs.service';
@Controller()
export class EmailConfigsController {
    constructor(private readonly emailConfigsService: EmailConfigsService) {}
    @MessagePattern({ cmd: 'paginate_email_configs' })
    paginateEmailConfigs(postData: any) {
        return this.emailConfigsService.paginateEmailConfigs(
            postData?.condition,
            postData?.order,
            postData?.orderBy,
            postData?.paginate,
        );
    }
    @MessagePattern({ cmd: 'create_email_configs' })
    createEmailConfigs(postData: any) {
        return this.emailConfigsService.createEmailConfigs(postData);
    }
    @MessagePattern({ cmd: 'update_email_configs' })
    updateEmailConfigs(postData: any) {
        const where = { id: postData?.id };
        delete postData?.id;
        return this.emailConfigsService.updateEmailConfigs(where, postData);
    }
    @MessagePattern({ cmd: 'list_email_configs' })
    findEmailConfigs(postData: any) {
        return this.emailConfigsService.listEmailConfigs(postData);
    }
    @MessagePattern({ cmd: 'get_one_email_configs' })
    getOneEmailConfigs(postData: any) {
        return this.emailConfigsService.getOneEmailConfigs(postData);
    }
    @MessagePattern({ cmd: 'status_email_configs' })
    statusEmailGroups(postData: any) {
        const where = { id: postData?.id };
        delete postData?.id;
        return this.emailConfigsService.statusEmailConfigs(where, postData);
    }
}
