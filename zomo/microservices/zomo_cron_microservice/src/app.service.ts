import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { CohortReportController, IncentiveReportController, MyPlanReportController, OrgCensusReportController } from './module';
import { CampaignAnnualReportController } from './module/reports/campaign-annual-report/campaign-annual-report.controller';
import { OrgSalesReportsService } from './module/reports/org-sales-report/orgsalesreports.service';
@Injectable()
export class AppService {
    private runningJobs: Map<string, boolean> = new Map();

    constructor(
        private schedulerRegistry: SchedulerRegistry,
        private readonly myPlanReportController: MyPlanReportController,
        private readonly campaignAnnualReportController: CampaignAnnualReportController,
        private readonly incentiveReportController: IncentiveReportController,
        private readonly cohortReportController: CohortReportController,
        private readonly orgCensusReportController: OrgCensusReportController,
        private readonly orgSalesReportsService: OrgSalesReportsService,
    ) {
        // if(!process.env.DB_HOST_PROD_MAIN.includes('localhost')){
        this.myPlanReportCronJobs();
        // }
    }

    private myPlanReportCronJobs() {
        const jobs = [
            {
                name: 'myPlanReportController.myPlanBusinessRule',
                logName: 'my-plan-business-rule',
                time: '0-59/5 * * * *',
            },
            {
                name: 'myPlanReportController.myPlanComplete',
                logName: 'my-plan-complete',
                time: '2-59/5 * * * *',
            },
            {
                name: 'myPlanReportController.myPlanReport',
                logName: 'my-plan-report',
                time: '5-59/5 * * * *',
            },
            {
                name: 'campaignAnnualReportController.campaignAnnualReport',
                logName: 'campaign-annual-report',
                time: '0-59/5 * * * *',
            },
            {
                name: 'incentiveReportController.incentiveReport',
                logName: 'incentive-report',
                time: '0-59/15 * * * * *',
            },
	        {
                name: 'orgCensusReportController.orgCensusReport',
                logName: 'org-census-report',
                time: '0 0 10 * * *',
            },
            {
                name: 'cohortReportController.cohortreportgenerate',
                logName: 'cohort-report',
                time: '0-59/5 * * * *',
            },
        ];

        for (const job of jobs) {
            try {
                const cronJob = new CronJob(job.time, async () => {
                    if (this.runningJobs.get(job.name)) {
                        console.warn(`[CronService] ${job.logName} is already running. Skipping this cycle.`);
                        return;
                    }

                    this.runningJobs.set(job.name, true); // Mark as running

                    const start = Date.now();


                    try {
                        const method = this.resolveMethodByPath(job.name);

                        if (typeof method === 'function') {
                            await method([]); // Pass blank array

                        } else {
                            console.error(`[CronService] Method ${job.name} does not exist or is not a function.`);
                        }
                    } catch (err) {
                        console.error(`[CronService] Error in ${job.logName}:`, err);
                    } finally {
                        this.runningJobs.set(job.name, false); // Mark as not running
                        const end = Date.now();

                    }
                });

                this.schedulerRegistry.addCronJob(`CronService.${job.name}`, cronJob);
                cronJob.start();


            } catch (error) {
                console.error(`[CronService] Failed to schedule ${job.name}:`, error);
            }
        }
    }

    private resolveMethodByPath(path: string): Function | undefined {
        const parts = path.split('.');
        let context: any = this;

        for (let i = 0; i < parts.length - 1; i++) {
            context = context?.[parts[i]];
            if (!context) return undefined;
        }

        const methodName = parts[parts.length - 1];
        const method = context?.[methodName];

        if (typeof method === 'function') {
            return method.bind(context);
        }

        return undefined;
    }
}
