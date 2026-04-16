import { IsEmail } from 'class-validator';

export class InviteWorkspaceDto {
  @IsEmail()
  email: string;
}
