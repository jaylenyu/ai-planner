import { IsNumber, IsString, Min } from 'class-validator';

export class ConfirmPaymentDto {
  @IsString()
  paymentKey: string;

  @IsString()
  orderId: string;

  @IsNumber()
  @Min(1)
  amount: number;
}
