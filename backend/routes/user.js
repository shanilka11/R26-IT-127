const express = require('express')
var router = express.Router()
const nodemailer = require("nodemailer")
var md5 = require('md5')
const jwt = require('jsonwebtoken');
const CryptoJS = require("crypto-js");
const path = require('path');
require('dotenv').config();
const mysqldump = require('mysqldump');
const fs = require('fs');

const { db } = require('../db')

router.get('/getUserData', (req, res) => {
    let sql = "Select id,fname,lname,phone,email From users where id=" + req.query.user_id
    db.query(sql, (err, results) => {
        if (!err) {
            res.send(results)
        } else {
            console.log(JSON.stringify(err, undefined, 2))
        }
    })
})

router.get('/getUser', (req, res) => {
    let sql = "Select id,fname,lname,phone,email,active From users"
    db.query(sql, (err, results) => {
        if (!err) {
            res.send(results)
        } else {
            console.log(JSON.stringify(err, undefined, 2))
        }
    })
})

router.post('/Register', (req, res) => {
    let sql = "Select * From users where email=?";
    let values = [
        req.body.email
    ]
    db.query(sql, values, (err, results) => {
        if (!err) {
            if (results.length == 0) {
                let sql = "insert into users(fname,lname,phone,email,password,active) values ?";
                var newRecord

                if (req.body.role == 'user') {
                    newRecord = [[
                        req.body.fname,
                        req.body.lname,
                        req.body.phone,
                        req.body.email,
                        CryptoJS.AES.encrypt(
                            req.body.password,
                            md5("app_key")
                        ).toString(),
                        true
                    ]]
                } else {
                    newRecord = [[
                        req.body.fname,
                        req.body.lname,
                        req.body.phone,
                        req.body.email,
                        CryptoJS.AES.encrypt(
                            req.body.password,
                            md5("app_key")
                        ).toString(),
                        false
                    ]]
                }

                db.query(sql, [newRecord], (err, results) => {
                    if (!err) {
                        res.send(JSON.stringify({ "success": "success" }))
                    } else {
                        console.log(JSON.stringify(err, undefined, 2))
                        res.send(JSON.stringify({ "err": err.sqlMessage }))
                    }
                })
            } else {
                if (results[0].email == req.body.email) {
                    res.send(JSON.stringify({ "err": "email_error" }))
                } else {
                    res.send(JSON.stringify({ "err": "nic_error" }))
                }
            }
        } else {
            res.send(JSON.stringify({ "err": "connection" }))
        }
    })
})

router.get('/login', (req, res) => {
    let sql = "Select * From users where email=?";
    let values = [
        req.query.email
    ]
    console.log(req.query.email)
    db.query(sql, values, (err, results) => {
        if (!err) {
            if (results[0] != null) {
                const hashed_Password = CryptoJS.AES.decrypt(
                    results[0]['password'],
                    md5("app_key")
                );
                const original_Password = hashed_Password.toString(CryptoJS.enc.Utf8);
                if (req.query.password == original_Password) {
                    if (results[0]['active'] != false) {
                        res.send(JSON.stringify({ "id": results[0]['id'], "fname": results[0]['fname'], "lname": results[0]['lname'], "email": results[0]['email'], "active": results[0]['active'] }))
                    } else {
                        res.send(JSON.stringify({ "err": "user_active" }))
                    }
                } else {
                    res.send(JSON.stringify({ "err": "user_password" }))
                }
            } else {
                res.send(JSON.stringify({ "err": "user_email" }))
            }
        } else {
            res.send(JSON.stringify({ "err": "connection" }))
        }
    })
})

router.put('/:id', (req, res) => {
    if (req.admin) {
        if (!req.params.id) {
            return res.status(400).send(req.params.id)
        }

        let sql = "Update users SET active=? where id=?";

        let record = [
            req.body.active,
            req.params.id
        ]

        db.query(sql, record, (err, results) => {
            if (!err) {
                res.send(results)
            } else {
                console.log(JSON.stringify(err, undefined, 2))
            }
        })
    } else {
        res.status(403).send(JSON.stringify({ "err": "only admin" }));
    }
})

router.delete('/:id', (req, res) => {
    if (req.admin) {
        if (!req.params.id) {
            return res.status(400).send(req.params.id)
        }

        let sql = "Delete FROM users where id=?";

        let record = [
            true,
            false,
            req.params.id
        ]

        db.query(sql, record, (err, results) => {
            if (!err) {
                res.send(results)
            } else {
                console.log(JSON.stringify(err, undefined, 2))
            }
        })
    } else {
        res.status(403).send(JSON.stringify({ "err": "only admin" }));
    }
})

router.put('/accountDataChange', (req, res) => {
    if (req.userId == req.body.userId) {

        let sql = "Select * From users where email=?";
        let values = [
            req.body.email
        ]
        db.query(sql, values, (err, results) => {
            if (!err) {
                console.log(results.length)
                if (results[0] == null || (results[0].id == req.body.userId && results.length * 1 == 1)) {
                    let sql = "Update users SET fname=?,lname=?,email=? where id=?";

                    let record = [
                        req.body.fname,
                        req.body.lname,
                        req.body.email,
                        req.body.userId
                    ]
                    db.query(sql, record, (err, results) => {
                        if (!err) {
                            res.send(JSON.stringify({ "success": "success" }))
                        } else {
                            console.log(JSON.stringify(err, undefined, 2))
                        }
                    })
                } else {
                    res.send(JSON.stringify({ "err": "email_error" }))
                }
            } else {
                res.send(JSON.stringify({ "err": "connection" }))
            }
        })
    } else {
        res.status(403).send(JSON.stringify({ "err": "only login user can be view,edit or delete data" }))
    }
})

router.put('/changePassword', (req, res) => {
    if (req.userId == req.body.userId) {

        let sql = "Select * From users where id=?";
        let values = [
            req.body.userId
        ]
        db.query(sql, values, (err, results) => {
            if (!err) {
                const hashed_Password = CryptoJS.AES.decrypt(
                    results[0]['password'],
                    md5("app_key")
                );
                const original_Password = hashed_Password.toString(CryptoJS.enc.Utf8);
                if (original_Password == req.body.currentPassword) {

                    let sql = "Update users SET password=? where id=?";

                    let record = [
                        CryptoJS.AES.encrypt(
                            req.body.password,
                            md5("app_key")
                        ).toString(),
                        req.body.userId
                    ]
                    db.query(sql, record, (err, results) => {
                        if (!err) {
                            res.send(JSON.stringify({ "success": "success" }))
                        } else {
                            console.log(JSON.stringify(err, undefined, 2))
                        }
                    })
                } else {
                    res.send(JSON.stringify({ "err": "Current Password Is Incorrect" }))
                }
            } else {
                res.send(JSON.stringify({ "err": "connection" }))
            }
        })
    } else {
        res.status(403).send(JSON.stringify({ "err": "only login user can be view,edit or delete data" }))
    }
})

module.exports = router