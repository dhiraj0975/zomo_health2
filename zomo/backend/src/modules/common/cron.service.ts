import { CommonDateService } from "@common-constants";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Cron } from '@nestjs/schedule';
import { lastValueFrom } from "rxjs";
import { ActivePluginService } from "../company/activeplugins/activeplugin.service";
import { CompanyService } from "../company/companies/company.service";
import { MembershipPlanService } from "../company/membershipplan/membershipplan.service";
import { SideMenuSettingsService } from "../company/sidemenusettings/sideMenuSettings.service";
import { NotificationsController } from "../notifications/notifications.controller";
import { NotificationsService } from "../notifications/notifications.service";
import { UserSettingsService } from "../user/usersettings/usersettings.service";
import { UserTabSettingsService } from "../user/usertabsettings/usertabsettings.service";

@Injectable()
export class CronTaskService  {
    private readonly logger = new Logger(CronTaskService.name);   
    constructor(
        private readonly userSettingsService: UserSettingsService,
        private readonly sideMenuSettingsService: SideMenuSettingsService,
        private readonly activePluginService: ActivePluginService,
        private readonly userTabSettingsService: UserTabSettingsService,
        private readonly companyService: CompanyService,
        @Inject('COMMON_SERVICE')
            private commonMicroservice: ClientProxy,
        private readonly membershipPlanService: MembershipPlanService,
        private readonly notificationsController: NotificationsController,
        private readonly notificationsService: NotificationsService,
        private readonly commonDateService: CommonDateService,
    ) { }

    // This will run every minute
    @Cron('0 */1 * * * *')
    async handleCron() {
        this.logger.log('passkeyRemove cron initialized');
        await this.passkeyRemove();
    }

    @Cron('0 */5 * * * *')
    async handleCron5mins() {
        if(!process.env.DB_HOST_PROD_MAIN.includes('localhost')){
            this.logger.log('companySettingDataUpdate cron initialized');
            await this.companySettingDataUpdate();
        }
    }
    @Cron('0 */30 * * * *')
    async handleCronHalfHour() {
        if(!process.env.DB_HOST_PROD_MAIN.includes('localhost')){
            // /* for production push
            this.logger.log('Notification cron initialized');
            await this.notificationCron();
            // */
        }
    }


