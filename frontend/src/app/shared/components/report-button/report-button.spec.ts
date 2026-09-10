import { TestBed } from '@angular/core/testing';

import { ReportApiService } from '@infrastructure/api/report/report.api.service';
import { MessageService } from 'primeng/api';
import { vi } from 'vitest';

import { BlockService } from '@core/block/block.service';

import { ReportButton } from './report-button';

describe('ReportButton', () => {
  let api: { report: ReturnType<typeof vi.fn> };
  let blocks: { refresh: ReturnType<typeof vi.fn> };
  let messages: { add: ReturnType<typeof vi.fn> };

  const createComponent = async () => {
    const fixture = TestBed.createComponent(ReportButton);
    fixture.componentRef.setInput('profileId', 42);
    await fixture.whenStable();
    return fixture;
  };

  beforeEach(async () => {
    api = { report: vi.fn(() => Promise.resolve()) };
    blocks = { refresh: vi.fn(() => Promise.resolve()) };
    messages = { add: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ReportButton],
      providers: [
        { provide: ReportApiService, useValue: api },
        { provide: BlockService, useValue: blocks as unknown as BlockService },
        { provide: MessageService, useValue: messages as unknown as MessageService },
      ],
    }).compileComponents();
  });

  it('envía el reporte con el motivo elegido y refresca los bloqueos', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance as unknown as {
      submit: (payload: { reason: string; detail: string | null }) => Promise<void>;
      showDialog: () => boolean;
    };

    await component.submit({ reason: 'harassment', detail: 'Mensajes insistentes' });

    expect(api.report).toHaveBeenCalledWith(42, {
      reason: 'harassment',
      detail: 'Mensajes insistentes',
    });
    expect(blocks.refresh).toHaveBeenCalled();
    expect(component.showDialog()).toBe(false);
  });

  it('mantiene el diálogo abierto y avisa si la API falla', async () => {
    api.report = vi.fn(() => Promise.reject(new Error('boom')));

    const fixture = await createComponent();
    const component = fixture.componentInstance as unknown as {
      open: (event: Event) => void;
      submit: (payload: { reason: string; detail: string | null }) => Promise<void>;
      showDialog: () => boolean;
    };

    component.open(new Event('click'));
    await component.submit({ reason: 'spam', detail: null });

    expect(component.showDialog()).toBe(true);
    expect(blocks.refresh).not.toHaveBeenCalled();
    expect(messages.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
  });

  it('cerrar el diálogo no llama a la API', async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance as unknown as {
      open: (event: Event) => void;
      close: () => void;
      showDialog: () => boolean;
    };

    component.open(new Event('click'));
    component.close();

    expect(component.showDialog()).toBe(false);
    expect(api.report).not.toHaveBeenCalled();
  });
});
