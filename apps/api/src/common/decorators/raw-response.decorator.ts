import { SetMetadata } from '@nestjs/common';

export const RAW_RESPONSE_KEY = 'rawResponse';

/** Marks a route as returning its value as-is (e.g. binary audio/image), bypassing TransformInterceptor's success envelope. */
export const RawResponse = () => SetMetadata(RAW_RESPONSE_KEY, true);
