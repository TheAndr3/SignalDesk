import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CasePriority } from '@signaldesk/shared';
import { CreateCaseDto } from './create-case.dto';

describe('CreateCaseDto Validation', () => {
  it('should pass validation with valid required fields', async () => {
    const dto = plainToInstance(CreateCaseDto, {
      title: 'Database connection latency spike',
      description: 'Customer reports 500ms latency',
      priority: CasePriority.URGENT,
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation when title is missing or empty', async () => {
    const dto = plainToInstance(CreateCaseDto, {
      title: '',
      priority: CasePriority.MEDIUM,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const titleError = errors.find((e) => e.property === 'title');
    expect(titleError).toBeDefined();
  });

  it('should fail validation when priority is invalid enum value', async () => {
    const dto = plainToInstance(CreateCaseDto, {
      title: 'Valid title',
      priority: 'super-urgent', // Invalid priority enum
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const priorityError = errors.find((e) => e.property === 'priority');
    expect(priorityError).toBeDefined();
  });

  it('should pass validation when optional description is omitted', async () => {
    const dto = plainToInstance(CreateCaseDto, {
      title: 'Title without description',
      priority: CasePriority.LOW,
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
