import { appConstant, PermissionMethodEntity, RoleEntity, RolePermissionEntity } from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleService } from '../master/role/role.service';
import { PermissionMethodController } from './permission-method/permission-method.controller';
import { PermissionMethodService } from './permission-method/permission-method.service';
import { RolePermissionController } from './role-permission/role-permission.controller';
import { RolePermissionService } from './role-permission/role-permission.service';
@Module({
    imports: [
        TypeOrmModule.forFeature([
            PermissionMethodEntity,
            RolePermissionEntity,
            RoleEntity,
        ], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([
            PermissionMethodEntity,
            RolePermissionEntity,
            RoleEntity,
        ], appConstant.MAIN.toLowerCase()),
    ],
    providers: [
        PermissionMethodService,
        RolePermissionService,
        RoleService,
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
    controllers: [PermissionMethodController, RolePermissionController],
    exports: [PermissionMethodService, RolePermissionService, RoleService],
})
export class PermissionModule {}
