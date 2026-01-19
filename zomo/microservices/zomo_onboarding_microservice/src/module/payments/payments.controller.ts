import { Controller, Inject } from '@nestjs/common';
import { ClientProxy, MessagePattern, Payload } from '@nestjs/microservices';
import { processStepUpdate } from '../../common/commonFunctions';
import { OnboardingService } from '../registration/onboarding.service';

interface PaymentData {
    user: any;
    step: string;
    [key: string]: any;
}

@Controller('payments')
export class PaymentsController {
    constructor(
        private readonly onboardingService: OnboardingService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
    ) {}

    @MessagePattern({ cmd: 'payment' })
    async payment(@Payload() data: PaymentData) {
        try {
            const { user, step, ...stepData } = data;
            const { stepResult } = await processStepUpdate(
                this.onboardingService,
                user.id,
                step,
                stepData,
                {},
            );
            return {
                success: true,
                message: 'Payment data saved successfully',
                data: { steps_data: stepResult },
            };
        } catch (error) {
            console.error('Payment error', error);
            return {
                success: false,
                message: error.message || 'Failed to save Payment',
            };
        }
    }
}
