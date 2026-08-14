import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { CurrencyService } from './currency.service';

@ApiTags('currency')
@Controller({ path: 'pricing/fx-rate', version: '1' })
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'USD exchange rate for display-only price localization (checkout always charges INR)',
  })
  async getRate(@Query('currency') currency?: string) {
    return this.currencyService.getRate(currency ?? 'USD');
  }
}
