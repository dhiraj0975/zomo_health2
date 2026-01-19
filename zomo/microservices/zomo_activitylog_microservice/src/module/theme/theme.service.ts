import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ThemeEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class ThemeService {
    constructor(
        @InjectRepository(ThemeEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaThemeRepository: Repository<ThemeEntity>,
        @InjectRepository(ThemeEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaThemeRepository: Repository<ThemeEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaThemeRepository.create(data);
        return await this.writeReplicaThemeRepository.save(savedResult);
    }
}
