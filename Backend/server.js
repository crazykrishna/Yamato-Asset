const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./database servers/krishna');
const assets = require('./database servers/assets');
const employee = require('./database servers/employee');
const registeredAssets = require('./database servers/registerassets');

const app = express();
const port = process.env.PORT || process.env.port || 5000;


app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!');
});




// Database servers linkings ----->

app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Login');
        res.json(rows);
    } catch (error) {
        console.error('Database GET error:', error);
        res.status(500).json({ message: 'Database error occurred', error: error.message });
    }
});

app.post('/api/users', async (req, res) => {
    const { username, password } = req.body; 
    if ( !username || !password) {
        return res.status(400).json({ message: 'username, and password are required.' });
    }
    try {
        const [result] = await db.query('INSERT INTO Login (Username, Password) VALUES (?, ?)', [username, password]);
        res.json({ message: 'User added successfully!', userId: username});
    } catch (error) {
        console.error('Database POST error:', error);
        res.status(500).json({ message: 'Database error occurred', error: error.message });
    }
});

app.get('/api/assets', async (req,res) => {

    try {
        const [a] = await assets.query('Select * from currentassets');
        res.json(a);
    }
    catch (error){
        console.error('Database Get error', error);
        res.status(500).json({ message: 'Database error occurred', error: error.message});
    }
});

app.get('/api/employee', async (req,res) => {

    try {
        const [a] = await employee.query('Select * from yamatoEmployee');
        res.json(a);
    }
    catch (error){
        console.error('Database Get error', error);
        res.status(500).json({ message: 'Database error occurred', error: error.message});
    }
});

app.get('/api/regAssets', async (req,res) => {

    try {
        const [a] = await registeredAssets.query('Select * from totalAssets');
        res.json(a);
    }
    catch (error){
        console.error('Database Get error', error);
        res.status(500).json({ message: 'Database error occurred', error: error.message});
    }
});

app.get('/api/assigned-assets', async (req,res) => {
    try {
        const query = `select
        a.assetId,
        a.name as asset_name,
        a.asset_type,
        a.status,
        DATE_FORMAT(a.purchase_date, '%d-%m-%y') as purchase_date,
        e.name as employee_name,
        e.email,
        e.mob_number as phone_number,
        a.remarks
        from totalassets a 
        left join employee.yamatoemployee e on a.assigned_to = e.name`;

        const [rows] = await registeredAssets.query(query);
        res.json(rows);

    } catch (error) {
        console.error('Error fetching assigned assets:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

//  Authentication Logic ----------->
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Please enter both username and password' });
    }

    try {
        const query = 'SELECT * FROM Login WHERE Username = ?';
        const [rows] = await db.query(query, [username]);

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }

        const user = rows[0];

        if (user.Password !== password) {
            return res.status(401).json({ success: false, message: 'Invalid Username or password' });
        }

        res.status(200).json({
            success: true,
            message: 'Login successful!',
            user: {
                id: user.id,
                username: user.Username
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'An internal server error occurred' });
    }
});



app.post('/api/assets', async (req, res) => {
    const { name, serialNo, purchase_date, asset_type, status, Remarks } = req.body;

    // Validate that required fields aren't blank
    if (!name || !serialNo || !purchase_date || !asset_type || !status) {
        return res.status(400).json({ message: 'Missing required configuration fields.' });
    }

    try {
        // Notice we omit id and assetId entirely because MySQL generates them automatically!
        const query = `
            INSERT INTO Assets (name, serialNo, purchase_date, asset_type, status, Remarks) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        const [result] = await db.query(query, [name, serialNo, purchase_date, asset_type, status, Remarks || '']);
        
        res.status(201).json({ 
            success: true, 
            message: 'Asset successfully written to database.',
            insertId: result.insertId // Sends back the raw auto-increment numerical index row reference
        });
    } catch (error) {
        console.error('Database INSERT error:', error);
        res.status(500).json({ message: 'Database query processing error encountered.', error: error.message });
    }
});



app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});