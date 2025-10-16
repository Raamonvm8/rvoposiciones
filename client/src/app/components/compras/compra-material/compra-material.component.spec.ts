import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompraMaterialComponent } from './compra-material.component';

describe('CompraMaterialComponent', () => {
  let component: CompraMaterialComponent;
  let fixture: ComponentFixture<CompraMaterialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompraMaterialComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompraMaterialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
