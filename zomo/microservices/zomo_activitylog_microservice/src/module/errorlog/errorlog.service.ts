import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorLogEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class ErrorLogService {
    constructor(
        @InjectRepository(ErrorLogEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaErrorLogRepository: Repository<ErrorLogEntity>,
        @InjectRepository(ErrorLogEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaErrorLogRepository: Repository<ErrorLogEntity>,
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
