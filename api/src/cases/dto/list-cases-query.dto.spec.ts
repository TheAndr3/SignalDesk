import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CasePriority, CaseStatus } from '@signaldesk/shared';
import { ListCasesQueryDto } from './list-cases-query.dto';

describe('ListCasesQueryDto Validation', () => {
  it('should transform and validate valid query params', async () => {
    const dto = plainToInstance(ListCasesQueryDto, {
      status: CaseStatus.OPEN,
      priority: CasePriority.HIGH,
      mine: 'true',
      limit: '15',
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.mine).toBe(true);
    expect(dto.limit).toBe(15);
  });

  it('should fail when status is not a valid enum', async () => {
    const dto = plainToInstance(ListCasesQueryDto, {
      status: 'pending', // invalid status
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const statusErr = errors.find((e) => e.property === 'status');
    expect(statusErr).toBeDefined();
  });

  it('should fail when limit exceeds max constraint', async () => {
    const dto = plainToInstance(ListCasesQueryDto, {
      limit: '100', // max 50
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const limitErr = errors.find((e) => e.property === 'limit');
    expect(limitErr).toBeDefined();
  });
});
