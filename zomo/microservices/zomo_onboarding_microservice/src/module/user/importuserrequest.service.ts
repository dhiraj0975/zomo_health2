import {
    appConstant,
    BaseService,
    CommonArrayService,
    ImportUserRequestEntity,
} from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { lastValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
@Injectable()
export class ImportUserRequestService extends BaseService<ImportUserRequestEntity> {
    constructor(
        @InjectRepository(
            ImportUserRequestEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaImportUserRepository: Repository<ImportUserRequestEntity>,
        @InjectRepository(
            ImportUserRequestEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaImportUserRepository: Repository<ImportUserRequestEntity>,
        commonArrayService: CommonArrayService,
        @Inject('CENSUS_SERVICE')
        private censusMicroservice: ClientProxy,
    ) {
        super(
            readReplicaImportUserRepository,
            writeReplicaImportUserRepository,
            'importUser',
            commonArrayService,
        );
    }
    async processSteps(initialStep: string, postData: any) {
        let currentStep = initialStep;

        while (currentStep && currentStep !== 'finish') {
            postData = { ...postData, name: currentStep };

            try {
                // console.log(`${currentStep} - start`);
                const response = await lastValueFrom(
                    this.censusMicroservice.send(
                        { cmd: currentStep },
                        postData,
                    ),
                );
                // console.log(`${currentStep} - end`);
                // console.log(`${currentStep} - done`, response);

                currentStep = response?.next_step;
            } catch (err) {
                console.error(`Error in ${currentStep}:`, err);
                break;
            }
        }

        if (currentStep === 'finish') {
            console.log('Process completed successfully.');
        } else {
            console.log('Process terminated before completion.');
        }
    }
}
