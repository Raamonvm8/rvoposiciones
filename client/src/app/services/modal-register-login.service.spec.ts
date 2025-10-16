import { TestBed } from '@angular/core/testing';

import { ModalRegisterLoginService } from './modal-register-login.service';

describe('ModalRegisterLoginService', () => {
  let service: ModalRegisterLoginService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ModalRegisterLoginService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
