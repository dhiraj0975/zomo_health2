import { Injectable } from '@nestjs/common';
import {
    BackupController,
    SkipController,
    DepartmentController,
    LocationController,
    UserController,
    UserSettingsController,
    CensusCustomFieldsValuesController,
    ImportUserRequestController,
    CommunicationController,
} from './module';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

@Injectable()
export class AppService {
    private runningJobs: Map<string, boolean> = new Map();

    constructor(
        private schedulerRegistry: SchedulerRegistry,
        private readonly backupController: BackupController,
        private readonly skipController: SkipController,
        private readonly departmentController: DepartmentController,
        private readonly locationController: LocationController,
        private readonly userController: UserController,
        private readonly userSettingsController: UserSettingsController,
        private readonly censusCustomFieldsValuesController: CensusCustomFieldsValuesController,
        private readonly importUserRequestController: ImportUserRequestController,
        private readonly communicationController: CommunicationController,
    ) {
        this.createImportUserCronJobs();
    }

    private createImportUserCronJobs() {
        const jobs = [
            {
                name: 'backupController.importUserProcessBackup',
                logName: 'import-user-process-backup',
                time: '0-59/3 * * * *',
            },
            {
                name: 'skipController.importUserProcessSkip',
                logName: 'import-user-process-skip',
                time: '1-59/3 * * * *',
            },
            {
                name: 'departmentController.importUserProcessDept',
                logName: 'import-user-process-dept',
                time: '2-59/3 * * * *',
            },
            {
                name: 'locationController.importUserProcessLoc',
                logName: 'import-user-process-loc',
                time: '3-59/3 * * * *',
            },
            {
                name: 'userController.importUserProcessSys',
                logName: 'import-user-process-sys',
                time: '4-59/3 * * * *',
            },
            {
                name: 'userSettingsController.importUserProcessSettings',
                logName: 'import-user-process-settings',
                time: '5-59/3 * * * *',
            },
            {
                name: 'censusCustomFieldsValuesController.importUserProcessCustomField',
                logName: 'import-user-process-custom-field',
                time: '6-59/3 * * * *',
            },
            {
                name: 'importUserRequestController.importUserProcessCreateFile',
                logName: 'import-user-process-create-file',
                time: '2-59/5 * * * *',
            },
            {
                name: 'communicationController.importUserProcessEmail',
                logName: 'import-user-process-email',
                time: '4-59/10 * * * *',
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
                    console.log(`[CronService] ${job.logName} started at ${new Date().toISOString()}`);

                    try {
                        const method = this.resolveMethodByPath(job.name);

                        if (typeof method === 'function') {
                            await method([]); // Pass blank array
                            console.log(`[CronService] ${job.logName} completed`);
                        } else {
                            console.error(`[CronService] Method ${job.name} does not exist or is not a function.`);
                        }
                    } catch (err) {
                        console.error(`[CronService] Error in ${job.logName}:`, err);
                    } finally {
                        this.runningJobs.set(job.name, false); // Mark as not running
                        const end = Date.now();
                        console.log(`[CronService] ${job.logName} finished in ${end - start}ms`);
                    }
                });

                this.schedulerRegistry.addCronJob(`CronService.${job.name}`, cronJob);
                cronJob.start();

                console.log(`[CronService] ${job.logName} scheduled with cron: ${job.time}`);
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