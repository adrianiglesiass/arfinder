import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { ReportApiService } from '@infrastructure/api/report/report.api.service';
import { vi } from 'vitest';

import { BlockService } from '@core/block/block.service';

import { ReportService } from './report.service';

describe('ReportService', () => {
  let service: ReportService;
  let api: { report: ReturnType<typeof vi.fn> };
  let blocks: { refresh: ReturnType<typeof vi.fn>; syncAfterBlockChange: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    api = { report: vi.fn(() => Promise.resolve()) };
    blocks = {
      refresh: vi.fn(() => Promise.resolve()),
      syncAfterBlockChange: vi.fn(() => Promise.resolve()),
    };

    await TestBed.configureTestingModule({
      providers: [
        ReportService,
        { provide: ReportApiService, useValue: api },
        { provide: BlockService, useValue: blocks as unknown as BlockService },
      ],
    }).compileComponents();

    service = TestBed.inject(ReportService);
  });

  it('envía el reporte y refresca los bloqueos', async () => {
    const result = await service.report(42, { reason: 'spam', detail: null });

    expect(result).toEqual({ ok: true });
    expect(api.report).toHaveBeenCalledWith(42, { reason: 'spam', detail: null });
    expect(blocks.refresh).toHaveBeenCalled();
    expect(blocks.syncAfterBlockChange).toHaveBeenCalledWith(42, true);
  });

  it('devuelve éxito aunque falle la recarga de bloqueados, porque el reporte ya se guardó', async () => {
    blocks.refresh = vi.fn(() => Promise.reject(new Error('red')));

    const result = await service.report(42, { reason: 'spam', detail: null });

    expect(result).toEqual({ ok: true });
  });

  it('devuelve el mensaje del código de error y no refresca', async () => {
    api.report = vi.fn(() =>
      Promise.reject(
        new HttpErrorResponse({
          status: 409,
          error: { code: 'USER_REPORT_ALREADY_EXISTS', detail: 'Ya has reportado a este usuario' },
        })
      )
    );

    const result = await service.report(42, { reason: 'spam', detail: null });

    expect(result).toEqual({ ok: false, message: 'Ya habías reportado a esta persona.' });
    expect(blocks.refresh).not.toHaveBeenCalled();
  });
});
