import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BiometricsOtherEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class BiometricOtherService {
    constructor(
        @InjectRepository(BiometricsOtherEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaBiometricOtherRepository: Repository<BiometricsOtherEntity>,
        @InjectRepository(BiometricsOtherEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaBiometricOtherRepository: Repository<BiometricsOtherEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaBiometricOtherRepository.create(data);
        return await this.writeReplicaBiometricOtherRepository.save(savedResult);
    }
}
