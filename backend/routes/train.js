const express = require('express')
var router = express.Router()
require('dotenv').config();

const { db } = require('../db')

router.get('/actual_demand', (req, res) => {
    const { origin, destination, train_type, date } = req.query;
    if (!origin || !destination || !train_type || !date) {
        return res.status(400).send({ success: false, error: 'Missing required actual-demand query parameters.' });
    }

    const sql = 'SELECT `1c`, `2c`, `3c` FROM train WHERE origin = ? AND destination = ? AND train_type = ? AND date = ?';
    db.query(sql, [origin, destination, train_type, date], (err, results) => {
        if (err) {
            console.error('Actual-demand query failed:', err);
            return res.status(500).send({ success: false, error: 'Actual demand could not be loaded.' });
        }
        if (!results || results.length === 0) {
            return res.send({ success: true, available: false });
        }
        return res.send({ success: true, available: true, ...results[0] });
    });
})

router.post('/train_data', (req, res) => {
    const { origin, destination, train_type, date, class1, class2, class3 } = req.body;

    if (!origin || !destination || !train_type || !date) {
        return res.status(400).send({ success: false, error: "Missing required fields" });
    }

    // Check for duplicate: same origin + destination + train_type + date
    const checkSql = "SELECT id FROM train WHERE origin = ? AND destination = ? AND train_type = ? AND date = ?";
    const checkParams = [origin, destination, train_type, date];

    db.query(checkSql, checkParams, (checkErr, checkResults) => {
        if (checkErr) {
            console.log(JSON.stringify(checkErr, undefined, 2));
            return res.status(500).send({ success: false, error: "Database query failed" });
        }

        // If a record already exists for this train + date combination, reject
        if (checkResults && checkResults.length > 0) {
            return res.status(409).send({ success: false, error: "Actual demand has already been recorded for this train and date." });
        }

        // No duplicate found, proceed with insert
        const sql = "INSERT INTO train (origin, destination, train_type, date, `1c`, `2c`, `3c`) VALUES (?, ?, ?, ?, ?, ?, ?)";
        const params = [origin, destination, train_type, date, class1 || 0, class2 || 0, class3 || 0];

        db.query(sql, params, (err, result) => {
            if (err) {
                console.log(JSON.stringify(err, undefined, 2));
                return res.status(500).send({ success: false, error: "Insert failed" });
            }
            res.send({ success: true, insertId: result.insertId });
        });
    });
})


module.exports = router