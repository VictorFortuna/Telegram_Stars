import { supabase } from './supabase';

export interface PaymentResult {
  success: boolean;
  transaction_id?: string;
  error?: string;
}

export class TelegramPayments {
  private botToken: string;

  constructor(botToken: string) {
    this.botToken = botToken;
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
      // Update user balance
      const { error } = await supabase
        .from('user_balances')
        .upsert({
          telegram_user_id: userId.toString(),
          stars_balance: amount,
          total_spent: 0,
          total_won: 0,
          games_played: 0,
          games_won: 0,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw new Error(`Failed to update balance: ${error.message}`);
      }

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
    const { data, error } = await supabase
      .from('user_balances')
      .select('stars_balance')
      .eq('telegram_user_id', userId.toString())
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }

    return data?.stars_balance || 0;
  }
}
