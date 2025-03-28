export const sampleQueries = [
  {
    name: "Revenue Analysis",
    description: "Analyze monthly revenue trends",
    query: `SELECT 
  DATE_FORMAT(order_date, '%Y-%m') as month,
  COUNT(*) as total_orders,
  SUM(amount) as revenue,
  AVG(amount) as avg_order_value,
  COUNT(DISTINCT customer_id) as unique_customers
FROM 
  orders
WHERE 
  order_date >= DATE_SUB(CURRENT_DATE, INTERVAL 12 MONTH)
GROUP BY 
  DATE_FORMAT(order_date, '%Y-%m')
ORDER BY 
  month DESC;`,
    results: {
      columns: ["month", "total_orders", "revenue", "avg_order_value", "unique_customers"],
      data: Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        return {
          month: date.toISOString().slice(0, 7),
          total_orders: Math.floor(Math.random() * 1000) + 500,
          revenue: Math.floor(Math.random() * 500000) + 100000,
          avg_order_value: Math.floor(Math.random() * 200) + 100,
          unique_customers: Math.floor(Math.random() * 500) + 200
        };
      })
    }
  },
  {
    name: "Customer Cohort Analysis",
    description: "Track customer retention by cohort",
    query: `WITH first_purchases AS (
  SELECT 
    customer_id,
    DATE_FORMAT(MIN(order_date), '%Y-%m') as cohort_month
  FROM orders
  GROUP BY customer_id
)
SELECT 
  fp.cohort_month,
  COUNT(DISTINCT fp.customer_id) as cohort_size,
  COUNT(DISTINCT o.customer_id) as retained_customers,
  ROUND(COUNT(DISTINCT o.customer_id) / COUNT(DISTINCT fp.customer_id) * 100, 2) as retention_rate
FROM 
  first_purchases fp
  LEFT JOIN orders o ON fp.customer_id = o.customer_id
  AND DATE_FORMAT(o.order_date, '%Y-%m') = fp.cohort_month
GROUP BY 
  fp.cohort_month
ORDER BY 
  fp.cohort_month DESC;`,
    results: {
      columns: ["cohort_month", "cohort_size", "retained_customers", "retention_rate"],
      data: Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const cohortSize = Math.floor(Math.random() * 500) + 200;
        const retainedCustomers = Math.floor(cohortSize * (Math.random() * 0.4 + 0.5));
        return {
          cohort_month: date.toISOString().slice(0, 7),
          cohort_size: cohortSize,
          retained_customers: retainedCustomers,
          retention_rate: ((retainedCustomers / cohortSize) * 100).toFixed(2)
        };
      })
    }
  },
  {
    name: "Product Performance",
    description: "Analyze top-selling products",
    query: `SELECT 
  p.product_name,
  p.category,
  COUNT(*) as total_sales,
  SUM(oi.quantity) as units_sold,
  SUM(oi.quantity * oi.unit_price) as revenue,
  AVG(r.rating) as avg_rating,
  COUNT(r.review_text) as review_count
FROM 
  products p
  JOIN order_items oi ON p.product_id = oi.product_id
  LEFT JOIN reviews r ON p.product_id = r.product_id
GROUP BY 
  p.product_id, p.product_name, p.category
HAVING 
  units_sold > 100
ORDER BY 
  revenue DESC
LIMIT 50;`,
    results: {
      columns: ["product_name", "category", "total_sales", "units_sold", "revenue", "avg_rating", "review_count"],
      data: Array.from({ length: 50 }, (_, i) => ({
        product_name: `Product ${i + 1}`,
        category: ["Electronics", "Clothing", "Home & Garden", "Books"][Math.floor(Math.random() * 4)],
        total_sales: Math.floor(Math.random() * 1000) + 200,
        units_sold: Math.floor(Math.random() * 2000) + 500,
        revenue: Math.floor(Math.random() * 100000) + 10000,
        avg_rating: (Math.random() * 2 + 3).toFixed(1),
        review_count: Math.floor(Math.random() * 500) + 50
      }))
    }
  },
  {
    name: "Customer Segmentation",
    description: "Segment customers by purchase behavior",
    query: `WITH customer_metrics AS (
  SELECT 
    c.customer_id,
    c.customer_name,
    COUNT(o.order_id) as total_orders,
    SUM(o.amount) as total_spent,
    AVG(o.amount) as avg_order_value,
    DATEDIFF(CURRENT_DATE, MAX(o.order_date)) as days_since_last_order,
    DATEDIFF(CURRENT_DATE, MIN(o.order_date)) as customer_age_days
  FROM 
    customers c
    JOIN orders o ON c.customer_id = o.customer_id
  GROUP BY 
    c.customer_id, c.customer_name
)
SELECT 
  customer_name,
  total_orders,
  total_spent,
  avg_order_value,
  days_since_last_order,
  CASE 
    WHEN total_spent > 5000 AND days_since_last_order < 90 THEN 'VIP'
    WHEN total_spent > 2000 OR (total_orders > 10 AND days_since_last_order < 180) THEN 'Regular'
    WHEN days_since_last_order > 365 THEN 'Churned'
    ELSE 'Standard'
  END as customer_segment
FROM 
  customer_metrics
ORDER BY 
  total_spent DESC;`,
    results: {
      columns: ["customer_name", "total_orders", "total_spent", "avg_order_value", "days_since_last_order", "customer_segment"],
      data: Array.from({ length: 100 }, (_, i) => {
        const totalOrders = Math.floor(Math.random() * 30) + 1;
        const avgOrderValue = Math.floor(Math.random() * 300) + 50;
        const totalSpent = totalOrders * avgOrderValue;
        const daysSinceLastOrder = Math.floor(Math.random() * 500);
        let segment;
        if (totalSpent > 5000 && daysSinceLastOrder < 90) segment = 'VIP';
        else if (totalSpent > 2000 || (totalOrders > 10 && daysSinceLastOrder < 180)) segment = 'Regular';
        else if (daysSinceLastOrder > 365) segment = 'Churned';
        else segment = 'Standard';
        
        return {
          customer_name: `Customer ${i + 1}`,
          total_orders: totalOrders,
          total_spent: totalSpent,
          avg_order_value: avgOrderValue,
          days_since_last_order: daysSinceLastOrder,
          customer_segment: segment
        };
      })
    }
  }
];