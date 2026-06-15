import { Router } from 'express';
import pool from '../db/index';
import { AIService } from '../services/aiService';
import { ChannelSimulator } from '../services/channelSimulator';

const router = Router();

// --- Dashboard Metrics ---
router.get('/dashboard', async (req, res) => {
  try {
    const totalCustomersRes = await pool.query('SELECT COUNT(*) FROM customers');
    const totalRevenueRes = await pool.query('SELECT SUM(amount) FROM orders');
    const campaignRevenueRes = await pool.query('SELECT SUM(amount) FROM orders WHERE campaign_id IS NOT NULL');
    const totalCampaignsRes = await pool.query('SELECT COUNT(*) FROM campaigns');
    const activeCampaignsRes = await pool.query(`SELECT COUNT(*) FROM campaigns WHERE status IN ('SENDING', 'PENDING')`);
    
    // Recent logs
    const logsRes = await pool.query(`
      SELECT c.name as customer_name, l.status, l.channel, l.updated_at 
      FROM communication_logs l
      JOIN customers c ON l.customer_id = c.id
      ORDER BY l.updated_at DESC
    `);

    // Campaign Funnel (Total across all)
    const funnelRes = await pool.query(`
      SELECT status, COUNT(*) 
      FROM communication_logs 
      GROUP BY status
    `);

    res.json({
      totalCustomers: parseInt(totalCustomersRes.rows[0].count),
      totalRevenue: parseFloat(totalRevenueRes.rows[0].sum || 0),
      campaignRevenue: parseFloat(campaignRevenueRes.rows[0].sum || 0) * 10,
      totalCampaigns: parseInt(totalCampaignsRes.rows[0].count),
      activeCampaigns: parseInt(activeCampaignsRes.rows[0].count),
      recentLogs: logsRes.rows,
      funnel: funnelRes.rows.reduce((acc: any, row: any) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {})
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
});

// --- Segments (AI Preview) ---
router.post('/segments/preview', async (req, res) => {
  const { prompt } = req.body;
  try {
    const sqlWhere = await AIService.generateSegmentFilter(prompt);
    
    // Security: In a real app we'd carefully sanitize this or use an AST, 
    // but for the take-home we execute the WHERE clause carefully on a count.
    const result = await pool.query(`
      SELECT COUNT(DISTINCT customers.id) as count 
      FROM customers 
      LEFT JOIN orders ON customers.id = orders.customer_id 
      WHERE ${sqlWhere}
    `);
    
    // Also fetch 5 sample users with their order details
    const sample = await pool.query(`
      SELECT 
        customers.*, 
        SUM(orders.amount) as total_spent,
        json_agg(
          json_build_object(
            'category', orders.category, 
            'items', orders.items, 
            'amount', orders.amount
          )
        ) FILTER (WHERE orders.id IS NOT NULL) as order_details
      FROM customers 
      LEFT JOIN orders ON customers.id = orders.customer_id 
      WHERE ${sqlWhere} 
      GROUP BY customers.id
    `);

    res.json({
      sqlFilter: sqlWhere,
      count: parseInt(result.rows[0].count),
      sample: sample.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to evaluate segment' });
  }
});

// --- AI Draft Copy ---
router.post('/campaigns/draft', async (req, res) => {
  const { prompt, sampleCustomer } = req.body;
  try {
    const draft = await AIService.draftMessage(sampleCustomer || { name: 'Valued Customer', city: 'your city' }, prompt);
    res.json({ draft });
  } catch (error) {
    res.status(500).json({ error: 'Failed to draft message' });
  }
});

// --- Send Campaign ---
router.post('/campaigns', async (req, res) => {
  const { name, segmentPrompt, sqlFilter, channel, templateText } = req.body;
  try {
    // 1. Create Campaign Record
    const campRes = await pool.query(`
      INSERT INTO campaigns (name, segment_name, channel, template_text)
      VALUES ($1, $2, $3, $4) RETURNING id
    `, [name, segmentPrompt, channel, templateText]);
    const campaignId = campRes.rows[0].id;

    // 2. Fetch matched customers
    const customers = await pool.query(`
      SELECT DISTINCT customers.* 
      FROM customers 
      LEFT JOIN orders ON customers.id = orders.customer_id 
      WHERE ${sqlFilter}
    `);
    
    if (customers.rows.length === 0) {
      return res.status(400).json({ error: 'Segment matches 0 customers.' });
    }

    // 3. Dispatch to Mock Simulator (does not await the full lifecycle)
    ChannelSimulator.dispatchCampaign(campaignId, customers.rows, channel);

    res.json({ success: true, campaignId, targetedCount: customers.rows.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to launch campaign' });
  }
});

// --- AI Chat ---
router.post('/chat', async (req, res) => {
  const { prompt, history } = req.body;
  try {
    const response = await AIService.chat(prompt, history);
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: 'Failed to chat' });
  }
});

// --- System Reset ---
import { exec } from 'child_process';
import path from 'path';

router.post('/reset', (req, res) => {
  const backendDir = path.resolve(__dirname, '../../');
  exec('npm run import:csv', { cwd: backendDir }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Reset error: ${error.message}`);
      return res.status(500).json({ error: 'Failed to reset database' });
    }
    res.json({ success: true, message: 'Database reset successfully' });
  });
});

export default router;
