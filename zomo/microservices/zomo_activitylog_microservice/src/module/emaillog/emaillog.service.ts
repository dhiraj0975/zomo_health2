import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EmailLogEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class EmailLogService {
    constructor(
        @InjectRepository(EmailLogEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaErrorLogRepository: Repository<EmailLogEntity>,
        @InjectRepository(EmailLogEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaErrorLogRepository: Repository<EmailLogEntity>,
    ) {}
    async create(data: any) {
        try{
        const savedResult = this.writeReplicaErrorLogRepository.create(data);
        return await this.writeReplicaErrorLogRepository.save(savedResult);
        }
        catch (error) {
            if(error?.includes('MySQL') || error?.message?.includes('MySQL') || error?.message?.includes('--read-only option')){
                const dbHost = this.writeReplicaErrorLogRepository.manager.connection.options;
                console.log('ErrorLogService connection details', {type: dbHost?.type, host: dbHost?.['host'], name: dbHost?.name, database: dbHost?.database});
            }
            return null;
        }
    }
}
