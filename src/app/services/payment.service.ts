// src/app/services/stripe.service.ts
import { Injectable } from '@angular/core';
import { loadStripe, Stripe } from '@stripe/stripe-js';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  stripePromise = loadStripe('pk_test_51PLcCeP5HnOGXGWl6Z3AkGpzqDwKErZ97iF8UR7AaD1vMY4vB2xmJsh9dKnvKfotT6zJNRMIEveW4D3nTi795phJ00hUZZpUZT'); // Reemplaza con tu clave pública

  async redirectToCheckout(sessionId: string) {
    const stripe = await this.stripePromise;
    if (stripe) {
      await stripe.redirectToCheckout({ sessionId });
    } else {
      throw new Error('Stripe no se cargó correctamente');
    }
  }
}
