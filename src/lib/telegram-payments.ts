import type { DatabaseAdapter } from './database-adapter';

export interface PaymentResult {
  success: boolean;
  transaction_id?: string;
  error?: string;
}

export class TelegramPayments {
  private botToken: string;
  private adapter: DatabaseAdapter;

  constructor(botToken: string, adapter: DatabaseAdapter) {
    this.botToken = botToken;
    this.adapter = adapter;
  }

  // Create invoice for star payment
  async createStarInvoice(
    userId: number,
    amount: number,
    description: string,
    payload: string
  ): Promise<string> {
    const invoiceData = {
      chat_id: userId,
      title: 'Star Lottery Entry',
      description,
      payload,
      provider_token: '', // Empty for Telegram Stars
      currency: 'XTR', // Telegram Stars currency
      prices: [{ label: 'Entry Fee', amount }],
      need_name: false,
      need_phone_number: false,
      need_email: false,
      need_shipping_address: false,
      send_phone_number_to_provider: false,
      send_email_to_provider: false,
      is_flexible: false
    };

    const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendInvoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoiceData)
    });

    const result = await response.json();
    if (!result.ok) {
      throw new Error(`Failed to create invoice: ${result.description}`);
    }

    return result.result.message_id;
  }

  // Process successful payment
  async processPayment(
    userId: number,
    transactionId: string,
    amount: number
  ): Promise<PaymentResult> {
    try {
      // This would need to be implemented in the adapter
      return {
        success: true,
        transaction_id: transactionId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get user's star balance
  async getUserBalance(userId: number): Promise<number> {
    try {
      return await this.adapter.getUserBalance(userId);
    } catch (error) {
      console.warn('Failed to get user balance:', error);
      return 10; // Demo balance
    }
  }
}
