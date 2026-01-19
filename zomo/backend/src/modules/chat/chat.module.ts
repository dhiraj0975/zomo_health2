import {
    appConstant, BannedWordEntity,
    ChatEntity,
    ChatSettingsEntity,
    UserEntity
} from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BannedWordController } from "./bannedword/bannedword.controller";
import { BannedWordService } from "./bannedword/bannedword.service";
import { ChatController } from "./chat/chat.controller";
import { ChatService } from "./chat/chat.service";
import { ChatHelperService } from './chat/chathelper.service';
import { ChatSettingsController } from "./chatsettings/chatsettings.controller";
import { ChatSettingsService } from "./chatsettings/chatsettings.service";
import { UserChatController } from './userchat/userchat.controller';
@Module({
    imports: [
        TypeOrmModule.forFeature([BannedWordEntity, ChatEntity, ChatSettingsEntity, UserEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([BannedWordEntity, ChatEntity, ChatSettingsEntity], appConstant.MAIN.toLowerCase()),
    ],
    providers: [BannedWordService, ChatService, ChatSettingsService,ChatHelperService,
        {
                    provide: 'COMMON_SERVICE',
                    inject: [ConfigService],
                    useFactory: () => {
                        return ClientProxyFactory.create({
                            transport: Transport.TCP,
                            options: {
                                host: process.env.COMMON_SERVICE_HOST_PROD ,
                                port: Number(process.env.COMMON_SERVICE_PORT_PROD),
                            }
                        })
                    }
                }
    ],
    controllers: [BannedWordController, ChatController, ChatSettingsController, UserChatController],
    exports: [BannedWordService, ChatService, ChatSettingsService,ChatHelperService],
})
export class ChatModule {}
