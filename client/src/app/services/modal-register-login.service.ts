import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class ModalRegisterLoginService {
  private _showRegisterModal = new BehaviorSubject<boolean>(false);
  private _showLoginModal = new BehaviorSubject<boolean>(false);

  private _pendingBuy = new BehaviorSubject<string | null>(null);

  showRegisterModal$ = this._showRegisterModal.asObservable();
  showLoginModal$ = this._showLoginModal.asObservable();
  pendingBuy$ = this._pendingBuy.asObservable();

  openRegister() {
    this._showRegisterModal.next(true);
  }

  closeRegister() {
    this._showRegisterModal.next(false);
  }

  openLogin() {
    this._showLoginModal.next(true);
  }

  closeLogin() {
    this._showLoginModal.next(false);
  }

  // Nuevo flujo
  setPendingBuy(topic: string) {
    this._pendingBuy.next(topic);
  }

  clearPendingBuy() {
    this._pendingBuy.next(null);
  }

  

}
