import { NgFor, NgIf } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { CartService } from '../../../services/cart.service';


@Component({
  selector: 'app-compra-material',
  standalone: true,
  imports: [NgFor],
  templateUrl: './compra-material.component.html',
  styleUrl: './compra-material.component.css'
})
export class CompraMaterialComponent {

  carrito: any[] = [];
  materiales: any[] = [];
  talleres: any[] = [];

  materialActual: any = null;
  userData: any = null;
  user: User | null = null;
  showSticky: boolean = false;

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const carritoLarge = document.querySelector('.cart-large') as HTMLElement;
    if (!carritoLarge) return;

    const rect = carritoLarge.getBoundingClientRect();
    this.showSticky = rect.bottom < 0; // sticky aparece cuando carrito grande sale de la vista
  }

  constructor(private route: ActivatedRoute, private http: HttpClient, private router: Router, private cartService: CartService) {}

  ngOnInit(): void {

    this.cartService.carrito$.subscribe(carrito => {
      this.carrito = carrito;
    });

    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      this.user = user;

      if (user) {
        this.http.get(`http://localhost:3000/api/users/${user.uid}`)
          .subscribe((res: any) => {
            this.userData = res;
            this.loadMateriales();
            this.loadTalleres();
          });
      } else {
        this.loadMateriales();
        this.loadTalleres(); 
      }
    });
  }

  loadMateriales() {
    const pendingUuid = this.route.snapshot.paramMap.get('uuid');

    this.http.get('http://localhost:3000/api/materiales').subscribe((res: any) => {
      this.materiales = res
        .filter((m: any) =>
          m.visible &&
          !this.userData?.materiales?.includes(m.uuid)
        )
        .map((m: any) => ({
          ...m,
          type: 'material'
        }));

      if (pendingUuid) {
        const material = this.materiales.find(m => m.uuid === pendingUuid);
        if (material) this.addToCart(material);
      }
    });
  }

  loadTalleres() {
    this.http.get('http://localhost:3000/api/talleres').subscribe((res: any) => {
      this.talleres = res
        .filter((t: any) =>
          t.visible &&
          !this.userData?.talleres?.includes(t.uuid)
        )
        .map((t: any) => ({
          ...t,
          type: 'taller'
        }));
    });
  }

  addToCart(material: any) {
    this.cartService.addToCart(material);
    this.carrito = this.cartService.getCart();
  }

  removeFromCart(uuid: string) {
    this.cartService.removeFromCart(uuid);
    this.carrito = this.cartService.getCart();
  }

  isInCart(uuid: string): boolean {
    return this.cartService.isInCart(uuid);
  }

  get totalCarrito(): number {
    return this.cartService.getTotal();
  }

  goToCheckout() {
    alert('✅ Compra simulada correctamente. (Integrar Stripe después)');
    this.cartService.clearCart();
    this.router.navigate(['/materiales']);
  }


  get totalCarritoFormatted(): string {
    return this.totalCarrito.toFixed(2);
  }

}
