import { appConstant, SpouseSettingsEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class SpouseSettingsService {
    constructor(
        @InjectRepository(SpouseSettingsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaSpouseSettingsRepository: Repository<SpouseSettingsEntity>,
    ) {}
    async findOne(condition: any) {
        return await this.readReplicaSpouseSettingsRepository.findOne({
            where: condition,
        });
    }
}
