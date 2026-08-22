import { Request, Response, Router } from 'express';
import { FinanceService } from '../finance/finance.service';
import crypto from 'crypto';

export const webhookRouter = Router();

/**
 * Handle Razorpay Webhooks
 */
webhookRouter.post('/razorpay', async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_secret'; // Should be in .env

  if (!signature) {
    return res.status(400).json({ error: 'Missing signature' });
  }

  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(req.body) // req.body is a Buffer due to express.raw
    .digest('hex');

  if (signature !== expectedSignature) {
    console.error('❌ Invalid Razorpay Webhook Signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Parse the raw body
  const body = JSON.parse(req.body.toString());
  const { event, payload } = body;

  if (event === 'payment.captured') {
    const payment = payload.payment.entity;
    const enrollmentId = payment.notes.enrollmentId;
    const amount = payment.amount / 100;

    await FinanceService.confirmOnlinePayment(
        enrollmentId, 
        amount, 
        payment.id, 
        'razorpay'
    );
  }

  res.json({ received: true });
});

/**
 * Handle Stripe Webhooks
 */
webhookRouter.post('/stripe', async (req: Request, res: Response) => {
  const event = req.body;

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const enrollmentId = session.client_reference_id;
    const amount = session.amount_total / 100;

    await FinanceService.confirmOnlinePayment(
        enrollmentId, 
        amount, 
        session.id, 
        'stripe'
    );
  }

  res.json({ received: true });
});
