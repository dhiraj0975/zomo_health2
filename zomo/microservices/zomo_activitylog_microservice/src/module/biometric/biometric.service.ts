import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BiometricsEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class BiometricService {
    constructor(
        @InjectRepository(BiometricsEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaBiometricRepository: Repository<BiometricsEntity>,
        @InjectRepository(BiometricsEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaBiometricRepository: Repository<BiometricsEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaBiometricRepository.create(data);
        return await this.writeReplicaBiometricRepository.save(savedResult);
    }
}
