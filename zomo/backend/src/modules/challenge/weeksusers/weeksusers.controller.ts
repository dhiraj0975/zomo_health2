import {
    Controller,
    UseGuards,
} from '@nestjs/common';
import { RoleGuard, TokenGuard, AccessGuard } from '../../../guard';
@Controller('challenge/Weeks-users')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class WeeksUsersController {
    constructor(
    ) {}
}