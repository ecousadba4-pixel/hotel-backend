const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Подключение к Neon PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Проверка работы сервера
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 Hotel Guests API работает!',
    status: 'OK',
    database: 'Neon PostgreSQL'
  });
});

// Проверка здоровья базы данных
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: '✅ OK', 
      database: 'Connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: '❌ Error', 
      database: 'Disconnected',
      error: error.message 
    });
  }
});

// Добавление гостя
app.post('/api/guests', async (req, res) => {
  try {
    const {
      guest_phone,
      last_name,
      first_name,
      checkin_date,
      loyalty_level,
      shelter_booking_id,
      total_amount,
      bonus_spent
    } = req.body;

    // Валидация обязательных полей
    if (!guest_phone || !last_name || !first_name) {
      return res.status(400).json({
        success: false,
        message: 'Обязательные поля: номер телефона, фамилия и имя'
      });
    }

    const query = `
      INSERT INTO guests 
      (guest_phone, last_name, first_name, checkin_date, loyalty_level, shelter_booking_id, total_amount, bonus_spent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      guest_phone.replace(/\D/g, '').slice(-10), // Оставляем 10 цифр
      last_name,
      first_name,
      checkin_date,
      loyalty_level,
      shelter_booking_id,
      parseFloat(total_amount) || 0,
      parseInt(bonus_spent) || 0
    ];

    const result = await pool.query(query, values);
    
    res.json({
      success: true,
      message: '✅ Данные гостя успешно добавлены в базу!',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Ошибка при добавлении гостя:', error);
    res.status(500).json({
      success: false,
      message: '❌ Ошибка при добавлении гостя',
      error: error.message
    });
  }
});

// Поиск гостя по номеру телефона
app.get('/api/guests/search', async (req, res) => {
  try {
    const { phone } = req.query;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Не указан номер телефона для поиска'
      });
    }

    const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
    const result = await pool.query(
      'SELECT * FROM guests WHERE guest_phone = $1 ORDER BY created_at DESC LIMIT 1',
      [normalizedPhone]
    );

    res.json({
      success: true,
      data: result.rows[0] || null
    });

  } catch (error) {
    console.error('Ошибка при поиске гостя:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при поиске гостя',
      error: error.message
    });
  }
});

// Получение всех гостей (для админки)
app.get('/api/guests', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM guests ORDER BY created_at DESC LIMIT 100');
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Ошибка при получении гостей:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении списка гостей',
      error: error.message
    });
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});