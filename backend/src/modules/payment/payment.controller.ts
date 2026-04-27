import { Body, Controller, Delete, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('prepare')
  @UseGuards(JwtAuthGuard)
  prepare(@CurrentUser() user: { userId: string }) {
    return this.paymentService.prepare(user.userId);
  }

  @Post('confirm')
  @UseGuards(JwtAuthGuard)
  confirm(
    @CurrentUser() user: { userId: string },
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.paymentService.confirm(user.userId, dto);
  }

  @Post('webhook')
  webhook(@Body() body: Record<string, unknown>) {
    return this.paymentService.handleWebhook(body);
  }
}

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  status(@CurrentUser() user: { userId: string }) {
    return this.paymentService.getStatus(user.userId);
  }

  @Delete('cancel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async cancel(@CurrentUser() user: { userId: string }) {
    await this.paymentService.cancelByUser(user.userId);
  }
}
