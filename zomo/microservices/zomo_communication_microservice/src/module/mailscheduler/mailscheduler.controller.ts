import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { MailSchedulerService } from './mailscheduler.service';
@Controller()
export class MailSchedulerController {
    constructor(private readonly mailSchedulerService: MailSchedulerService) {}
    @MessagePattern({ cmd: 'paginate_mail_scheduler' })
    paginateMailScheduler(postData: any) {
        return this.mailSchedulerService.paginateMailScheduler(
            postData?.condition,
            postData?.order,
            postData?.orderBy,
            postData?.paginate,
        );
    }
    @MessagePattern({ cmd: 'create_mail_scheduler' })
    createMailScheduler(postData: any) {
        return this.mailSchedulerService.createMailScheduler(postData);
    }
    @MessagePattern({ cmd: 'update_mail_scheduler' })
    updateMailScheduler(postData: any) {
        const where = { id: postData?.id };
        delete postData?.id;
        return this.mailSchedulerService.updateMailScheduler(where, postData);
    }
    @MessagePattern({ cmd: 'list_mail_scheduler' })
    findMailScheduler(postData: any) {
        return this.mailSchedulerService.listMailScheduler(postData);
    }
    @MessagePattern({ cmd: 'get_one_mail_scheduler' })
    getOneMailScheduler(postData: any) {
        return this.mailSchedulerService.getOneMailScheduler(postData);
    }
    @MessagePattern({ cmd: 'delete_mail_scheduler' })
    deleteMailScheduler(postData: any) {
        return this.mailSchedulerService.deleteMailScheduler(postData);
    }
    @MessagePattern({ cmd: 'check_campaign_schedule_datas' })
    getOneCampaignRequestsScheduleCheck(postData: any) {
        return this.mailSchedulerService.getOneCampaignRequestsScheduleCheck(postData);
    }
}
