// server.js
const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const path = require('path');
const ExcelJS = require('exceljs');

const app = express();
const port = process.env.PORT || 3000;

// Set up database connection
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'harc_db',
    password: 'your_password',  // Replace with your actual password
    port: 5432,
});

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Home page route
app.get('/', (req, res) => {
    res.render('index');
});

// Calculate resources route
app.post('/calculate', async (req, res) => {
    const { 
        distance, 
        duration, 
        carCount, 
        truckCount, 
        humveeCount, 
        cargoCount,
        disaster 
    } = req.body;
    
    // Convert to integers
    const distanceInt = parseInt(distance) || 0;
    const durationInt = parseInt(duration) || 0;
    const carCountInt = parseInt(carCount) || 0;
    const truckCountInt = parseInt(truckCount) || 0;
    const humveeCountInt = parseInt(humveeCount) || 0;
    const cargoCountInt = parseInt(cargoCount) || 0;
    
    // Basic validation
    if (distanceInt <= 0 || durationInt <= 0) {
        return res.render('error', { message: 'Distance and duration must be greater than zero.' });
    }
    
    if (carCountInt + truckCountInt + humveeCountInt + cargoCountInt <= 0) {
        return res.render('error', { message: 'Please select at least one vehicle.' });
    }
    
    try {
        // Run the SQL function
        const result = await pool.query(
            'SELECT * FROM calculate_fuel_consumption($1, $2, $3, $4, $5)',
            [carCountInt, truckCountInt, humveeCountInt, cargoCountInt, distanceInt]
        );
        
        // Apply duration factor and calculate costs
        const fuelPrice = 4.50; // Price per gallon
        const vehicleData = result.rows.map(row => {
            return {
                ...row,
                fuel_consumed: (parseFloat(row.fuel_consumed) * durationInt).toFixed(2),
                cost: (parseFloat(row.fuel_consumed) * durationInt * fuelPrice).toFixed(2)
            };
        });
        
        // Calculate totals
        const totalVehicles = vehicleData.reduce((sum, item) => sum + parseInt(item.quantity), 0);
        const totalFuel = vehicleData.reduce((sum, item) => sum + parseFloat(item.fuel_consumed), 0);
        const totalCost = vehicleData.reduce((sum, item) => sum + parseFloat(item.cost), 0);
        
        // Determine maintenance schedule
        let maintenance = "Every 7 days";
        if (vehicleData.some(v => v.vehicle_type === 'Humvee' && v.quantity > 3) || 
            vehicleData.some(v => v.vehicle_type === 'Cargo truck' && v.quantity > 2)) {
            maintenance = "Every 3 days";
        } else if (vehicleData.some(v => v.vehicle_type === 'Truck' && v.quantity > 5)) {
            maintenance = "Every 5 days";
        }
        
        // Create query string for export link
        const queryParams = new URLSearchParams({
            distance: distanceInt,
            duration: durationInt,
            carCount: carCountInt,
            truckCount: truckCountInt,
            humveeCount: humveeCountInt,
            cargoCount: cargoCountInt,
            disaster
        }).toString();
        
        // Render results page
        res.render('results', { 
            vehicleData,
            summary: {
                totalVehicles,
                totalFuel: totalFuel.toFixed(2),
                totalCost: totalCost.toFixed(2),
                maintenance
            },
            queryParams
        });
    } catch (error) {
        console.error('Database error:', error);
        res.render('error', { message: 'An error occurred while calculating resources.' });
    }
});

// Excel export route
app.get('/export', async (req, res) => {
    const { 
        distance, 
        duration, 
        carCount, 
        truckCount, 
        humveeCount, 
        cargoCount,
        disaster 
    } = req.query;
    
    // Convert to integers
    const distanceInt = parseInt(distance) || 0;
    const durationInt = parseInt(duration) || 0;
    const carCountInt = parseInt(carCount) || 0;
    const truckCountInt = parseInt(truckCount) || 0;
    const humveeCountInt = parseInt(humveeCount) || 0;
    const cargoCountInt = parseInt(cargoCount) || 0;
    
    // Basic validation
    if (distanceInt <= 0 || durationInt <= 0 || 
        (carCountInt + truckCountInt + humveeCountInt + cargoCountInt <= 0)) {
        return res.render('error', { message: 'Invalid export parameters.' });
    }
    
    try {
        // Run the SQL function
        const result = await pool.query(
            'SELECT * FROM calculate_fuel_consumption($1, $2, $3, $4, $5)',
            [carCountInt, truckCountInt, humveeCountInt, cargoCountInt, distanceInt]
        );
        
        // Apply duration factor and calculate costs
        const fuelPrice = 4.50; // Price per gallon
        const vehicleData = result.rows.map(row => {
            return {
                ...row,
                fuel_consumed: parseFloat(row.fuel_consumed) * durationInt,
                cost: parseFloat(row.fuel_consumed) * durationInt * fuelPrice
            };
        });
        
        // Calculate totals
        const totalVehicles = vehicleData.reduce((sum, item) => sum + parseInt(item.quantity), 0);
        const totalFuel = vehicleData.reduce((sum, item) => sum + parseFloat(item.fuel_consumed), 0);
        const totalCost = vehicleData.reduce((sum, item) => sum + parseFloat(item.cost), 0); 
    }
    finally {console.log("doodoofart"); }
});
