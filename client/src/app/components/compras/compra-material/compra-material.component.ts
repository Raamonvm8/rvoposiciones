import { NgFor, NgIf } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { CartService } from '../../../services/cart.service';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe('pk_test_51Shwm0FCj2WzHHfTLP0F89gyNtCAPslee4eS6V1ltHYWjRr3WMsR70xzOXIlswhHOTyFhJyu0mCba7kTzpOiunlX00oflX1RJz');
@Component({
  selector: 'app-compra-material',
  standalone: true,
  imports: [NgFor, NgIf],
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

  showPaymentOverlay = false;

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

  async goToCheckout() {
    this.showPaymentOverlay = true;
    if (!this.user) {
      alert('Debes iniciar sesión para comprar');
      return;
    }

    const items = this.cartService.getCart();

    if (!items.length) {
      alert('El carrito está vacío');
      return;
    }

    try {
      // 1️⃣ Llamada a backend para crear PaymentIntent
      const res: any = await this.http
        .post('http://localhost:3000/api/create-payment-intent', { items, uid: this.user.uid })
        .toPromise();

      const clientSecret = res.clientSecret;

      // 2️⃣ Inicializar Stripe
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe no se cargó correctamente');

      // 3️⃣ Crear Payment Element
      const elements = stripe.elements({ clientSecret });
      const paymentElement = elements.create('payment');
      paymentElement.mount('#payment-element'); // #payment-element debe existir en tu template

      // 4️⃣ Confirmar pago al hacer submit
      const form = document.getElementById('payment-form') as HTMLFormElement;
      form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: window.location.href, 
          },
          redirect: 'if_required',
        });

        if (error) {
          alert(`Error en el pago: ${error.message}`);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
          alert('Pago completado con éxito');
          this.cartService.clearCart();
          // Actualiza UI, recarga materiales/talleres comprados
          this.loadMateriales();
          this.loadTalleres();
          this.showPaymentOverlay = false;
        }
      });
    } catch (err: any) {
      console.error('Error en checkout:', err);
      alert('Error iniciando el pago');
    }
  }

  closePayment(){
    this.showPaymentOverlay = false;
  }

  get totalCarritoFormatted(): string {
    return this.totalCarrito.toFixed(2);
  }

}
