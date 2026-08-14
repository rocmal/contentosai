import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { ContactService } from './contact.service';
import { CreateSalesInquiryDto } from './dto/create-sales-inquiry.dto';

@ApiTags('contact')
@Controller({ path: 'contact', version: '1' })
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post('sales')
  @Public()
  @ApiOperation({ summary: 'Submit an Enterprise "Contact Sales" inquiry - reachable pre-login' })
  async submitSalesInquiry(@Body() dto: CreateSalesInquiryDto): Promise<{ submitted: boolean }> {
    await this.contactService.submitSalesInquiry(dto);
    return { submitted: true };
  }
}
