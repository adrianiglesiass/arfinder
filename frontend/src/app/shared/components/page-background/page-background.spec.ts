import { TestBed } from '@angular/core/testing';

import { PageBackground } from './page-background';

describe('PageBackground', () => {
  async function render(align: 'center' | 'start' = 'center'): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [PageBackground],
    }).compileComponents();

    const fixture = TestBed.createComponent(PageBackground);
    fixture.componentRef.setInput('align', align);
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  }

  it('uses the shared decorative background class', async () => {
    const element = await render();
    const container = element.querySelector<HTMLElement>('div');

    expect(container?.className).toContain('page-background');
  });

  it('keeps content safely clipped and centered', async () => {
    const element = await render();
    const container = element.querySelector<HTMLElement>('div');

    expect(container?.className).toContain('overflow-hidden');
    expect(container?.className).toContain('justify-center');
  });

  it('can align content from the top', async () => {
    const element = await render('start');
    const container = element.querySelector<HTMLElement>('div');

    expect(container?.className).toContain('items-center');
    expect(container?.className).not.toContain('justify-center');
  });
});
