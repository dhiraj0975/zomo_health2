import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import {
    EmailService,
    InitializeTranslateClient,
    S3FileUploader,
} from './common';

@Controller()
export class AppController {
    constructor(
        private readonly emailService: EmailService,
        private readonly fileUploadService: S3FileUploader,
        private readonly initializeTranslateClient: InitializeTranslateClient,
    ) {}

    @MessagePattern({ cmd: 'send_email' })
    sendEmail(postData: any) {
        return this.emailService.sendEmail(
            postData?.sender,
            postData?.receiver,
            postData?.subject,
            postData?.content,
            postData?.template,
            postData?.attachment,
        );
    }

    @MessagePattern({ cmd: 'lang_demo_full' })
    async langDemoFull(postData: any) {
        /*console.log('postData', postData);*/
        const args: [string, string, string, string, boolean?] = [
            postData.sourcePath,
            postData.sourceLang || 'en',
            postData.targetLang || 'fr',
            postData.destinationPath,
        ];
        if (postData?.type === 'dynamic') {
            args.push(true);
        }
        return this.initializeTranslateClient.translateFileSmart(...args);
    }
    @MessagePattern({ cmd: 'lang_demo' })
    langDemo(postData: any) {
        /*return this.initializeTranslateClient.translateText(postData?.text, postData?.sourceLang, postData?.targetLang)*/
    }

    @MessagePattern({ cmd: 'upload_file' })
    fileMoveInBucket(postData: any) {
        return this.fileUploadService.fileMoveInBucket(
            postData?.path,
            postData?.filename,
            postData?.userBucket || 'public',
            postData?.deleteFile,
            postData?.contentDispositionType ?? true,
            postData?.isRemove ?? true,
        );
    }

    @MessagePattern({ cmd: 'get_file' })
    getFileFromBucket(postData: any) {
        return this.fileUploadService.getFileFromBucket(
            postData?.path,
            postData?.userBucket,
        );
    }

    @MessagePattern({ cmd: 'update_file' })
    updateFileContentInBucket(postData: any) {
        return this.fileUploadService.updateFileContentInBucket(
            postData?.path,
            postData?.userBucket || 'public',
            postData?.updateItems,
        );
    }

    @MessagePattern({ cmd: 'list_file' })
    listBucketFiles(postData: any) {
        return this.fileUploadService.listBucketFiles(
            postData?.prefix,
            postData?.userBucket,
        );
    }

    @MessagePattern({ cmd: 'check_file' })
    checkFiles(postData: any) {
        return this.fileUploadService.checkFileInBucket(
            postData?.prefix,
            postData?.userBucket,
        );
    }

    @MessagePattern({ cmd: 'delete_file' })
    deleteFiles(postData: any) {
        return this.fileUploadService.deleteBucketFile(
            postData?.prefix,
            postData?.userBucket,
        );
    }

    @MessagePattern({ cmd: 'copy_file' })
    copyFiles(postData: any) {
        return this.fileUploadService.copyBucketFile(
            postData?.from,
            postData?.to,
            postData?.userBucket,
        );
    }

    @MessagePattern({ cmd: 'copy_directory' })
    copyDirectory(postData: any) {
        return this.fileUploadService.copyS3Directory(
            postData?.from,
            postData?.to,
            postData?.userBucket,
        );
    }

    @MessagePattern({ cmd: 'list_assests' })
    listAssetsPaginate(postData: any) {
        return this.fileUploadService.listAssetsPaginate(
            postData?.maxKeys,
            postData?.prefixes,
            postData?.continuationToken,
        );
    }

    @MessagePattern({ cmd: 'upload_file_communication' })
    upload(postData: any) {
        return this.fileUploadService.uploadCommunicationS3(
            postData?.path,
            postData?.filename,
        );
    }

    @MessagePattern({ cmd: 'remove_file_communication' })
    remove(postData: any) {
        return this.fileUploadService.removeCommunicationS3(postData?.path);
    }

    @MessagePattern({ cmd: 'get_file_communication' })
    getFile(postData: any) {
        return this.fileUploadService.downloadS3File(postData?.path);
    }

    @MessagePattern({ cmd: 'upload_file_watermark_communication' })
    uploadFileWatermark(postData: any) {
        return this.fileUploadService.uploadImageWithWatermark(
            postData?.files,
            postData?.filename,
            postData?.mimetype,
            postData?.watermarkPath,
        );
    }

    @MessagePattern({ cmd: 'test' })
    test() {
        return true;
    }
}
