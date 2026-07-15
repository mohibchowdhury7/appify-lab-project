import {
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';

@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: any) {
    if (typeof value === 'string') {
      return sanitizeHtml(value, {
        allowedTags: [],
        allowedAttributes: {},
      });
    }

    if (typeof value === 'object' && value !== null) {
      for (const key of Object.keys(value)) {
        if (key === 'text' && typeof value[key] === 'string') {
          value[key] = sanitizeHtml(value[key], {
            allowedTags: [],
            allowedAttributes: {},
          });
        }
      }
    }

    return value;
  }
}
