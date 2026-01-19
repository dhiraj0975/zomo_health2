import { appConstant, UserDownloadLogEntity } from "@common-constants";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CreateUserDownloadLogInput } from "src/input/user/CreateUserDownloadLog.input";
import { Repository } from "typeorm";

@Injectable()
export class UserDownloadLogService {
    constructor(
        @InjectRepository(UserDownloadLogEntity, appConstant.MAIN.toLowerCase())
        private readonly userDownloadRepository: Repository<UserDownloadLogEntity>,
    ) { }

    async save(input: CreateUserDownloadLogInput): Promise<UserDownloadLogEntity> {
        const savedResult = this.userDownloadRepository.create({
            user_id: input.user_id,
            email: input.email,
            metadata: input.metadata,
        });
        return await this.userDownloadRepository.save(savedResult);
    }
}
