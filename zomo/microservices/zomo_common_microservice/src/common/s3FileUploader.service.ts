import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, ObjectCannedACL, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from "@nestjs/common";
import * as fs from 'fs';
const Jimp = require('jimp');

let bucket = process.env.NODE_ENV == 'PROD' ? process.env.AWS_BUCKET_PROD : process.env.AWS_BUCKET_DEV;
const Region = process.env.NODE_ENV == 'PROD' ? process.env.AWS_REGION_PROD : process.env.AWS_REGION_DEV;
const RoleArn = process.env.NODE_ENV == 'PROD' ? process.env.IAM_ROLE_ARN_PROD : process.env.IAM_ROLE_ARN_DEV;


const communicationBucket = process.env.AWS_COMMUNICATION_BUCKET_NAME;
const communicationRegion = process.env.AWS_COMMUNICATION_REGION;
const communicationAccessKey = process.env.AWS_COMMUNICATION_ACCESS_KEY;
const communicationSecretKey = process.env.AWS_COMMUNICATION_SECRET_ACCESS_KEY;

let S3Com = new S3Client({
  region: communicationRegion,
  credentials: {
    accessKeyId: communicationAccessKey,
    secretAccessKey: communicationSecretKey,
  },
});


@Injectable()
export class S3FileUploader {
  private s3: S3Client; // Making the S3 client accessible within the class

  constructor() {
    this.initializeS3Client()
    this.initializeCommunicationS3Client();
  }

