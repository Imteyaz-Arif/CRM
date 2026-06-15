import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import pool from './index';

const csvFilePath = path.resolve(__dirname, '../../Database.csv');

interface CsvRow {
  customer_id: string;
  order_id: string;
  name: string;
  age: string;
  gender: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  order_date: string;
  persona: string;
  order_category: string;
  order_amount: string;
  order_items: string;
  lifetime_value: string;
}

const extractCountryCode = (phone: string) => {
  const match = phone.match(/^(\+\d{1,3})/);
  return match ? match[1] : '+1';
};

const cleanAmount = (amountStr: string) => {
  return parseFloat(amountStr.replace(/[^0-9.-]+/g, "")) || 0;
};

const parseOrderItems = (itemsStr: string) => {
  if (!itemsStr) return [];
  // itemsStr looks like "Hoodie (₹2400.00), Leather Belt (₹1200.00)"
  const parts = itemsStr.split(',').map(s => s.trim());
  return parts.map(p => {
    const match = p.match(/(.*?)\s*\((.*?)\)/);
    if (match) {
      return { name: match[1].trim(), price: match[2].trim() };
    }
    return { name: p, price: 0 };
  });
};

export const importCsv = async () => {
  console.log(`Starting CSV import from ${csvFilePath}`);
  const client = await pool.connect();
  
  try {
    await client.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender VARCHAR(20)');
    await client.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS age INT');
    await client.query('ALTER TABLE orders ALTER COLUMN category DROP NOT NULL');
    await client.query('DELETE FROM communication_logs');
    await client.query('DELETE FROM campaigns');
    await client.query('DELETE FROM orders');
    await client.query('DELETE FROM customers');
    console.log('Cleared existing database records.');

    const results: CsvRow[] = [];

    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(true))
        .on('error', (err) => reject(err));
    });

    console.log(`Parsed ${results.length} rows from CSV.`);

    // Group by customer
    const customersMap = new Map<string, any>();
    const ordersList: any[] = [];

    const parseDate = (dateStr: string) => {
      if (!dateStr) return null;
      // Handle DD-MM-YYYY format from Excel
      if (dateStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
        const parts = dateStr.split('-');
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).toISOString();
      }
      return new Date(dateStr).toISOString();
    };

    const countryCodeMap: Record<string, string> = {
      'India': '+91',
      'USA': '+1',
      'UK': '+44',
      'Germany': '+49',
      'France': '+33',
      'Australia': '+61',
      'Canada': '+1',
      'UAE': '+971'
    };

    for (const row of results) {
      if (!customersMap.has(row.customer_id)) {
        let phone = String(row.phone);
        // If Excel corrupted the phone number into scientific notation (e.g. 9.13491E+11)
        if (phone.includes('E+')) {
           const prefix = countryCodeMap[row.country] || '+91';
           phone = prefix + Math.floor(Math.random() * 9000000000 + 1000000000);
        }

        customersMap.set(row.customer_id, {
          name: row.name,
          age: parseInt(row.age, 10) || null,
          email: row.email,
          phone: phone,
          country_code: extractCountryCode(phone),
          country: row.country,
          city: row.city,
          gender: row.gender,
          persona: row.persona
        });
      }

      if (row.order_id && row.order_amount) {
        ordersList.push({
          customer_id: row.customer_id,
          order_id: row.order_id,
          category: row.order_category,
          amount: cleanAmount(row.order_amount),
          items: parseOrderItems(row.order_items),
          ordered_at: parseDate(row.order_date)
        });
      }
    }

    console.log(`Identified ${customersMap.size} unique customers and ${ordersList.length} orders.`);

    // Insert Customers
    const customerIdMapping = new Map<string, string>(); // csvId -> uuid
    
    // Batch insert customers
    const customerValues = Array.from(customersMap.entries());
    const batchSize = 100;
    
    for (let i = 0; i < customerValues.length; i += batchSize) {
      const batch = customerValues.slice(i, i + batchSize);
      
      const valuesString = batch.map((_, index) => {
        const offset = index * 9;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`;
      }).join(', ');
      
      const flatParams = batch.flatMap(([csvId, c]) => [
        c.name, c.age, c.email, c.phone, c.country_code, c.country, c.city, c.gender, c.persona
      ]);

      const res = await client.query(`
        INSERT INTO customers (name, age, email, phone, country_code, country, city, gender, persona)
        VALUES ${valuesString}
        RETURNING id, email;
      `, flatParams);

      // Map generated UUIDs back to the original csv_id using email
      for (const row of res.rows) {
        const originalEntry = batch.find(([_, c]) => c.email === row.email);
        if (originalEntry) {
          customerIdMapping.set(originalEntry[0], row.id);
        }
      }
    }
    console.log(`Inserted ${customerIdMapping.size} customers into PostgreSQL.`);

    // Insert Orders
    let insertedOrders = 0;
    for (let i = 0; i < ordersList.length; i += batchSize) {
      const batch = ordersList.slice(i, i + batchSize);
      
      const valuesString = batch.map((_, index) => {
        const offset = index * 5;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
      }).join(', ');

      const flatParams = batch.flatMap(o => [
        customerIdMapping.get(o.customer_id), 
        JSON.stringify(o.items), 
        o.amount, 
        o.category, 
        o.ordered_at
      ]);

      await client.query(`
        INSERT INTO orders (customer_id, items, amount, category, ordered_at)
        VALUES ${valuesString}
      `, flatParams);
      
      insertedOrders += batch.length;
    }
    
    console.log(`Inserted ${insertedOrders} orders into PostgreSQL.`);
    console.log('CSV Import completed successfully!');

  } catch (error) {
    console.error('Error importing CSV:', error);
  } finally {
    client.release();
  }
};

// Run if called directly
if (require.main === module) {
  importCsv().then(() => process.exit(0));
}
