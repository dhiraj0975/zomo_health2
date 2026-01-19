import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { processStepUpdate } from '../../common/commonFunctions';
import { OnboardingService } from '../registration/onboarding.service';
import { AgreementsService } from './agreements.service';

interface AgreementData {
    user: any;
    step: string;
    [key: string]: any;
}

interface AgreementPdfData {
    [key: string]: any;
}

@Controller('agreements')
export class AgreementsController {
    constructor(
        private readonly onboardingService: OnboardingService,
        private readonly agreementsService: AgreementsService,
    ) {}

    @MessagePattern({ cmd: 'agreement' })
    async agreement(@Payload() data: AgreementData) {
        try {
            const { user, step, ...stepData } = data;
            let { stepResult } = await processStepUpdate(
                this.onboardingService,
                user.id,
                step,
                stepData,
                {},
            );
            const agreementDetails = stepResult?.data ?? {};
            const requiredAgreementFields = ['csa_signature', 'baa_signature'];

            const isAgreementValid = requiredAgreementFields.every(
                field => typeof agreementDetails[field] === 'string' && agreementDetails[field].trim() !== ''
            );
            if (isAgreementValid) {
                ({ stepResult } = await processStepUpdate(
                    this.onboardingService,
                    user.id,
                    step,
                    { completed: 1 },
                ));
            }
            return {
                success: true,
                message: 'Agreement data saved successfully',
                data: { steps_data: stepResult },
            };
        } catch (error) {
            console.error('Agreement error', error);
            return {
                success: false,
                message: error.message || 'Failed to save Agreement',
            };
        }
    }
    @MessagePattern({ cmd: 'getAgreementPdf' })
    async getAgreementPdf(@Payload() data: AgreementPdfData) {
        try {
            const pdfBuffer =
                await this.agreementsService.generateAgreementPdf(data);
            const base64String = pdfBuffer.toString('base64');
            return {
                success: true,
                message: 'Data Send successfully',
                data: { pdfBuffer: base64String },
            };
        } catch (error) {
            console.error('getAgreementPdf error:', error);
            return {
                success: false,
                message: error.message || 'PDF generation failed',
            };
        }
    }
}
