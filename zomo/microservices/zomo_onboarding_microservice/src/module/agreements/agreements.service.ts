import {
    CommonDateService,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';

@Injectable()
export class AgreementsService {
    constructor(private readonly commonDateService: CommonDateService) {}
    async generateAgreementPdf(data): Promise<Buffer> {
        const templateFile =
            data?.substep === 1
                ? 'agreementCSA.template.hbs'
                : 'agreementBAA.template.hbs';
        const templatePath = path.join(
            process.cwd(),
            'templates',
            templateFile,
        );

        if (!fs.existsSync(templatePath)) {
            throw new Error('Template file not found at ' + templatePath);
        }

        const htmlTemplate = fs.readFileSync(templatePath, 'utf8');
        const template = handlebars.compile(htmlTemplate);
        const html = template({
            date: this.commonDateService.DateTimeFormat(
                data?.user.steps_data?.agreement?.timestamp,
                'MM-DD-YYYY',
            ),
            signatureLabel:
                data?.user.steps_data?.agreement?.data.csa_signature,
            checkboxValue: true,
        });
        /*const context = {
            effective_date: data?.date || new Date().toLocaleDateString(),
            client: {
                program_name: data?.name || '',
                name: data?.name || '',
                address: data?.address || '',
                sign: {
                    by: data?.signature || '',
                    print_name: data?.name || '',
                    title: data?.client?.sign?.title || '',
                    date: data?.date || '',
                },
            },
            ba: {
                legal_name: data?.ba?.legal_name || 'ZomoHealth, LLC',
                notice_address:
                    data?.ba?.notice_address ||
                    '1700 Post Oak Boulevard, Suite 600\nHouston, TX 77056',
                sign: {
                    by: data?.ba?.sign?.by || '',
                    print_name: data?.ba?.sign?.print_name || '',
                    title: data?.ba?.sign?.title || '',
                    date: data?.ba?.sign?.date || '',
                },
            },
            signatureLabel: data?.signature || '',
            checkboxValue: data?.checkboxValue || '',
        };
        const html = template(context);*/

        const document = { content: html };

        const buffer: Buffer = await new Promise((resolve, reject) => {
            const pdf = require('html-pdf-node');
            pdf.generatePdf(
                document,
                { format: 'A4' },
                (err: any, buffer: Buffer) => {
                    if (err) return reject(err);
                    if (!buffer || buffer.length === 0)
                        return reject(new Error('PDF buffer is empty'));
                    const actualBuffer = Buffer.from(buffer);
                    resolve(actualBuffer);
                },
            );
        });
        return buffer;
    }
}
