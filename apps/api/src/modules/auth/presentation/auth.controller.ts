import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '@common/decorators/public.decorator';
import { AuthService } from '../application/services/auth.service';
import { UsersService } from '@modules/users/application/services/users.service';
import { RegisterDto } from '../application/dto/register.dto';
import { LoginDto } from '../application/dto/login.dto';
import { RefreshTokenDto } from '../application/dto/refresh-token.dto';
import { ForgotPasswordDto } from '../application/dto/forgot-password.dto';
import { ResetPasswordDto } from '../application/dto/reset-password.dto';
import { VerifyEmailDto } from '../application/dto/verify-email.dto';
import { AuthTokensResponseDto } from '../application/dto/auth-tokens-response.dto';
import { UserResponseDto } from '@modules/users/application/dto/user-response.dto';

interface OAuthenticatedRequest extends Request {
  user: { accessToken: string; refreshToken: string; user: { id: string } };
}

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new account' })
  async register(@Body() dto: RegisterDto): Promise<AuthTokensResponseDto> {
    const result = await this.authService.register(dto);
    return this.toAuthResponse(result);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email and password' })
  async login(@Body() dto: LoginDto): Promise<AuthTokensResponseDto> {
    const result = await this.authService.login(dto);
    return this.toAuthResponse(result);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokensResponseDto> {
    const result = await this.authService.refreshTokens(dto.refreshToken);
    return this.toAuthResponse(result);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a refresh token' })
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify an email address using the emailed token' })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<{ verified: boolean }> {
    await this.authService.verifyEmail(dto.token);
    return { verified: true };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ sent: boolean }> {
    await this.authService.forgotPassword(dto.email);
    return { sent: true };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset a password using the emailed token' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ reset: boolean }> {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { reset: true };
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Start Google OAuth login' })
  googleLogin(): void {
    // Passport redirects to Google; handled entirely by the guard.
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  googleCallback(@Req() req: OAuthenticatedRequest) {
    return req.user;
  }

  @Public()
  @Get('github')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'Start GitHub OAuth login' })
  githubLogin(): void {}

  @Public()
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'GitHub OAuth callback' })
  githubCallback(@Req() req: OAuthenticatedRequest) {
    return req.user;
  }

  @Public()
  @Get('microsoft')
  @UseGuards(AuthGuard('microsoft'))
  @ApiOperation({ summary: 'Start Microsoft OAuth login' })
  microsoftLogin(): void {}

  @Public()
  @Get('microsoft/callback')
  @UseGuards(AuthGuard('microsoft'))
  @ApiOperation({ summary: 'Microsoft OAuth callback' })
  microsoftCallback(@Req() req: OAuthenticatedRequest) {
    return req.user;
  }

  private async toAuthResponse(result: {
    accessToken: string;
    refreshToken: string;
    user: { id: string };
  }): Promise<AuthTokensResponseDto> {
    const user = await this.usersService.findById(result.user.id);
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: new UserResponseDto(user),
    };
  }
}
