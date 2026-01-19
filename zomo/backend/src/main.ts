import { appConstant, CommonService } from '@common-constants';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ClientProxy } from '@nestjs/microservices';
import * as bodyParser from 'body-parser';
import 'dotenv/config';
import * as express from 'express';
import { Request } from 'express';
import { lastValueFrom } from 'rxjs';
import { AppModule } from './app.module';
import { botFirewall } from './middleware/botfirewall.middleware';

const port = process.env.PORT_PROD;
const filePath = appConstant.PERMISSIONS_DIR;

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.enableCors({ methods: ['GET', 'PUT', 'POST', 'DELETE'] });
    app.enableVersioning({
        type: VersioningType.URI, // or HEADER, as per your preference
        // Do NOT set defaultVersion
    });
    app.use(function (req: Request, res: any, next: any) {
        res.header('Access-Control-Allow-Credentials', true);
        res.header('Access-Control-Allow-Origin', process.env.ORIGIN_PROD);
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        res.header(
            'Access-Control-Allow-Headers',
            'Authorization, X-Mashape-Authorization, Origin, X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept',
        );
        next();
    });
    global['appConstant'] = appConstant;

    const commonMicroservice = app.get<ClientProxy>('COMMON_SERVICE');
    const commonService = app.get(CommonService);
    await commonMicroservice.connect();
    try {
        const fileData = await lastValueFrom(commonMicroservice.send({ cmd: 'get_file' },{ path: 'local/data.json', userBucket: 'private' }));
        const jsonString = Buffer.from(fileData?.Body, 'base64').toString('utf-8');
        const parsedJson = JSON.parse(jsonString);
        await commonService.encryptAndSave(parsedJson,filePath);
    } catch (error) {
        console.error('Error communicating with COMMON_SERVICE:', error.message || error);
    }
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    // const expressApp = app.getHttpAdapter().getInstance();
    // expressApp.set('trust proxy', true);
    // expressApp.use(express.static('./public'));
    // expressApp.use(express.static('./tmp'));
    app.use(express.static('./public'));
    app.use(express.static('./tmp'));
    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );
    app.use(botFirewall);
    await app.listen(port, process.env.APP_HOST_NAME);
    Logger.log(`Server running on http://localhost:${port}`, 'Bootstrap');
    /* for memory usage and force garbage collection */
    setInterval(() => {
    const used = process.memoryUsage();
    const heapMB = (used.heapUsed / 1024 / 1024).toFixed(2);
    console.log(`Heap Used: ${heapMB} MB`);
    if (parseFloat(heapMB) > 1500) {
        console.log('Heap high, running GC...');
        if(global.gc){
            global.gc();
        }
    }
    }, 30000);
}

bootstrap().then();