    async passkeyRemove(): Promise<boolean>{
        try{
            await this.userSettingsService.update(`otp_key IS NOT NULL AND otp_key <> '' AND otp_created < NOW() - INTERVAL 1 HOUR`,{ otp_key: null, otp_created: null });
            return true;
        }
        catch(error){
            this.logger.error(`Error in cron job passkeyRemove: ${error.message}`);
            return false;
        }
    }
    async companySettingDataUpdate(): Promise<boolean>{
        try{
            await this.activePluginUpdate();
            await this.sideMenuUpdate();
            await this.tabSettingUpdate();
            return true;
        }
        catch(error){
            this.logger.error(`Error in cron job companySettingDataUpdate: ${error.message}`);
            return false;
        }
    }
    async activePluginUpdate(): Promise<boolean> {
        try{
            const pluginData = await this.activePluginService.listRecord(`plugin.updated Between '${this.commonDateService.getTodayDate().format('YYYY-MM-DD') +' 00:00:00'}' AND '${this.commonDateService.getTodayDate().format('YYYY-MM-DD') + ' 23:59:59'}'`);
            if(!pluginData || pluginData.length > 0){
                let companyData: any = await this.companyService.listRecord(`company.id in(${pluginData.map(element=>element.company_id).join(',')}) AND company.membership_plan_id is null AND company.status !=2`, null, ['company.id']);
                companyData = companyData?.map(item=>item.id);
                let planData: any = await this.membershipPlanService.listRecord(`membership.status != 2`, null, ['membership.id', 'plugins']);
                planData = planData?.reduce((acc, plan) => {
                            acc[plan['id']] = plan['plugins'];
                            return acc;
                        }, {});
                await Promise.all(pluginData.map(async (item) => {
                    const pluginNames = item?.plugin_name ? Object.keys(JSON.parse(item.plugin_name)) : [];
                    const resultDetails = { pluginname: pluginNames };
                    if (companyData?.includes(item.company_id)) {
                        const closestPlan = await this.findClosestPlan(planData, pluginNames);
                        await this.companyService.update({ id: item.company_id },{ membership_plan_id: closestPlan });
                    }
                    const fileName = `activeplugin_${item.company_id}.json`;
                    const bucketFileName = `local/activeplugin/${item.company_id}/${fileName}`;
                    const base64Data = Buffer.from(JSON.stringify(resultDetails)).toString('base64');
                    await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' },{ path: base64Data, filename: bucketFileName, userBucket: 'public'}));
                }));
            }
            return true;
        }
        catch(error){
            this.logger.error(`Error in cron job activePluginUpdate: ${error.message}`);
            return false;
        }
    }
    async sideMenuUpdate(): Promise<boolean> {
        try{
            const sidemenuData = await this.sideMenuSettingsService.listRecord(`sideMenuSettings.updated_date Between '${this.commonDateService.getTodayDate().format('YYYY-MM-DD') +' 00:00:00'}' AND '${this.commonDateService.getTodayDate().format('YYYY-MM-DD') + ' 23:59:59'}'`);
            await Promise.all(sidemenuData.map(async (item) => {
                    const resultDetails = {
                        datasettingmenu: JSON.parse(item.datasettingmenu),
                        showmenulist: JSON.parse(item.showmenulist)
                    };
                    await this.sideMenuSettingsService.sideMenuSettingJson(resultDetails,item?.org_id)
                    const fileName = `side_menu_${item.org_id}.json`;
                    const bucketFileName = `local/sidemenu/${item.org_id}/${fileName}`;
                    const base64Data = Buffer.from(JSON.stringify(resultDetails)).toString('base64');
                    await lastValueFrom(this.commonMicroservice.send( { cmd: 'upload_file' },{ path: base64Data, filename: bucketFileName, userBucket: 'public' }));
                })
            );

            return true;
        }
        catch(error){
            this.logger.error(`Error in cron job sideMenuUpdate: ${error.message}`);
            return false;
        }
    }
    async tabSettingUpdate(): Promise<boolean> {
        try{
            const tabSettingData = await this.userTabSettingsService.listRecord(`userTabSettings.updated Between '${this.commonDateService.getTodayDate().format('YYYY-MM-DD') +' 00:00:00'}' AND '${this.commonDateService.getTodayDate().format('YYYY-MM-DD') + ' 23:59:59'}'`);
            await Promise.all(tabSettingData.map(async item => {
                const { id, user_id, created, updated, ...filteredTabsetting } = item;
                const resultDetails = { tabsetting: filteredTabsetting };
                const fileName = `tab_setting_${user_id}.json`;
                const bucketFileName = `local/tabsetting/${user_id}/${fileName}`;
                const base64Data = Buffer.from(JSON.stringify(resultDetails)).toString('base64');
                await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' },{ path: base64Data, filename: bucketFileName, userBucket: 'public' }));
            }));
            return true;
        }
        catch(error){
            this.logger.error(`Error in cron job tabSettingUpdate: ${error.message}`);
            return false;
        }
    }
    async findClosestPlan(plans: any, userArr: string[]): Promise<number> {
        let maxMatches = 0;
        let closestPlan = 1;
        for (const planName in plans) {
            const planValues = plans[planName];
            const matches = userArr.filter(value => planValues.includes(value)).length;
            if (matches > maxMatches) {
                maxMatches = matches;
                closestPlan = parseInt(planName);
            }
        }
        return closestPlan;
    }
    async notificationCron(): Promise<boolean> {
        try{
            let where = `notifications.status !=2 AND notifications.is_read = 0 AND JSON_EXTRACT(notifications.metadata, '$.notification_sent') = 0 AND JSON_EXTRACT(notifications.metadata, '$.notification_sent_count') != 10`;
            where += ` AND DATE(STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(notifications.metadata, '$.notification_date')),'%Y-%m-%d')) <= DATE('${this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD')}')`
            const notificationList = await this.notificationsService.listRecord(['notifications'],where,{ id: 'ASC' });
            const today = this.commonDateService.getTodayDate().startOf('day');
            for(let item of notificationList){
                item.metadata['id'] = item?.id;
                let notificationData;
                const dateToCheck = this.commonDateService.getTodayDate(item.metadata['notification_date']);
                if(dateToCheck.isBefore(today)){
                    notificationData = true;
                }
                else{
                    notificationData = await this.notificationsController.sendNotificationImmediate({ user_id: item?.user_id, payload: item?.metadata, title: item?.title, body: item?.message, module_name: item?.module_name });
                }
                let update = item?.metadata;
                if(notificationData){
                    update['notification_sent'] = 1; 
                }
                else{
                    update['notification_sent_count'] += 1; 
                }
                await this.notificationsService.update({id: item.id},{metadata: update}) 
            }
            return true;
        }
        catch(error){
            this.logger.error(`Error in cron job Notification: ${error.message}`);
            return false;
        }
    }
}



