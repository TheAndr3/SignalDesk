import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ResolveCaseDto } from './resolve-case.dto';

describe('ResolveCaseDto Validation', () => {
  it('should pass validation with valid resolutionNote', async () => {
    const dto = plainToInstance(ResolveCaseDto, {
      resolutionNote: 'Root cause identified: expired TLS certificate on load balancer.',
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation when resolutionNote is missing or empty', async () => {
    const dto = plainToInstance(ResolveCaseDto, {
      resolutionNote: '',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const noteErr = errors.find((e) => e.property === 'resolutionNote');
    expect(noteErr).toBeDefined();
  });
});
