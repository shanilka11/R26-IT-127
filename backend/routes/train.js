const express = require('express')
var router = express.Router()
require('dotenv').config();

const { db } = require('../db')

router.get('/actual_demand', (req, res) => {
    console.log(req.query)
    let sql = "Select 1c,2c,3c From train where origin='" + req.query.origin + "' and destination='" + req.query.destination + "' and train_type='" + req.query.train_type + "' and date='" + req.query.date + "'"
    db.query(sql, (err, results) => {
        if (!err) {
            res.send({ success: true, ...results[0] })
        } else {
            console.log(JSON.stringify(err, undefined, 2))
        }
    })
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