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
      const { error: balanceError } = await supabase
        .from('user_balances')
        .upsert({
          telegram_user_id: userId.toString(),
          stars_balance: amount,
          total_spent: amount,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'telegram_user_id'
        });

      if (balanceError) {
        throw new Error(`Database error: ${balanceError.message}`);
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
    if (!supabase) {
      // Return mock balance for demo mode
      return 10;
    }
    
    try {
      const { data, error } = await supabase
        .from('user_balances')
        .select('stars_balance')
        .eq('telegram_user_id', userId.toString())
        .single();

      if (error) {
        // Check if it's a table not found error
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('Database table does not exist, using demo mode');
          return 10; // Demo balance
        }
        return 0; // New user, no balance
      }

      if (!data) {
        return 0; // New user, no balance
      }

      return data.stars_balance;
    } catch (error) {
      console.warn('Database table does not exist, using demo mode');
      return 10; // Demo balance
    }
  }
}
