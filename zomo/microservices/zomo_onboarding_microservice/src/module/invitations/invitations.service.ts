import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';

@Injectable()
export class InvitationsService {
    async renderTemplate(templateName: string, context: any): Promise<string> {
        const templatePath = path.join(
            process.cwd(),
            'templates',
            templateName,
        );

        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template not found: ${templatePath}`);
        }

        const templateContent = fs.readFileSync(templatePath, 'utf8');
        const compiledTemplate = handlebars.compile(templateContent);
        return compiledTemplate(context);
    }
}