  private async initializeS3Client() {
    if(process.env?.LOCAL){
      this.s3 = new S3Client({
        region: Region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_PROD!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_PROD!,
        },
      });
    }
    else{
      this.s3 = new S3Client({ region: process.env.AWS_REGION });
    }
  }
  private initializeCommunicationS3Client() {
    if (process.env?.LOCAL) {
      S3Com = new S3Client({
        region: communicationRegion,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_PROD!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_PROD!,
        },
      });
    } else {
      S3Com = new S3Client({
        region: communicationRegion,
      });
    }
  }
  private async logCallerIdentity() {
    try {
      const stsClient = new STSClient({ region: Region });
      const command = new GetCallerIdentityCommand({});
      const response = await stsClient.send(command);

      console.log("Caller Identity Details:");
      console.log("ARN:", response.Arn);
      console.log("Account ID:", response.Account);
      console.log("User ID:", response.UserId);
      return true;
    } catch (error) {
      console.error("Error fetching caller identity:", error);
      return true;
    }
  }

  getContentType(fileName) {
    try{
      const ext = fileName.split('.').pop().toLowerCase();
      const mimeTypes = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        bmp: 'image/bmp',
        tiff: 'image/tiff',
        webp: 'image/webp',
        svg: 'image/svg+xml',
        heic: 'image/heic',
        heif: 'image/heif',
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ppt: 'application/vnd.ms-powerpoint',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        odt: 'application/vnd.oasis.opendocument.text',
        ods: 'application/vnd.oasis.opendocument.spreadsheet',
        csv: 'text/csv',
        zip: 'application/zip',
        rar: 'application/vnd.rar',
        tar: 'application/x-tar',
        gz: 'application/gzip',
        bz2: 'application/x-bzip2',
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        ogg: 'audio/ogg',
        flac: 'audio/flac',
        m4a: 'audio/mp4',
        aac: 'audio/aac',
        mp4: 'video/mp4',
        mkv: 'video/x-matroska',
        webm: 'video/webm',
        avi: 'video/x-msvideo',
        mov: 'video/quicktime',
        flv: 'video/x-flv',
        wmv: 'video/x-ms-wmv',
        ttf: 'font/ttf',
        otf: 'font/otf',
        woff: 'font/woff',
        woff2: 'font/woff2',
        txt: 'text/plain',
        md: 'text/markdown',
        html: 'text/html',
        css: 'text/css',
        js: 'application/javascript',
        json: 'application/json',
        xml: 'application/xml',
        ico: 'image/x-icon',
        jsf: 'application/json',
        eps: 'application/postscript',
        psd: 'image/vnd.adobe.photoshop',
        iso: 'application/x-iso9660-image',
        eml: 'message/rfc822',
        msg: 'application/vnd.ms-outlook',
      };
      return mimeTypes[ext] || 'application/octet-stream';
    }catch (error) {
      throw new Error(error.message);
    }
  }

  isBase64(str) {
    try{
      const regex = /^[A-Za-z0-9+/=]+$/;
      return regex.test(str) && str.length % 4 === 0;
    }catch (error) {
      throw new Error(error.message);
    }
  }

  async fileMoveInBucket(file: string, to: string, useBucket : string = 'public', deleteFile: boolean = true, ContentDispositionType: boolean = true,isRemove: boolean = true) {
    try {
      useBucket = useBucket || 'public';
      if(useBucket != 'public'){
        bucket = process.env.AWS_BUCKET_PRIVATE_PROD;
      }
      else{
        bucket = process.env.AWS_BUCKET_PROD;
      }
      let ContentDisposition = 'attachment';
      if (ContentDispositionType && file?.match(/\.(gif|jpg|jpeg|png|pjpeg|x-png|bmp|tiff|webp|svg|heic|heif|json)$/i)){
        ContentDisposition = 'inline';
      }
      const contentType = this.getContentType(file);
      let fileStream;
      if(file?.includes('base64')){
        fileStream = Buffer.from(file.split(',')[1], 'base64');
      }
      else if(this.isBase64(file)){
        fileStream = Buffer.from(file, 'base64')
      }
      else{
        if (fs.existsSync(file)) {
          fileStream = fs.createReadStream(file);
        } else {
          return false;
        }
      }
      const params = {
        Bucket: bucket,
        Body: fileStream,
        Key: to,
        ContentType: contentType,
        ContentDisposition: ContentDisposition,
        CacheControl: 'no-cache, no-store, must-revalidate',
        Expires: new Date(0),
      };

      const command = new PutObjectCommand(params);
      // const s3Client = await this.initializeS3Client();
      // const upload = await s3Client.send(command);
      const upload = await this.s3.send(command);
      // const upload = await this.s3.upload(params).promise();
      if(isRemove && upload && deleteFile){
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      }
      // return upload.Location;
      // console.log("fileMoveInBucket upload", upload);
      if (upload.ETag) {
        // console.log("fileMoveInBucket filename",`https://${params.Bucket}.s3.amazonaws.com/${params.Key}`)
      }
      bucket = process.env.AWS_BUCKET_PROD;
      return upload;
    } catch (error) {
      // console.log('Error uploading file:', error);
      // console.log("fileMoveInBucket Caller Identity:");
      await this.logCallerIdentity();
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
      throw error;
    }
  }

  async listBucketFiles(prefix?: string, useBucket : string = 'public') {
    try {
      if(useBucket != 'public'){
        bucket = process.env.AWS_BUCKET_PRIVATE_PROD;
      }
      else{
        bucket = process.env.AWS_BUCKET_PROD
      }
      const params = {
        Bucket: bucket,
        Prefix: prefix
      };
      const command = new ListObjectsV2Command(params);
      return await this.s3.send(command);
    } catch (error) {
      console.log('Error listing objects:', error);
      return [];
    }
  }

  async getFileFromBucket(file: any, useBucket : string = 'public') {
    try {
      if(useBucket != 'public'){
        bucket = process.env.AWS_BUCKET_PRIVATE_PROD;
      }
      else{
        bucket = process.env.AWS_BUCKET_PROD;
      }

      const params = {
        Bucket: bucket,
        Key: file
      };
      const command = new GetObjectCommand(params);
      let data:any = await this.s3.send(command);
      const buffer = await this.streamToBuffer(data.Body);
      if (Buffer.isBuffer(buffer)) {
        const base64String = buffer.toString('base64');
        data.Body = base64String;
      } else {
        data.Body = '';
      }
      if (data) {
        data.CacheControl = 'no-cache, no-store, must-revalidate';
        data.Expires = new Date(0);
      }
      bucket = process.env.AWS_BUCKET_PROD;
      return data
    } catch (error) {
      // console.log('getFileFromBucket file', file);
      if (error?.Code != 'NoSuchKey') {
        // console.log("getFileFromBucket Caller Identity:");
        await this.logCallerIdentity();
        // console.log('Get File From Bucket', error);
      }
      return false
    }
  }

  async checkFileInBucket(file: any, useBucket : string = 'public') {
    try {
      if(useBucket != 'public'){
        bucket = process.env.AWS_BUCKET_PRIVATE_PROD;
      }
      else{
        bucket = process.env.AWS_BUCKET_PROD;
      }

      const params = {
        Bucket: bucket,
        Key: file
      }
      const command = new HeadObjectCommand(params);
      const data = await this.s3.send(command);
      bucket = process.env.AWS_BUCKET_PROD;
      if(data){
        return  true;
      }
      else{
        return false;
      }
    } catch (error) {
      // console.log('checkFileInBucket file', file);
      if (error?.name != 'NotFound' && error?.message != 'UnknownError') {
        // console.log("checkFileInBucket Caller Identity:");
        await this.logCallerIdentity();
        // console.log('checkFileInBucket', error);
      }
      return false;
    }
  }

  async getSignedS3Url(file: any, useBucket : string = 'public') {
    try {
      if(useBucket != 'public'){
        bucket = process.env.AWS_BUCKET_PRIVATE_PROD;
      }
      else{
        bucket = process.env.AWS_BUCKET_PROD;
      }
      const params = {
        Bucket: bucket,
        Key: file,
        Expires: 60
      }

      const command = new GetObjectCommand(params);
      const signedUrl = await getSignedUrl(this.s3, command, { expiresIn: 3600 });
      bucket = process.env.AWS_BUCKET_PROD;
      return signedUrl;
    } catch (error) {
      console.log('getSignedS3Url', error);
      return false;
    }
  }

  async copyBucketFile(from: string, to: string, useBucket : string = 'public', ACL = 'public-read') {
    try {
      if(useBucket != 'public'){
        bucket = process.env.AWS_BUCKET_PRIVATE_PROD;
      }
      else{
        bucket = process.env.AWS_BUCKET_PROD;
      }
      const params = {
        Bucket: bucket,
        CopySource: `${bucket}/${from}`,
        Key: to
      }

      const command = new CopyObjectCommand(params);
      const data = await this.s3.send(command);
      bucket = process.env.AWS_BUCKET_PROD;
      return params.Key
    } catch (error) {
      console.log('Error copyBucketFile', error);
      return false
    }
  }

  async copyS3Directory(useBucket: string = 'public', sourcePrefix: string, destPrefix: string) {
    try {
      useBucket = useBucket || 'public';
      if(useBucket != 'public'){
        useBucket = process.env.AWS_BUCKET_PRIVATE_PROD;
      }
      else{
        useBucket = process.env.AWS_BUCKET_PROD
      }
      let continuationToken;
      while (true) {
        const params = {
          Bucket: useBucket,
          Prefix: sourcePrefix
        };
        if(continuationToken){
          params['ContinuationToken'] = continuationToken;
        }
        const listCommand = new ListObjectsV2Command(params);
        const listedObjects = await this.s3.send(listCommand);
        if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
          console.log("No objects found in the source directory.");
          break;
        }
        if(!listedObjects.Contents){
          break;
        }
        const copyPromises = listedObjects?.Contents?.map(async (object) => {
          const sourceKey = object.Key;
          if (sourceKey === sourcePrefix) {
            return;
          }
          const destKey = sourceKey.replace(sourcePrefix, destPrefix);
          const copyParams = {
            Bucket: useBucket,
            CopySource: `${useBucket}/${sourceKey}`,
            Key: destKey,
          };
          const copyCommand = new CopyObjectCommand(copyParams);
          return this.s3.send(copyCommand);
        });
        await Promise.all(copyPromises);
        console.log(`Copied ${listedObjects.Contents.length} objects.`);
        if (listedObjects.IsTruncated) {
          continuationToken = listedObjects.NextContinuationToken;
        } else {
          break;
        }
      }
      console.log(":white_check_mark: Directory copy completed successfully.");
      return true;
    } catch (error) {
      console.error(":x: Error copying directory:", error);
    }
  }
  async copyS3FolderContent(sourceBucket: string, destinationBucket: string, fromLocation: string) {
    try {
      const paramsList = {
        Bucket: sourceBucket ?? bucket,
        Prefix: fromLocation,
      };
      const listObjectsCommand = new ListObjectsV2Command(paramsList);
      const listObjects = await this.s3.send(listObjectsCommand);

      if (listObjects?.Contents) {
        for (let fromObjectKey of listObjects.Contents) {
          const paramsCopy = {
            Bucket: destinationBucket ?? bucket,
            CopySource: `${sourceBucket ?? bucket}/${fromObjectKey.Key}`,
            Key: fromObjectKey.Key,
          };
          const copyCommand = new CopyObjectCommand(paramsCopy);
          await this.s3.send(copyCommand);
        }
      }
      return true;
    } catch (error) {
      console.log('Error copyS3FolderContent', error);
      return false;
    }
  }
  //     example call
  //  await this.fileUploadService.copyS3FolderContent('bucket1','bucket2','/feimg/billboard')

  async deleteBucketFile(file: string, useBucket : string = 'public') {
    try {
      if(useBucket != 'public'){
        bucket = process.env.AWS_BUCKET_PRIVATE_PROD;
      }
      else{
        bucket = process.env.AWS_BUCKET_PROD;
      }
      const params = {
        Bucket: bucket,
        Key: file
      }
      const command = new DeleteObjectCommand(params);
      await this.s3.send(command);
      bucket = process.env.AWS_BUCKET_PROD;
      return true;
    } catch (error) {
      console.log("Error deleteBucketFile", error)
      return false;
    }
  }

  async updateFileContentInBucket(fileKey: string, userBucket: string = 'public', base64Content: string) {
    try {
      const bucket =
          userBucket !== 'public'
              ? process.env.AWS_BUCKET_PRIVATE_PROD
              : process.env.AWS_BUCKET_PROD;

      const fileBuffer = Buffer.from(base64Content, 'base64');

      const params = {
        Bucket: bucket,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: 'application/json',
        CacheControl: 'no-cache, no-store, must-revalidate',
        ContentDisposition: 'inline',
        Expires: new Date(0),
      };

      const command = new PutObjectCommand(params);
      const uploadResult = await this.s3.send(command);

      return uploadResult;
    } catch (error) {
      console.error('Error updating file:', error);
      throw error;
    }
  }


  /* COMMUNICTION */
  async checkBucketFile(fileName: string){
    try {
      const params = {
        Bucket: communicationBucket,
        Key: fileName,
      };
      const command = new HeadObjectCommand(params);
      const data = await S3Com.send(command);
      return true;
    } catch (error) {
      console.log("error checkBucketFile", error);
      if (error?.code === 'NotFound') {
        return false;
      }
      if (error?.statusCode === 404) {
        return false;
      }
      if (error?.code === 'ExpiredTokenException'  || error?.code?.includes('ExpiredToken')) {
        // await this.initializeS3Client();
        console.log('Refresh S3 Token : checkBucketFile', S3Com);
        return this.checkBucketFile(fileName);
      }
      throw error;
    }
  }

  async uploadCommunicationS3(file: string, to: string) {
    try {
      const fileStream = file?.includes('base64') ? Buffer.from(file.split(',')[1], 'base64') : fs.createReadStream(file);
      const params = {
        Bucket: communicationBucket,
        Body: fileStream,
        Key: to
      };
      const command = new PutObjectCommand(params);
      await S3Com.send(command);
      return `https://${communicationBucket}.s3.amazonaws.com/${to}`;
    } catch (error) {
      console.log('Error uploading file comm:', error);
      if (error?.code === 'ExpiredTokenException'  || error?.code?.includes('ExpiredToken')) {
        // await this.initializeS3Client();
        console.log('Refresh S3 Token : uploadCommunicationS3', S3Com);
        return this.uploadCommunicationS3(file,to);
      }
      else{
        throw error;
      }
    }
  }

  async listAssetsPaginate(maxKeys: number, prefixes: string[] = [], continuationToken: string = null) {
    let params = {
      Bucket: communicationBucket,
      MaxKeys: maxKeys,
    };
    let nextContinuationToken = '';
    if (continuationToken) {
      nextContinuationToken = continuationToken;
    }
    let allObjects = [];
    try {

      for (const key of prefixes) {
        params['Prefix'] = key;
        if (nextContinuationToken !== '') {
          params['ContinuationToken'] = nextContinuationToken;
        }
        const command = new ListObjectsV2Command(params);
        const data = await S3Com.send(command);
        // console.log('[listAssetsPaginate] prefix:', key, '| returned objects:', data?.Contents?.length ?? 0);
        const search = '';
        const filteredContents = data?.Contents?.filter(item => item?.Key?.includes(search));

        allObjects = allObjects.concat(filteredContents);
        if (allObjects.length >= maxKeys) {
          nextContinuationToken = data.NextContinuationToken;
          break;
        } else {
          nextContinuationToken = data.NextContinuationToken;
        }
      }

      return {
        datas: allObjects || [],
        nextContinuationToken: nextContinuationToken,
      };
    } catch (error) {
      console.log("error listAssetsPaginate", error)
      if (error?.code === 'ExpiredTokenException'  || error?.code?.includes('ExpiredToken')) {
        // await this.initializeS3Client();
        console.log('Refresh S3 Token : listAssetsPaginate', S3Com);
        return this.listAssetsPaginate(maxKeys,prefixes,continuationToken);
      }
      else{
        throw error;
      }
    }
  }

  async removeCommunicationS3(file: string) {
    try {
      const params = {
        Bucket: communicationBucket,
        Key: file
      }

      const command = new DeleteObjectCommand(params);
      await S3Com.send(command);
      return true;
    } catch (error) {
      console.log("Error removeCommunicationS3", error)
      if (error?.code === 'ExpiredTokenException'  || error?.code?.includes('ExpiredToken')) {
        // await this.initializeS3Client();
        console.log('Refresh S3 Token : removeCommunicationS3', S3Com);
        return this.removeCommunicationS3(file);
      }
      else{
        throw error;
      }
    }
  }

  async downloadS3File(key: string){
    try{
      const params = {
        Bucket: communicationBucket,
        Key: key,
      };

      const command = new GetObjectCommand(params);
      const data = await S3Com.send(command);
      return data.Body as unknown as Buffer;
    } catch (error) {
      console.log("Error downloadS3File", error)
      if (error?.code === 'ExpiredTokenException'  || error?.code?.includes('ExpiredToken')) {
        // await this.initializeS3Client();
        console.log('Refresh S3 Token : downloadS3File', S3Com);
        return this.downloadS3File(key);
      }
      else{
        throw error;
      }
    }
  }

  async uploadImageWithWatermark(files: any, filename: string, mimetype: string,  watermarkPath: string) {
    try{
      const image = await Jimp.read(files);
      const watermark = await Jimp.read(watermarkPath);

      const watermarkWidth = Math.min(image.bitmap.width, image.bitmap.height) * 0.2;
      watermark.resize(watermarkWidth, Jimp.AUTO);

      const x = (image.bitmap.width - watermark.bitmap.width) / 2;
      const y = (image.bitmap.height - watermark.bitmap.height) / 2;

      image.composite(watermark, x, y, {
        mode: Jimp.BLEND_SOURCE_OVER,
        opacitySource: 0.7,
        opacityDest: 1.0
      });

      const imageBuffer = await image.getBufferAsync(mimetype);

      const params = {
        Bucket: communicationBucket,
        Key: filename,
        Body: imageBuffer,
        ContentType: mimetype,
        ACL: ObjectCannedACL.public_read,
      };
      const command = new PutObjectCommand(params);
      await S3Com.send(command);
      return `https://${communicationBucket}.s3.amazonaws.com/${filename}`;
    }
    catch (error) {
      console.log("Error uploadImageWithWatermark", error)
      if (error?.code === 'ExpiredTokenException'  || error?.code?.includes('ExpiredToken')) {
        // await this.initializeS3Client();
        console.log('Refresh S3 Token : uploadImageWithWatermark', this.s3);
        return this.uploadImageWithWatermark(files,filename,mimetype,watermarkPath);
      }
      else{
        throw error;
      }
    }
  }
  /* COMMUNICTION */

  async streamToBuffer(stream) {
    try{
      return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    }catch (error) {
      throw new Error(error.message);
    }
  };
}
