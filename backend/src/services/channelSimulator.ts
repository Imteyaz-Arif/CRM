import pool from '../db/index';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const ChannelSimulator = {
  /**
   * Dispatches a campaign to the mock network.
   * Runs asynchronously in the background.
   */
  async dispatchCampaign(campaignId: string, customerRecords: any[], channel: string) {
    console.log(`[Simulator] Dispatching campaign ${campaignId} to ${customerRecords.length} customers via ${channel}...`);
    
    // First, insert all as PENDING
    const client = await pool.connect();
    try {
      const inserts = customerRecords.map(c => `('${campaignId}', '${c.id}', '${channel}', 'PENDING')`);
      const batchSize = 100;
      for (let i = 0; i < inserts.length; i += batchSize) {
        const batch = inserts.slice(i, i + batchSize);
        await client.query(`
          INSERT INTO communication_logs (campaign_id, customer_id, channel, status)
          VALUES ${batch.join(', ')}
        `);
      }
      
      // Update campaign status
      await client.query(`UPDATE campaigns SET status = 'SENDING' WHERE id = $1`, [campaignId]);
    } catch (e) {
      console.error('[Simulator] Error inserting pending logs:', e);
    } finally {
      client.release();
    }

    // Now, simulate the lifecycle asynchronously (without blocking the API)
    this.simulateLifecycle(campaignId, customerRecords);
  },

  async simulateLifecycle(campaignId: string, customerRecords: any[]) {
    // We will do this in batches of 50 to simulate gradual network send
    const batchSize = 50;
    
    for (let i = 0; i < customerRecords.length; i += batchSize) {
      const batch = customerRecords.slice(i, i + batchSize);
      
      // 1. SENT (takes minimal time)
      await delay(200);
      await this.updateStatuses(campaignId, batch, 'SENT');

      // 2. DELIVERED (takes 0.2-0.4 seconds)
      await delay(Math.random() * 200 + 200);
      // Spammers have 50% failure, others 98% success
      const delivered = batch.filter(c => c.persona === 'Spammer' ? Math.random() > 0.5 : Math.random() > 0.02);
      const failed = batch.filter(c => !delivered.includes(c));
      
      if (failed.length) await this.updateStatuses(campaignId, failed, 'FAILED');
      if (delivered.length) await this.updateStatuses(campaignId, delivered, 'DELIVERED');

      // 3. OPENED (takes 0.4-0.8 seconds)
      await delay(Math.random() * 400 + 400);
      const opened = delivered.filter(c => {
        if (c.persona === 'VIP') return Math.random() > 0.2; // 80% open
        if (c.persona === 'Browser') return Math.random() > 0.1; // 90% open
        if (c.persona === 'ChurnRisk') return Math.random() > 0.7; // 30% open
        return Math.random() > 0.9; // Spammers 10% open if delivered
      });
      if (opened.length) await this.updateStatuses(campaignId, opened, 'OPENED');

      // 4. CLICKED (takes 0.4-0.8 seconds)
      await delay(Math.random() * 400 + 400);
      const clicked = opened.filter(c => {
        if (c.persona === 'VIP') return Math.random() > 0.5; // 50% click
        if (c.persona === 'Browser') return Math.random() > 0.6; // 40% click
        if (c.persona === 'ChurnRisk') return Math.random() > 0.8; // 20% click
        return Math.random() > 0.95; // 5% click
      });
      if (clicked.length) await this.updateStatuses(campaignId, clicked, 'CLICKED');

      // 5. CONVERTED (Attribution! takes 0.6-1.0 seconds)
      await delay(Math.random() * 400 + 600);
      const converted = clicked.filter(c => {
        if (c.persona === 'VIP') return Math.random() > 0.6; // 40% buy
        if (c.persona === 'Browser') return Math.random() > 0.98; // 2% buy
        if (c.persona === 'ChurnRisk') return Math.random() > 0.9; // 10% buy
        return false;
      });

      if (converted.length) {
        await this.updateStatuses(campaignId, converted, 'CONVERTED');
        // Actually generate mock attributed orders for these users!
        await this.generateAttributedOrders(campaignId, converted);
      }
    }

    // Mark campaign completed
    await pool.query(`UPDATE campaigns SET status = 'COMPLETED' WHERE id = $1`, [campaignId]);
    console.log(`[Simulator] Campaign ${campaignId} simulation finished!`);
  },

  async updateStatuses(campaignId: string, customers: any[], status: string) {
    if (customers.length === 0) return;
    const ids = customers.map(c => `'${c.id}'`).join(',');
    await pool.query(`
      UPDATE communication_logs 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE campaign_id = $2 AND customer_id IN (${ids})
    `, [status, campaignId]);
  },

  async generateAttributedOrders(campaignId: string, customers: any[]) {
    if (customers.length === 0) return;
    const client = await pool.connect();
    try {
      const inserts = customers.map(c => {
        const amount = Math.floor(Math.random() * 150) + 30; // $30 - $180
        const items = JSON.stringify([{ name: `Campaign Promo Item`, price: amount }]);
        return `('${c.id}', '${items}', ${amount}, 'Promo', CURRENT_TIMESTAMP, '${campaignId}')`;
      });
      await client.query(`
        INSERT INTO orders (customer_id, items, amount, category, ordered_at, campaign_id)
        VALUES ${inserts.join(', ')}
      `);
    } finally {
      client.release();
    }
  }
};
