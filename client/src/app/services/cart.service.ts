import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CartService {

  private carritoSubject = new BehaviorSubject<any[]>(this.loadCart());
  carrito$ = this.carritoSubject.asObservable();

  private loadCart(): any[] {
    const saved = localStorage.getItem('carrito');
    return saved ? JSON.parse(saved) : [];
  }

  private saveCart(carrito: any[]) {
    localStorage.setItem('carrito', JSON.stringify(carrito));
    this.carritoSubject.next(carrito);
  }

  getCart(): any[] {
    return this.carritoSubject.value;
  }

  addToCart(material: any) {
    const carrito = this.getCart();

    if (!carrito.some(item => item.uuid === material.uuid)) {
      carrito.push(material);
      this.saveCart(carrito);
    }
  }

  removeFromCart(uuid: string) {
    const carrito = this.getCart().filter(item => item.uuid !== uuid);
    this.saveCart(carrito);
  }

  clearCart() {
    this.saveCart([]);
  }

  isInCart(uuid: string): boolean {
    return this.getCart().some(item => item.uuid === uuid);
  }

  getTotal(): number {
    return this.getCart().reduce((sum, item) => sum + Number(item.price || 0), 0);
  }
}
