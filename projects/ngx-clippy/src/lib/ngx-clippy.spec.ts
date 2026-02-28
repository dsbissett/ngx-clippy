import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxClippy } from './ngx-clippy';

describe('NgxClippy', () => {
  let component: NgxClippy;
  let fixture: ComponentFixture<NgxClippy>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxClippy],
    }).compileComponents();

    fixture = TestBed.createComponent(NgxClippy);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
