import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AppService } from './app.service';
import { TranslationCommonService, CompanyLanguagesService } from './common';

@Controller()
export class AppController {
    constructor(
        private readonly appService: AppService,
        private readonly companyLanguagesService: CompanyLanguagesService,
        private readonly translationCommonService: TranslationCommonService,
    ) {}
    @MessagePattern({ cmd: 'test' })
    test() {
        return true;
    }
    @MessagePattern({ cmd: 'create_file' })
    async translationFileCreate(data: any) {
        const { id, updatediff, statusdata = 0 } = data;
        try {
            const result = await this.appService.translationFileCreate(
                id || null,
                updatediff || null,
                statusdata,
            );
            return {
                success: true,
                message: result,
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }
    @MessagePattern({ cmd: 'get_file_data' })
    async getTranslationFileData(filePath: string) {
        try {
            const data = await this.appService.getTranslationFileData(filePath);
            return {
                success: true,
                data,
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }
    @MessagePattern({ cmd: 'save_file' })
    async saveTranslationFile(payload: any) {
        const { bucket, filePath, data } = payload;
        try {
            await this.appService.saveTranslationFile(bucket, filePath, data);
            return {
                success: true,
                message: 'Translation file saved successfully',
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }
    @MessagePattern({ cmd: 'update_menu_status' })
    async updateMenuStatus(payload: any) {
        const { bucket, menuItem, status } = payload;
        try {
            await this.appService.updateMenuStatus(bucket, menuItem, status);
            return {
                success: true,
                message: 'Menu status updated successfully',
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }
    @MessagePattern({ cmd: 'cron_timewise' })
    async menuCronTranslationTimeWise() {
        try {
            const result = await this.appService.menuCronTranslationTimeWise();
            return {
                success: true,
                message: result,
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }
    @MessagePattern({ cmd: 'update_translation_status' })
    async updateTranslationStatusCreate(payload: any) {
        const { bucket, completeTranslationMenu, status } = payload;
        try {
            await this.appService.updateTranslationStatusCreate(
                bucket,
                completeTranslationMenu,
                status,
            );
            return {
                success: true,
                message: 'Translation status updated successfully',
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }
    @MessagePattern({ cmd: 'update_translation_status_array' })
    async updateTranslationStatusCreateArray(payload: any) {
        const { bucket, completeTranslationMenu } = payload;
        try {
            await this.appService.updateTranslationStatusCreateArray(
                bucket,
                completeTranslationMenu,
            );
            return {
                success: true,
                message: 'Translation status array updated successfully',
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }
    @MessagePattern({ cmd: 'check_exist_file' })
    async checkForExistFile(payload: any) {
        const { bucket, langTranslationArray } = payload;
        try {
            const result = await this.appService.checkForExistFile(
                bucket,
                langTranslationArray,
            );
            return {
                success: true,
                data: result,
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }
    @MessagePattern({ cmd: 'check_last_updated_file' })
    async checkLastUpdatedFile() {
        try {
            const result = await this.appService.fileCheckLastUpdatedFile();
            return {
                success: true,
                message: result,
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }
}
