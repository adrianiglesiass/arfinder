import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessageService } from 'primeng/api';
import { afterEach, vi } from 'vitest';

import { AuthService } from '@core/auth/auth.service';
import { ErrorService } from '@core/errors';

import { DATA_EXPORT_FILENAME, DataDownload } from './data-download';

describe('DataDownload', () => {
  let fixture: ComponentFixture<DataDownload>;
  let component: DataDownload;
  let exportMyData: ReturnType<typeof vi.fn>;
  let addMessage: ReturnType<typeof vi.fn>;
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.useFakeTimers();
    exportMyData = vi.fn();
    addMessage = vi.fn();
    createObjectURL = vi.fn().mockReturnValue('blob:arfinder-export');
    revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });

    await TestBed.configureTestingModule({
      imports: [DataDownload],
      providers: [
        { provide: AuthService, useValue: { exportMyData } },
        { provide: MessageService, useValue: { add: addMessage } },
        { provide: ErrorService, useValue: { processError: () => ({ general: '' }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DataDownload);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders the download button', () => {
    expect(fixture.nativeElement.textContent).toContain('Descargar mis datos');
  });

  it('downloads the exported data as a JSON file', async () => {
    const blob = new Blob(['{}'], { type: 'application/json' });
    exportMyData.mockResolvedValue(blob);
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    await component.download();

    expect(exportMyData).toHaveBeenCalledOnce();
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalledOnce();
    const clickedLink = clickSpy.mock.contexts[0] as HTMLAnchorElement | undefined;
    expect(clickedLink?.download).toBe(DATA_EXPORT_FILENAME);
    expect(clickedLink?.getAttribute('href')).toBe('blob:arfinder-export');
    expect(clickedLink?.isConnected).toBe(false);

    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:arfinder-export');
    expect(component.isDownloading()).toBe(false);
    expect(addMessage).not.toHaveBeenCalled();
  });

  it('shows an error toast when the export fails', async () => {
    exportMyData.mockRejectedValue(new Error('network'));

    await component.download();

    expect(createObjectURL).not.toHaveBeenCalled();
    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'No se pudieron descargar tus datos',
      })
    );
    expect(component.isDownloading()).toBe(false);
  });

  it('ignores clicks while a download is in progress', async () => {
    let resolve!: (blob: Blob) => void;
    exportMyData.mockReturnValue(new Promise<Blob>((r) => (resolve = r)));
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    const first = component.download();
    await component.download();
    resolve(new Blob(['{}']));
    await first;

    expect(exportMyData).toHaveBeenCalledOnce();
  });
});
